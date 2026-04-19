import { Router, type IRouter } from "express";
import {
  db,
  ordersTable,
  orderItemsTable,
  menuItemsTable,
  restaurantsTable,
  usersTable,
  driversTable,
  generateUniqueOrderReference,
  generateKitchenCode,
  generatePickupCode,
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

const router: IRouter = Router();

async function getOrderWithItems(orderId: number) {
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);
  if (!order) return null;

  const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, orderId));
  return { ...order, items };
}

router.get("/orders/active", async (req, res): Promise<void> => {
  const activeStatuses = ["pending", "accepted", "preparing", "ready", "picked_up"];
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
  const filtersRestaurantOrDriver = conditions.some(() => false) ||
    (queryParams.success && (queryParams.data.restaurantId || queryParams.data.driverId));
  if (role === "customer" || (!filtersRestaurantOrDriver && role !== "admin")) {
    conditions = conditions.filter((_, i) => true);
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

  const [restaurant] = await db.select().from(restaurantsTable).where(eq(restaurantsTable.id, restaurantId)).limit(1);
  if (!restaurant) {
    res.status(404).json({ error: "Restaurant not found" });
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

  const deliveryFee = restaurant.deliveryFee || 0;
  const total = subtotal + deliveryFee;

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
    total,
    deliveryAddress,
    notes: notes ?? null,
    estimatedDeliveryTime: restaurant.deliveryTime || 30,
  }).returning();

  await db.insert(orderItemsTable).values(
    orderItemsData.map((i) => ({ ...i, orderId: order.id }))
  );

  // Award loyalty points
  const pointsEarned = Math.floor(total / 10);
  if (pointsEarned > 0) {
    await db.update(usersTable).set({
      loyaltyPoints: (user?.loyaltyPoints || 0) + pointsEarned,
    }).where(eq(usersTable.id, userId));
  }

  const orderWithItems = await getOrderWithItems(order.id);

  // Push real-time event to restaurant
  publish(`restaurant:${restaurantId}`, "order_new", orderWithItems);

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
    if (!existing.pickupCode) updateData.pickupCode = generatePickupCode();
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

  // When order is ready, notify available drivers
  if (parsed.data.status === "ready") {
    publish("available_orders", "order_ready", { orderId: order.id, restaurantName: order.restaurantName, deliveryAddress: order.deliveryAddress, total: order.total });
  }

  // When order is assigned to a driver, push to that driver's channel
  if (parsed.data.driverId) {
    publish(`driver_orders:${parsed.data.driverId}`, "order_assigned", { orderId: order.id, order: orderWithItems });
  }

  res.json(orderWithItems);
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

  // Notify customer + restaurant
  publish(`order:${orderId}`, "order_status", { orderId, status: "picked_up", driverName: driver.name, order: orderWithItems });
  publish(`restaurant:${order.restaurantId}`, "order_status", { orderId, status: "picked_up", driverName: driver.name });

  res.json(orderWithItems);
});

/**
 * Driver confirms hand-off by entering the 4-digit code shown on the
 * customer's screen. Only the assigned driver (or admin) may call this.
 */
router.post("/orders/:id/confirm-delivery", requireAuth, async (req: AuthedRequest, res): Promise<void> => {
  const orderId = parseInt(req.params.id, 10);
  if (isNaN(orderId)) { res.status(400).json({ error: "Invalid order id" }); return; }

  const code = typeof req.body?.pickupCode === "string" ? req.body.pickupCode.trim() : "";
  if (!/^\d{4}$/.test(code)) {
    res.status(400).json({ error: "pickupCode must be a 4-digit string" });
    return;
  }

  const [existing] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);
  if (!existing) { res.status(404).json({ error: "Order not found" }); return; }
  if (existing.status !== "picked_up") {
    res.status(409).json({ error: "Order is not in transit" });
    return;
  }

  // Authorization
  if (req.userRole !== "admin") {
    if (!existing.driverId) {
      res.status(403).json({ error: "Order has no assigned driver" });
      return;
    }
    const [driver] = await db.select().from(driversTable).where(eq(driversTable.id, existing.driverId)).limit(1);
    if (!driver || driver.userId !== req.userId) {
      res.status(403).json({ error: "Only the assigned driver can confirm delivery" });
      return;
    }
  }

  if (!existing.pickupCode || existing.pickupCode !== code) {
    res.status(400).json({ error: "Incorrect pickup code", code: "INVALID_PICKUP_CODE" });
    return;
  }

  const [order] = await db
    .update(ordersTable)
    .set({ status: "delivered" })
    .where(eq(ordersTable.id, orderId))
    .returning();

  // Bump the driver's totalDeliveries counter.
  if (order.driverId) {
    const [driver] = await db.select().from(driversTable).where(eq(driversTable.id, order.driverId)).limit(1);
    if (driver) {
      await db.update(driversTable).set({
        totalDeliveries: driver.totalDeliveries + 1,
      }).where(eq(driversTable.id, order.driverId));
    }
  }

  const orderWithItems = await getOrderWithItems(order.id);
  publish(`order:${order.id}`, "order_status", { orderId: order.id, status: "delivered", order: orderWithItems });
  publish(`restaurant:${order.restaurantId}`, "order_status", { orderId: order.id, status: "delivered" });

  res.json(orderWithItems);
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

export default router;
