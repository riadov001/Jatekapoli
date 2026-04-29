import { Router, type IRouter } from "express";
import { db, driversTable, ordersTable } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";
import { publish } from "../lib/sse";
import * as tracking from "../lib/trackingService";
import { requireAuth, type AuthedRequest } from "../middlewares/auth";
import {
  UpdateDriverBody,
  UpdateDriverParams,
  GetDriverParams,
  GetDriverEarningsParams,
  ListDriversQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/drivers", async (req, res): Promise<void> => {
  const queryParams = ListDriversQueryParams.safeParse(req.query);

  let conditions: any[] = [];

  if (queryParams.success && queryParams.data.isAvailable !== undefined) {
    conditions.push(eq(driversTable.isAvailable, queryParams.data.isAvailable));
  }

  const drivers = conditions.length > 0
    ? await db.select().from(driversTable).where(and(...conditions))
    : await db.select().from(driversTable);

  res.json(drivers);
});

router.get("/drivers/:id", async (req, res): Promise<void> => {
  const params = GetDriverParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [driver] = await db.select().from(driversTable).where(eq(driversTable.id, params.data.id)).limit(1);
  if (!driver) {
    res.status(404).json({ error: "Driver not found" });
    return;
  }

  res.json(driver);
});

router.patch("/drivers/:id", requireAuth, async (req: AuthedRequest, res): Promise<void> => {
  const params = UpdateDriverParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateDriverBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db.select().from(driversTable).where(eq(driversTable.id, params.data.id)).limit(1);
  if (!existing) { res.status(404).json({ error: "Driver not found" }); return; }
  if (req.userRole !== "admin" && existing.userId !== req.userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const [driver] = await db
    .update(driversTable)
    .set(parsed.data)
    .where(eq(driversTable.id, params.data.id))
    .returning();

  res.json(driver);
});

/**
 * Complete the driver's mandatory profile (vehicle plate + national ID).
 * Sets `profileCompletedAt`, which gates the ability to accept deliveries.
 */
router.post("/drivers/:id/complete-profile", requireAuth, async (req: any, res): Promise<void> => {
  const id = parseInt(req.params.id ?? "", 10);
  if (Number.isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [existing] = await db.select().from(driversTable).where(eq(driversTable.id, id)).limit(1);
  if (!existing) { res.status(404).json({ error: "Driver not found" }); return; }
  if (req.userRole !== "admin" && existing.userId !== req.userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const vehicleType = typeof req.body?.vehicleType === "string" ? req.body.vehicleType.trim() : null;
  const vehiclePlate = typeof req.body?.vehiclePlate === "string" ? req.body.vehiclePlate.trim() : null;
  const nationalId = typeof req.body?.nationalId === "string" ? req.body.nationalId.trim() : null;
  const licenseNumber = typeof req.body?.licenseNumber === "string" ? req.body.licenseNumber.trim() : null;
  const photoUrl = typeof req.body?.photoUrl === "string" ? req.body.photoUrl.trim() : null;

  if (!vehicleType) { res.status(400).json({ error: "vehicleType is required" }); return; }
  if (!vehiclePlate || vehiclePlate.length < 3) { res.status(400).json({ error: "vehiclePlate is required" }); return; }
  if (!nationalId || nationalId.length < 4) { res.status(400).json({ error: "nationalId is required" }); return; }

  const [updated] = await db
    .update(driversTable)
    .set({
      vehicleType,
      vehiclePlate,
      nationalId,
      licenseNumber: licenseNumber || null,
      photoUrl: photoUrl || null,
      profileCompletedAt: new Date(),
    })
    .where(eq(driversTable.id, id))
    .returning();

  res.json(updated);
});

router.patch("/drivers/:id/location", requireAuth, async (req: AuthedRequest, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid driver id" }); return; }

  const { latitude, longitude, destLat, destLng } = req.body ?? {};
  if (typeof latitude !== "number" || typeof longitude !== "number") {
    res.status(400).json({ error: "latitude and longitude (numbers) required" });
    return;
  }

  const [existingDriver] = await db.select().from(driversTable).where(eq(driversTable.id, id)).limit(1);
  if (!existingDriver) { res.status(404).json({ error: "Driver not found" }); return; }
  if (req.userRole !== "admin" && existingDriver.userId !== req.userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const now = new Date();
  const [driver] = await db
    .update(driversTable)
    .set({ latitude, longitude, locationUpdatedAt: now })
    .where(eq(driversTable.id, id))
    .returning();

  if (!driver) { res.status(404).json({ error: "Driver not found" }); return; }

  // All active orders this driver is currently delivering (picked_up OR en_route).
  // We fan out the location event so every interested party (customer, restaurant
  // owner, admin tracking dashboard, the driver's own client) receives it.
  const activeOrders = await db
    .select({ id: ordersTable.id })
    .from(ordersTable)
    .where(and(
      eq(ordersTable.driverId, id),
      inArray(ordersTable.status, ["picked_up", "en_route"]),
    ));

  // Refresh the in-memory live state — this also feeds the offline watchdog.
  for (const o of activeOrders) tracking.attachOrder(id, o.id);
  tracking.updateLocation(id, latitude, longitude);

  // Optional ETA — only computable when the client supplied destination coords.
  // We deliberately don't store delivery lat/lng in the orders table, so the
  // driver app passes them per-update from its routing/Maps SDK.
  const eta =
    typeof destLat === "number" && typeof destLng === "number"
      ? tracking.calculateETA(latitude, longitude, destLat, destLng)
      : null;

  const basePayload = {
    driverId: id,
    latitude,
    longitude,
    timestamp: now.getTime(),
    eta,
    isOnline: true,
  };

  // Per-order channels (customer + restaurant tracking)
  for (const o of activeOrders) {
    publish(`order:${o.id}`, "driver_location", { ...basePayload, orderId: o.id });
  }
  // Driver's own channel (their app's UI / debug)
  publish(`driver:${id}`, "driver_location", basePayload);
  // Global admin tracking dashboard — sees every delivery in flight.
  publish("admin_tracking", "driver_location", {
    ...basePayload,
    orderIds: activeOrders.map((o) => o.id),
  });

  res.json({
    latitude: driver.latitude,
    longitude: driver.longitude,
    locationUpdatedAt: driver.locationUpdatedAt,
    eta,
    activeOrderIds: activeOrders.map((o) => o.id),
  });
});

/**
 * Driver heartbeat ping — used when the driver app cannot send a fresh GPS
 * fix yet (e.g. waiting for first lock) but wants to stay online so the
 * watchdog doesn't flag them as offline.
 */
router.post("/drivers/:id/heartbeat", requireAuth, async (req: AuthedRequest, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid driver id" }); return; }

  const [driver] = await db.select().from(driversTable).where(eq(driversTable.id, id)).limit(1);
  if (!driver) { res.status(404).json({ error: "Driver not found" }); return; }
  if (req.userRole !== "admin" && driver.userId !== req.userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const state = tracking.recordHeartbeat(id);
  res.json({ ok: true, lastSeen: state.lastSeen });
});

router.get("/drivers/:id/location", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid driver id" }); return; }

  const [driver] = await db.select().from(driversTable).where(eq(driversTable.id, id)).limit(1);
  if (!driver) { res.status(404).json({ error: "Driver not found" }); return; }

  res.json({
    latitude: driver.latitude,
    longitude: driver.longitude,
    locationUpdatedAt: driver.locationUpdatedAt,
    isAvailable: driver.isAvailable,
    name: driver.name,
  });
});

router.get("/drivers/:id/earnings", requireAuth, async (req: AuthedRequest, res): Promise<void> => {
  const params = GetDriverEarningsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const driverId = params.data.id;
  const [driver] = await db.select().from(driversTable).where(eq(driversTable.id, driverId)).limit(1);

  if (!driver) {
    res.status(404).json({ error: "Driver not found" });
    return;
  }
  if (req.userRole !== "admin" && driver.userId !== req.userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const deliveredOrders = await db
    .select({ total: ordersTable.total, createdAt: ordersTable.createdAt })
    .from(ordersTable)
    .where(and(eq(ordersTable.driverId, driverId), eq(ordersTable.status, "delivered")));

  const driverCommission = 0.15; // 15% commission for driver

  let today = 0, thisWeek = 0, thisMonth = 0, completedToday = 0;

  for (const order of deliveredOrders) {
    const orderDate = new Date(order.createdAt);
    const earning = order.total * driverCommission;

    if (orderDate >= startOfDay) {
      today += earning;
      completedToday++;
    }
    if (orderDate >= startOfWeek) thisWeek += earning;
    if (orderDate >= startOfMonth) thisMonth += earning;
  }

  res.json({
    today: Math.round(today * 100) / 100,
    thisWeek: Math.round(thisWeek * 100) / 100,
    thisMonth: Math.round(thisMonth * 100) / 100,
    totalDeliveries: driver.totalDeliveries,
    completedToday,
  });
});

export default router;
