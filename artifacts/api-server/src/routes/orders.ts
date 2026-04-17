import { Router, type IRouter } from "express";
import { db, ordersTable, orderItemsTable, menuItemsTable, restaurantsTable, usersTable } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";
import {
  CreateOrderBody,
  GetOrderParams,
  UpdateOrderStatusParams,
  UpdateOrderStatusBody,
  ListOrdersQueryParams,
} from "@workspace/api-zod";

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

router.get("/orders", async (req, res): Promise<void> => {
  const queryParams = ListOrdersQueryParams.safeParse(req.query);
  
  let conditions: any[] = [];
  
  if (queryParams.success) {
    const { status, userId, restaurantId, driverId } = queryParams.data;
    if (status) conditions.push(eq(ordersTable.status, status));
    if (userId) conditions.push(eq(ordersTable.userId, userId));
    if (restaurantId) conditions.push(eq(ordersTable.restaurantId, restaurantId));
    if (driverId) conditions.push(eq(ordersTable.driverId, driverId));
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

router.post("/orders", async (req, res): Promise<void> => {
  const parsed = CreateOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { restaurantId, deliveryAddress, notes, items } = parsed.data;
  const userId = (req as any).userId || 1;

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

  const [order] = await db.insert(ordersTable).values({
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
  res.status(201).json(orderWithItems);
});

router.get("/orders/:id", async (req, res): Promise<void> => {
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

  res.json(order);
});

router.patch("/orders/:id/status", async (req, res): Promise<void> => {
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

  const updateData: any = { status: parsed.data.status };
  if (parsed.data.driverId) {
    updateData.driverId = parsed.data.driverId;
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

  // Update driver stats on delivery
  if (parsed.data.status === "delivered" && order.driverId) {
    const { driversTable } = await import("@workspace/db");
    const [driver] = await db.select().from(driversTable).where(eq(driversTable.id, order.driverId)).limit(1);
    if (driver) {
      await db.update(driversTable).set({
        totalDeliveries: driver.totalDeliveries + 1,
      }).where(eq(driversTable.id, order.driverId));
    }
  }

  const orderWithItems = await getOrderWithItems(order.id);
  res.json(orderWithItems);
});

export default router;
