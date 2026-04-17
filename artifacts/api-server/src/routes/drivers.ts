import { Router, type IRouter } from "express";
import { db, driversTable, ordersTable } from "@workspace/db";
import { eq, and, sum, count } from "drizzle-orm";
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

router.patch("/drivers/:id", async (req, res): Promise<void> => {
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

  const [driver] = await db
    .update(driversTable)
    .set(parsed.data)
    .where(eq(driversTable.id, params.data.id))
    .returning();

  if (!driver) {
    res.status(404).json({ error: "Driver not found" });
    return;
  }

  res.json(driver);
});

router.get("/drivers/:id/earnings", async (req, res): Promise<void> => {
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
