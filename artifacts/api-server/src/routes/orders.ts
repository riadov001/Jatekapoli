import { Router, type IRouter } from "express";
import {
  db,
  ordersTable,
  orderItemsTable,
  menuItemsTable,
  restaurantsTable,
  usersTable,
  driversTable,
  driverEarningsTable,
  generateUniqueOrderReference,
  generateKitchenCode,
  generatePickupCode,
  promoCodesTable,
  promoCodeUsagesTable,
  referralsTable,
} from "@workspace/db";
import { eq, and, inArray, isNull } from "drizzle-orm";
import { requireAuth, attachAuth, type AuthedRequest } from "../middlewares/auth";
import {
  CreateOrderBody,
  GetOrderParams,
  UpdateOrderStatusParams,
  UpdateOrderStatusBody,
  ListOrdersQueryParams,
} from "@workspace/api-zod";
import { publish } from "../lib/sse";
import * as tracking from "../lib/trackingService";
import { pushNotification } from "./notifications";

const router: IRouter = Router();

async function getOrderWithItems(orderId: number) {
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);
  if (!order) return null;

  const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, orderId));
  return { ...order, items };
}

router.get("/orders/active", async (req, res): Promise<void> => {
  const activeStatuses = ["pending", "accepted", "preparing", "ready", "picked_up", "en_route"];
  const orders = await db.select().from(ordersTable).where(inArray(ordersTable.status, activeStatuses));

  const ordersWithItems = await Promise.all(
    orders.map(async (o) => {
      const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, o.id));
      return { ...o, items };
    })
  );

  res.json(ordersWithItems);
});

/** Orders that are "ready" — available for any driver to pick up */
router.get("/orders/available", async (req, res): Promise<void> => {
  const orders = await db
    .select()
    .from(ordersTable)
    .where(and(eq(ordersTable.status, "ready"), isNull(ordersTable.driverId)));

  const ordersWithItems = await Promise.all(
    orders.map(async (o) => {
      const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, o.id));
      return { ...o, items };
    })
  );

  res.json(ordersWithItems);
});

router.get("/orders", requireAuth, async (req: AuthedRequest, res): Promise<void> => {
  const queryParams = ListOrdersQueryParams.safeParse(req.query);

  let conditions: any[] = [];

  if (queryParams.success) {
    const { status, userId, restaurantId, driverId } = queryParams.data;
    if (status) conditions.push(eq(ordersTable.status, status));
    if (userId) conditions.push(eq(ordersTable.userId, userId));
    if (restaurantId) conditions.push(eq(ordersTable.restaurantId, restaurantId));
    if (driverId) conditions.push(eq(ordersTable.driverId, driverId));
  }

  // Customers may only see their own orders unless filtering as restaurant owner/driver.
  const role = req.userRole;
  const filtersRestaurantOrDriver =
    queryParams.success && (queryParams.data.restaurantId || queryParams.data.driverId);
  if (role === "customer" || (!filtersRestaurantOrDriver && role !== "admin")) {
    conditions.push(eq(ordersTable.userId, req.userId!));
  }

  const orders = conditions.length > 0
    ? await db.select().from(ordersTable).where(and(...conditions))
    : await db.select().from(ordersTable);

  const ordersWithItems = await Promise.all(
    orders.map(async (o) => {
      const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, o.id));
      return { ...o, items };
    })
  );

  res.json(ordersWithItems);
});

router.post("/orders", requireAuth, async (req: AuthedRequest, res): Promise<void> => {
  const parsed = CreateOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { restaurantId, deliveryAddress, notes, items } = parsed.data;
  const userId = req.userId!;
  const { promoCode, deliveryType, scheduledFor, isContactless } = req.body as {
    promoCode?: string;
    deliveryType?: string;
    scheduledFor?: string;
    isContactless?: boolean;
  };

  const [restaurant] = await db.select().from(restaurantsTable).where(eq(restaurantsTable.id, restaurantId)).limit(1);
  if (!restaurant) {
    res.status(404).json({ error: "Restaurant not found" });
    return;
  }

  if (!restaurant.isOpen) {
    res.status(400).json({ error: "Ce restaurant est actuellement fermé et n'accepte pas de commandes." });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);

  let subtotal = 0;
  const orderItemsData: { menuItemId: number; menuItemName: string; quantity: number; unitPrice: number; totalPrice: number }[] = [];

  for (const item of items) {
    const [menuItem] = await db.select().from(menuItemsTable).where(eq(menuItemsTable.id, item.menuItemId)).limit(1);
    if (!menuItem) {
      res.status(404).json({ error: `Menu item ${item.menuItemId} not found` });
      return;
    }
    const itemTotal = menuItem.price * item.quantity;
    subtotal += itemTotal;
    orderItemsData.push({
      menuItemId: menuItem.id,
      menuItemName: menuItem.name,
      quantity: item.quantity,
      unitPrice: menuItem.price,
      totalPrice: itemTotal,
    });
  }

  let deliveryFee = restaurant.deliveryFee || 0;
  let discountAmount = 0;
  let appliedPromoId: number | null = null;

  // Apply promo code if provided
  if (promoCode) {
    const [promo] = await db
      .select()
      .from(promoCodesTable)
      .where(eq(promoCodesTable.code, promoCode.toUpperCase().trim()))
      .limit(1);

    if (promo && promo.isActive && (!promo.expiresAt || new Date() <= promo.expiresAt)) {
      if (promo.type === "percentage") {
        discountAmount = Math.min(subtotal, (subtotal * promo.value) / 100);
      } else if (promo.type === "fixed") {
        discountAmount = Math.min(subtotal, promo.value);
      } else if (promo.type === "free_delivery") {
        discountAmount = deliveryFee;
        deliveryFee = 0;
      }
      discountAmount = Math.round(discountAmount * 100) / 100;
      appliedPromoId = promo.id;

      // Increment usage count
      await db.update(promoCodesTable)
        .set({ usedCount: promo.usedCount + 1 })
        .where(eq(promoCodesTable.id, promo.id));
    }
  }

  const total = Math.max(0, subtotal + deliveryFee - discountAmount);
  const reference = await generateUniqueOrderReference();

  const [order] = await db.insert(ordersTable).values({
    reference,
    userId,
    restaurantId,
    restaurantName: restaurant.name,
    userName: user?.name || "Customer",
    status: "pending",
    subtotal,
    deliveryFee,
    discountAmount,
    total,
    deliveryAddress,
    notes: notes ?? null,
    estimatedDeliveryTime: restaurant.deliveryTime || 30,
    kitchenCode: generateKitchenCode(),
    pickupCode: generatePickupCode(),
    deliveryType: deliveryType ?? "asap",
    scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
    isContactless: isContactless ?? false,
    promoCode: promoCode ? promoCode.toUpperCase().trim() : null,
  }).returning();

  await db.insert(orderItemsTable).values(
    orderItemsData.map((i) => ({ ...i, orderId: order.id }))
  );

  // Record promo code usage
  if (appliedPromoId) {
    await db.insert(promoCodeUsagesTable).values({
      promoCodeId: appliedPromoId,
      userId,
      orderId: order.id,
      discountAmount,
    });
  }

  // Award loyalty points (based on amount paid after discount)
  const pointsEarned = Math.floor(total / 10);
  if (pointsEarned > 0) {
    await db.update(usersTable).set({
      loyaltyPoints: (user?.loyaltyPoints || 0) + pointsEarned,
    }).where(eq(usersTable.id, userId));
  }

  // Credit referrer if this is the user's first completed order path
  const allUserOrders = await db.select({ id: ordersTable.id }).from(ordersTable).where(eq(ordersTable.userId, userId));
  if (allUserOrders.length === 1 && user?.referredBy) {
    const [referral] = await db
      .select()
      .from(referralsTable)
      .where(and(eq(referralsTable.referrerId, user.referredBy), eq(referralsTable.referredId, userId)))
      .limit(1);
    if (referral && referral.status === "pending") {
      const [referrer] = await db.select().from(usersTable).where(eq(usersTable.id, user.referredBy)).limit(1);
      if (referrer) {
        await db.update(usersTable).set({
          walletBalance: referrer.walletBalance + referral.creditAmount,
        }).where(eq(usersTable.id, referrer.id));
        await db.update(referralsTable).set({
          status: "completed",
          completedAt: new Date(),
        }).where(eq(referralsTable.id, referral.id));
        await pushNotification(
          referrer.id,
          "referral",
          "Parrainage réussi ! 🎉",
          `Votre ami ${user.name} a passé sa première commande. ${referral.creditAmount} MAD ont été ajoutés à votre portefeuille !`,
          { creditAmount: referral.creditAmount },
        );
      }
    }
  }

  const orderWithItems = await getOrderWithItems(order.id);

  // Push real-time event to restaurant
  publish(`restaurant:${restaurantId}`, "order_new", orderWithItems);

  // Push notification to customer
  await pushNotification(userId, "order_status", "Commande reçue !", `Votre commande chez ${restaurant.name} a bien été reçue.`, { orderId: order.id, status: "pending" });

  res.status(201).json(orderWithItems);
});

router.get("/orders/:id", attachAuth, async (req: AuthedRequest, res): Promise<void> => {
  const params = GetOrderParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const order = await getOrderWithItems(params.data.id);
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  // The pickup code is the secret that authorises the driver hand-off.
  // Only the customer who placed the order (and admins) may see it; the
  // assigned driver must request it verbally from the customer.
  const isCustomerOwner = req.userId != null && req.userId === order.userId;
  const isAdmin = req.userRole === "admin";
  const sanitized = (isCustomerOwner || isAdmin) ? order : { ...order, pickupCode: null };

  res.json(sanitized);
});

router.patch("/orders/:id/status", requireAuth, async (req: AuthedRequest, res): Promise<void> => {
  const params = UpdateOrderStatusParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateOrderStatusBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // Drivers must use the dedicated /confirm-delivery endpoint to mark an order
  // as delivered — that endpoint validates the customer pickup code.
  if (parsed.data.status === "delivered" && req.userRole === "driver") {
    res.status(400).json({ error: "Drivers must confirm delivery via /orders/:id/confirm-delivery with the customer pickup code." });
    return;
  }

  // Authorise the picked_up → en_route transition: only the assigned driver
  // (or admin) may flip an order to en_route, and only from picked_up.
  if (parsed.data.status === "en_route") {
    const [existing] = await db.select().from(ordersTable).where(eq(ordersTable.id, params.data.id)).limit(1);
    if (!existing) { res.status(404).json({ error: "Order not found" }); return; }
    if (existing.status !== "picked_up") {
      res.status(409).json({ error: "Order must be picked_up before transitioning to en_route" });
      return;
    }
    if (req.userRole !== "admin") {
      if (!existing.driverId) { res.status(403).json({ error: "Order has no assigned driver" }); return; }
      const [drv] = await db.select().from(driversTable).where(eq(driversTable.id, existing.driverId)).limit(1);
      if (!drv || drv.userId !== req.userId) {
        res.status(403).json({ error: "Only the assigned driver can mark the order as en_route" });
        return;
      }
    }
  }

  const updateData: any = { status: parsed.data.status };
  if (parsed.data.driverId) {
    updateData.driverId = parsed.data.driverId;
  }

  // On acceptance, gate on owner profile completeness and mint the
  // kitchen + customer pickup codes if not already present.
  if (parsed.data.status === "accepted") {
    const [existing] = await db.select().from(ordersTable).where(eq(ordersTable.id, params.data.id)).limit(1);
    if (!existing) { res.status(404).json({ error: "Order not found" }); return; }

    const [restaurant] = await db.select().from(restaurantsTable).where(eq(restaurantsTable.id, existing.restaurantId)).limit(1);
    if (!restaurant) { res.status(404).json({ error: "Restaurant not found" }); return; }

    // Authorization: only the restaurant owner (or admin) may accept.
    if (req.userRole !== "admin" && restaurant.ownerId !== req.userId) {
      res.status(403).json({ error: "Not authorized to accept orders for this restaurant" });
      return;
    }

    if (!restaurant.profileCompletedAt) {
      res.status(412).json({
        error: "Complete your business profile (legal name + ICE) before accepting orders.",
        code: "OWNER_PROFILE_INCOMPLETE",
      });
      return;
    }

    if (!existing.kitchenCode) updateData.kitchenCode = generateKitchenCode();
  }

  const [order] = await db
    .update(ordersTable)
    .set(updateData)
    .where(eq(ordersTable.id, params.data.id))
    .returning();

  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  // NOTE: totalDeliveries is incremented exclusively in
  // POST /orders/:id/confirm-delivery (the canonical delivery hand-off path).
  // We intentionally do NOT bump it here even when status flips to "delivered"
  // via this generic PATCH, otherwise an owner-side correction would
  // double-count the delivery.

  const orderWithItems = await getOrderWithItems(order.id);

  // Push real-time events
  publish(`order:${order.id}`, "order_status", { orderId: order.id, status: order.status, order: orderWithItems });
  publish(`restaurant:${order.restaurantId}`, "order_status", { orderId: order.id, status: order.status });
  // Admin tracking dashboard sees every status change for live ops visibility.
  publish("admin_tracking", "order_status", { orderId: order.id, status: order.status, driverId: order.driverId });

  // When order is ready, notify available drivers
  if (parsed.data.status === "ready") {
    publish("available_orders", "order_ready", { orderId: order.id, restaurantName: order.restaurantName, deliveryAddress: order.deliveryAddress, total: order.total });
  }

  // When order is assigned to a driver, push to that driver's channel
  if (parsed.data.driverId) {
    publish(`driver_orders:${parsed.data.driverId}`, "order_assigned", { orderId: order.id, order: orderWithItems });
  }

  // When the driver hits the road, attach the order to their live tracking
  // channel so subsequent /location pings fan out on this order:{id} channel.
  if (parsed.data.status === "en_route" && order.driverId) {
    tracking.attachOrder(order.driverId, order.id);
  }

  res.json(orderWithItems);
});

/**
 * Live tracking snapshot for an order — combines DB persistence with the
 * in-memory tracking service. Useful for clients that just opened the page
 * and need an initial state before subscribing to the SSE channel.
 */
router.get("/orders/:id/tracking", attachAuth, async (req: AuthedRequest, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid order id" }); return; }

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id)).limit(1);
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }

  // Public tracking snapshot — usable from a deep link without auth (a la
  // Glovo/Uber Eats) so customers and restaurant staff can see live progress
  // without logging in. attachAuth only provides identity if the caller has
  // a session, but the snapshot itself is intentionally accessible anon.

  const driver = order.driverId
    ? (await db.select().from(driversTable).where(eq(driversTable.id, order.driverId)).limit(1))[0]
    : null;

  const live = order.driverId ? tracking.getState(order.driverId) : null;
  const isOnline = order.driverId ? tracking.isOnline(order.driverId) : false;

  // Prefer the live in-memory position (fresher) over the DB snapshot.
  const driverLat = live?.lat ?? driver?.latitude ?? null;
  const driverLng = live?.lng ?? driver?.longitude ?? null;
  const driverLastSeen = live?.lastSeen ?? (driver?.locationUpdatedAt ? driver.locationUpdatedAt.getTime() : null);

  res.json({
    orderId: order.id,
    status: order.status,
    driverId: order.driverId,
    driverName: driver?.name ?? null,
    driverLat,
    driverLng,
    driverLastSeen,
    driverIsOnline: isOnline,
    eta: live?.eta ?? null,
    deliveryAddress: order.deliveryAddress,
    updatedAt: order.updatedAt instanceof Date ? order.updatedAt.toISOString() : order.updatedAt,
  });
});

/** Driver accepts a "ready" order — assigns themselves to it */
router.post("/orders/:id/accept-delivery", requireAuth, async (req: AuthedRequest, res): Promise<void> => {
  const orderId = parseInt(req.params.id, 10);
  if (isNaN(orderId)) { res.status(400).json({ error: "Invalid order id" }); return; }

  const { driverId } = req.body;
  if (!driverId || typeof driverId !== "number") {
    res.status(400).json({ error: "driverId (number) required" });
    return;
  }

  // Only accept if still "ready" and unassigned
  const [existing] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);
  if (!existing) { res.status(404).json({ error: "Order not found" }); return; }
  if (existing.status !== "ready") {
    res.status(409).json({ error: "Order is no longer available for pickup" });
    return;
  }
  if (existing.driverId) {
    res.status(409).json({ error: "Order already assigned to another driver" });
    return;
  }

  const [driver] = await db.select().from(driversTable).where(eq(driversTable.id, driverId)).limit(1);
  if (!driver) { res.status(404).json({ error: "Driver not found" }); return; }

  // Caller must be the driver themselves, or an admin
  if (driver.userId !== req.userId && req.userRole !== "admin") {
    res.status(403).json({ error: "Not authorized to accept on behalf of another driver" });
    return;
  }

  // Profile gate — driver must have completed the mandatory onboarding fields
  // before they can accept any delivery (vehicle plate + national ID).
  if (req.userRole !== "admin" && !driver.profileCompletedAt) {
    res.status(412).json({
      error: "Complete your driver profile (vehicle, plate, national ID) before accepting deliveries.",
      code: "DRIVER_PROFILE_INCOMPLETE",
    });
    return;
  }

  const [order] = await db
    .update(ordersTable)
    .set({ driverId, status: "picked_up" })
    .where(eq(ordersTable.id, orderId))
    .returning();

  const orderWithItems = await getOrderWithItems(order.id);

  // Notify customer + restaurant + admin tracking dashboard.
  publish(`order:${orderId}`, "order_status", { orderId, status: "picked_up", driverName: driver.name, order: orderWithItems });
  publish(`restaurant:${order.restaurantId}`, "order_status", { orderId, status: "picked_up", driverName: driver.name });
  publish("admin_tracking", "order_status", { orderId, status: "picked_up", driverId, driverName: driver.name });

  // Start tracking the order in the in-memory live state so subsequent driver
  // location pings get fanned out on the order:{id} channel.
  tracking.attachOrder(driverId, orderId);

  res.json(orderWithItems);
});

/**
 * Driver confirms delivery by entering the 6-digit OTP shown on the customer's
 * phone. This is the single gate that:
 *   1. Validates the OTP
 *   2. Marks the order as "delivered"
 *   3. Credits the driver (deliveryFee × 80%) and records the earning
 *   4. Marks the driver as available again
 *   5. Increments totalDeliveries
 *   6. Pushes notifications to both customer and driver
 *   7. Broadcasts SSE events to all relevant channels
 */
router.post("/orders/:id/confirm-delivery", requireAuth, async (req: AuthedRequest, res): Promise<void> => {
  const orderId = parseInt(req.params.id, 10);
  if (isNaN(orderId)) { res.status(400).json({ error: "Invalid order id" }); return; }

  const code = typeof req.body?.otp === "string" ? req.body.otp.trim()
    : typeof req.body?.pickupCode === "string" ? req.body.pickupCode.trim() : "";
  if (!/^\d{4,6}$/.test(code)) {
    res.status(400).json({ error: "Veuillez saisir le code OTP à 6 chiffres" });
    return;
  }

  const [existing] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);
  if (!existing) { res.status(404).json({ error: "Commande introuvable" }); return; }

  if (existing.status !== "picked_up" && existing.status !== "en_route") {
    res.status(409).json({ error: "La commande n'est pas en cours de livraison" });
    return;
  }

  // ── Authorization ──────────────────────────────────────────────────────
  let driver: typeof driversTable.$inferSelect | null = null;
  if (req.userRole !== "admin") {
    if (!existing.driverId) {
      res.status(403).json({ error: "Aucun livreur assigné à cette commande" });
      return;
    }
    const [found] = await db.select().from(driversTable).where(eq(driversTable.id, existing.driverId)).limit(1);
    if (!found || found.userId !== req.userId) {
      res.status(403).json({ error: "Seul le livreur assigné peut confirmer la livraison" });
      return;
    }
    driver = found;
  } else if (existing.driverId) {
    const [found] = await db.select().from(driversTable).where(eq(driversTable.id, existing.driverId)).limit(1);
    driver = found ?? null;
  }

  // ── OTP check ──────────────────────────────────────────────────────────
  if (!existing.pickupCode || existing.pickupCode !== code) {
    res.status(400).json({ error: "Code OTP incorrect — demandez au client de relire son code", code: "INVALID_OTP" });
    return;
  }

  // ── Mark order as delivered ────────────────────────────────────────────
  const [order] = await db
    .update(ordersTable)
    .set({ status: "delivered" })
    .where(eq(ordersTable.id, orderId))
    .returning();

  // ── Driver post-delivery processing ────────────────────────────────────
  const DRIVER_SHARE = 0.80; // 80% of delivery fee goes to the driver
  const driverEarning = Math.round((order.deliveryFee ?? 0) * DRIVER_SHARE * 100) / 100;

  if (driver) {
    // 1. Increment deliveries, credit earnings, mark available
    await db.update(driversTable).set({
      totalDeliveries: driver.totalDeliveries + 1,
      totalEarnings: (driver.totalEarnings ?? 0) + driverEarning,
      isAvailable: true,
    }).where(eq(driversTable.id, driver.id));

    // 2. Insert earnings ledger row
    await db.insert(driverEarningsTable).values({
      driverId: driver.id,
      orderId: order.id,
      amount: driverEarning,
      type: "delivery",
      note: `Livraison #${order.reference ?? order.id} — ${order.restaurantName}`,
    });

    // 3. Notify the driver
    await pushNotification(
      driver.userId,
      "earnings",
      "Livraison confirmée ! 💰",
      `+${driverEarning.toFixed(0)} MAD ajoutés à vos revenus. Vous êtes de nouveau disponible.`,
      { orderId: order.id, amount: driverEarning },
    );

    // 4. Driver-specific SSE so the app updates earnings strip in real-time
    publish(`driver:${driver.id}`, "delivery_completed", {
      orderId: order.id,
      earning: driverEarning,
      totalEarnings: (driver.totalEarnings ?? 0) + driverEarning,
      totalDeliveries: driver.totalDeliveries + 1,
    });
  }

  // ── Notify customer ────────────────────────────────────────────────────
  await pushNotification(
    order.userId,
    "order_status",
    "Commande livrée ! 🎉",
    `Votre commande chez ${order.restaurantName} vient d'être remise. Bon appétit !`,
    { orderId: order.id, status: "delivered" },
  );

  // ── Broadcast SSE to all channels ─────────────────────────────────────
  const orderWithItems = await getOrderWithItems(order.id);
  publish(`order:${order.id}`, "order_status", { orderId: order.id, status: "delivered", order: orderWithItems });
  publish(`restaurant:${order.restaurantId}`, "order_status", { orderId: order.id, status: "delivered" });
  publish("admin_tracking", "order_status", { orderId: order.id, status: "delivered", driverId: order.driverId });

  // ── Stop live GPS tracking ─────────────────────────────────────────────
  if (order.driverId) tracking.detachOrder(order.driverId, order.id);

  res.json({ ...orderWithItems, driverEarning });
});

/**
 * Printable kitchen ticket. Returns minimal HTML auto-styled for thermal
 * 80mm printers. Accessible to the restaurant owner via a signed token in
 * the query string so a freshly opened browser tab can fetch it.
 */
router.get("/orders/:id/receipt", requireAuth, async (req: AuthedRequest, res): Promise<void> => {
  const orderId = parseInt(req.params.id, 10);
  if (isNaN(orderId)) { res.status(400).send("Invalid order id"); return; }

  const order = await getOrderWithItems(orderId);
  if (!order) { res.status(404).send("Order not found"); return; }

  const [restaurant] = await db.select().from(restaurantsTable).where(eq(restaurantsTable.id, order.restaurantId)).limit(1);
  if (!restaurant) { res.status(404).send("Restaurant not found"); return; }

  if (req.userRole !== "admin" && restaurant.ownerId !== req.userId) {
    res.status(403).send("Forbidden");
    return;
  }

  const escape = (s: string) => String(s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

  const itemsHtml = order.items.map((it: any) => `
    <tr>
      <td style="text-align:left">${it.quantity}× ${escape(it.menuItemName)}</td>
      <td style="text-align:right">${(it.totalPrice ?? 0).toFixed(2)}</td>
    </tr>`).join("");

  const created = new Date(order.createdAt).toLocaleString("fr-FR");

  const html = `<!doctype html>
<html><head>
<meta charset="utf-8" />
<title>Ticket — ${escape(order.reference || `#${order.id}`)}</title>
<style>
  @page { size: 80mm auto; margin: 4mm; }
  body { font-family: 'Courier New', monospace; max-width: 320px; margin: 0 auto; padding: 12px; color: #000; }
  h1 { font-size: 16px; margin: 0 0 4px; text-align: center; }
  .muted { color: #555; font-size: 11px; }
  .center { text-align: center; }
  .ref { font-size: 13px; font-weight: bold; text-align: center; margin: 8px 0; letter-spacing: 1px; }
  .kc { font-size: 36px; font-weight: bold; text-align: center; padding: 10px 0; border-top: 2px dashed #000; border-bottom: 2px dashed #000; margin: 10px 0; letter-spacing: 6px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; margin: 8px 0; }
  td { padding: 2px 0; vertical-align: top; }
  hr { border: none; border-top: 1px dashed #555; margin: 8px 0; }
  .total { font-weight: bold; font-size: 14px; }
  .footer { font-size: 10px; text-align: center; margin-top: 12px; color: #444; }
  @media print { button { display: none; } }
</style>
</head><body onload="setTimeout(()=>window.print(),200)">
  <button style="float:right" onclick="window.print()">Imprimer</button>
  <h1>${escape(restaurant.name)}</h1>
  <div class="center muted">${escape(restaurant.address)}</div>
  ${restaurant.phone ? `<div class="center muted">${escape(restaurant.phone)}</div>` : ""}
  ${restaurant.ice ? `<div class="center muted">ICE ${escape(restaurant.ice)}</div>` : ""}
  <hr/>
  <div class="ref">${escape(order.reference || `#${order.id}`)}</div>
  <div class="muted center">${created}</div>
  <div class="kc">${escape(order.kitchenCode || "—")}</div>
  <div class="muted center">Code cuisine</div>
  <hr/>
  <div><strong>Client:</strong> ${escape(order.userName)}</div>
  <div class="muted">${escape(order.deliveryAddress)}</div>
  ${order.notes ? `<div class="muted"><em>Note: ${escape(order.notes)}</em></div>` : ""}
  <table>${itemsHtml}</table>
  <hr/>
  <table>
    <tr><td>Sous-total</td><td style="text-align:right">${order.subtotal.toFixed(2)}</td></tr>
    <tr><td>Livraison</td><td style="text-align:right">${(order.deliveryFee ?? 0).toFixed(2)}</td></tr>
    <tr class="total"><td>TOTAL MAD</td><td style="text-align:right">${order.total.toFixed(2)}</td></tr>
  </table>
  <hr/>
  <div class="footer">Le client présentera son code à 4 chiffres au livreur lors de la remise.</div>
</body></html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.send(html);
});

/** Customer rates their driver after delivery */
router.post("/orders/:id/rate-driver", requireAuth, async (req: AuthedRequest, res): Promise<void> => {
  const orderId = parseInt(req.params.id, 10);
  if (isNaN(orderId)) { res.status(400).json({ error: "Invalid order id" }); return; }

  const { rating, comment } = req.body;
  if (!rating || typeof rating !== "number" || rating < 1 || rating > 5) {
    res.status(400).json({ error: "Rating must be 1-5" });
    return;
  }

  const [order] = await db.select().from(ordersTable).where(and(eq(ordersTable.id, orderId), eq(ordersTable.userId, req.userId!))).limit(1);
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }
  if (order.status !== "delivered") { res.status(400).json({ error: "Order must be delivered to rate" }); return; }
  if (order.driverRating !== null) { res.status(400).json({ error: "Vous avez déjà évalué ce livreur" }); return; }

  const [updated] = await db.update(ordersTable)
    .set({ driverRating: Math.round(rating), driverRatingComment: comment ?? null })
    .where(eq(ordersTable.id, orderId))
    .returning();

  // Notify driver
  if (order.driverId) {
    const [drv] = await db.select().from(driversTable).where(eq(driversTable.id, order.driverId)).limit(1);
    if (drv?.userId) {
      await pushNotification(
        drv.userId,
        "system",
        "Nouvelle évaluation",
        `Vous avez reçu ${Math.round(rating)}/5 étoiles pour la commande ${order.reference ?? `#${order.id}`}.`,
        { orderId, rating },
      );
    }
  }

  res.json(updated);
});

/** Driver rates customer */
router.post("/orders/:id/rate-customer", requireAuth, async (req: AuthedRequest, res): Promise<void> => {
  const orderId = parseInt(req.params.id, 10);
  if (isNaN(orderId)) { res.status(400).json({ error: "Invalid order id" }); return; }

  const { rating } = req.body;
  if (!rating || typeof rating !== "number" || rating < 1 || rating > 5) {
    res.status(400).json({ error: "Rating must be 1-5" });
    return;
  }

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }
  if (order.status !== "delivered") { res.status(400).json({ error: "Order must be delivered to rate" }); return; }

  // Verify caller is the assigned driver
  if (order.driverId) {
    const [drv] = await db.select().from(driversTable).where(eq(driversTable.id, order.driverId)).limit(1);
    if (drv?.userId !== req.userId) { res.status(403).json({ error: "Forbidden" }); return; }
  } else {
    res.status(403).json({ error: "Forbidden" }); return;
  }

  if (order.customerRating !== null) { res.status(400).json({ error: "Vous avez déjà évalué ce client" }); return; }

  const [updated] = await db.update(ordersTable)
    .set({ customerRating: Math.round(rating) })
    .where(eq(ordersTable.id, orderId))
    .returning();

  res.json(updated);
});

/** Reorder — clone items from a previous order into a new pending order */
router.post("/orders/:id/reorder", requireAuth, async (req: AuthedRequest, res): Promise<void> => {
  const orderId = parseInt(req.params.id, 10);
  if (isNaN(orderId)) { res.status(400).json({ error: "Invalid order id" }); return; }

  const userId = req.userId!;

  const [order] = await db.select().from(ordersTable).where(and(eq(ordersTable.id, orderId), eq(ordersTable.userId, userId))).limit(1);
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }

  const [restaurant] = await db.select().from(restaurantsTable).where(eq(restaurantsTable.id, order.restaurantId)).limit(1);
  if (!restaurant) { res.status(404).json({ error: "Restaurant not found" }); return; }
  if (!restaurant.isOpen) { res.status(400).json({ error: "Ce restaurant est actuellement fermé." }); return; }

  const oldItems = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, orderId));
  if (oldItems.length === 0) { res.status(400).json({ error: "No items found in original order" }); return; }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);

  let subtotal = 0;
  const newOrderItems: { menuItemId: number; menuItemName: string; quantity: number; unitPrice: number; totalPrice: number }[] = [];

  for (const item of oldItems) {
    const [menuItem] = await db.select().from(menuItemsTable).where(eq(menuItemsTable.id, item.menuItemId)).limit(1);
    if (!menuItem || !menuItem.isAvailable) continue;
    const unitPrice = menuItem.price;
    const itemTotal = unitPrice * item.quantity;
    subtotal += itemTotal;
    newOrderItems.push({
      menuItemId: menuItem.id,
      menuItemName: menuItem.name,
      quantity: item.quantity,
      unitPrice,
      totalPrice: itemTotal,
    });
  }

  if (newOrderItems.length === 0) {
    res.status(400).json({ error: "Aucun article disponible dans cette commande" });
    return;
  }

  const deliveryFee = restaurant.deliveryFee || 0;
  const total = subtotal + deliveryFee;
  const reference = await generateUniqueOrderReference();

  const [newOrder] = await db.insert(ordersTable).values({
    reference,
    userId,
    restaurantId: order.restaurantId,
    restaurantName: restaurant.name,
    userName: user?.name || "Customer",
    status: "pending",
    subtotal,
    deliveryFee,
    total,
    deliveryAddress: order.deliveryAddress,
    notes: order.notes,
    estimatedDeliveryTime: restaurant.deliveryTime || 30,
    deliveryType: "asap",
    isContactless: false,
  }).returning();

  await db.insert(orderItemsTable).values(
    newOrderItems.map((i) => ({ ...i, orderId: newOrder.id }))
  );

  const pointsEarned = Math.floor(total / 10);
  if (pointsEarned > 0) {
    await db.update(usersTable).set({
      loyaltyPoints: (user?.loyaltyPoints || 0) + pointsEarned,
    }).where(eq(usersTable.id, userId));
  }

  const newOrderWithItems = await getOrderWithItems(newOrder.id);
  publish(`restaurant:${order.restaurantId}`, "order_new", newOrderWithItems);
  await pushNotification(userId, "order_status", "Commande relancée !", `Votre commande chez ${restaurant.name} a bien été reçue.`, { orderId: newOrder.id, status: "pending" });

  res.status(201).json(newOrderWithItems);
});

export default router;
