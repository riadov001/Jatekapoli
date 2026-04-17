import { Router, type IRouter } from "express";
import { db, restaurantsTable, ordersTable, reviewsTable } from "@workspace/db";
import { eq, ilike, and, avg, count, sum } from "drizzle-orm";
import {
  CreateRestaurantBody,
  UpdateRestaurantBody,
  GetRestaurantParams,
  UpdateRestaurantParams,
  DeleteRestaurantParams,
  GetRestaurantStatsParams,
  ListRestaurantsQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/restaurants/featured", async (_req, res): Promise<void> => {
  const restaurants = await db
    .select()
    .from(restaurantsTable)
    .where(and(eq(restaurantsTable.isVerified, true), eq(restaurantsTable.isOpen, true)))
    .limit(6);
  res.json(restaurants);
});

router.get("/restaurants", async (req, res): Promise<void> => {
  const params = ListRestaurantsQueryParams.safeParse(req.query);
  const query = params.success ? params.data : {};

  let conditions: ReturnType<typeof and>[] = [];

  if (query.isOpen !== undefined) {
    conditions.push(eq(restaurantsTable.isOpen, query.isOpen));
  }
  if (query.isLocal !== undefined) {
    conditions.push(eq(restaurantsTable.isLocal, query.isLocal));
  }
  if (query.category) {
    conditions.push(eq(restaurantsTable.category, query.category));
  }
  if (query.search) {
    conditions.push(ilike(restaurantsTable.name, `%${query.search}%`));
  }

  const restaurants = conditions.length > 0
    ? await db.select().from(restaurantsTable).where(and(...conditions))
    : await db.select().from(restaurantsTable);

  res.json(restaurants);
});

router.post("/restaurants", async (req, res): Promise<void> => {
  const parsed = CreateRestaurantBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const ownerId = (req as any).userId || 1;

  const [restaurant] = await db.insert(restaurantsTable).values({
    ...parsed.data,
    ownerId,
    isVerified: false,
    isOpen: true,
    reviewCount: 0,
  }).returning();

  res.status(201).json(restaurant);
});

router.get("/restaurants/:id", async (req, res): Promise<void> => {
  const params = GetRestaurantParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [restaurant] = await db.select().from(restaurantsTable).where(eq(restaurantsTable.id, params.data.id)).limit(1);
  if (!restaurant) {
    res.status(404).json({ error: "Restaurant not found" });
    return;
  }

  res.json(restaurant);
});

router.patch("/restaurants/:id", async (req, res): Promise<void> => {
  const params = UpdateRestaurantParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateRestaurantBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [restaurant] = await db
    .update(restaurantsTable)
    .set(parsed.data)
    .where(eq(restaurantsTable.id, params.data.id))
    .returning();

  if (!restaurant) {
    res.status(404).json({ error: "Restaurant not found" });
    return;
  }

  res.json(restaurant);
});

router.delete("/restaurants/:id", async (req, res): Promise<void> => {
  const params = DeleteRestaurantParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  await db.delete(restaurantsTable).where(eq(restaurantsTable.id, params.data.id));
  res.sendStatus(204);
});

router.get("/restaurants/:id/stats", async (req, res): Promise<void> => {
  const params = GetRestaurantStatsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const id = params.data.id;

  const [orderStats] = await db
    .select({
      totalOrders: count(),
      completedOrders: count(ordersTable.id),
      totalRevenue: sum(ordersTable.total),
    })
    .from(ordersTable)
    .where(eq(ordersTable.restaurantId, id));

  const [completedStats] = await db
    .select({ completedOrders: count() })
    .from(ordersTable)
    .where(and(eq(ordersTable.restaurantId, id), eq(ordersTable.status, "delivered")));

  const [pendingStats] = await db
    .select({ pendingOrders: count() })
    .from(ordersTable)
    .where(and(eq(ordersTable.restaurantId, id), eq(ordersTable.status, "pending")));

  const [reviewStats] = await db
    .select({ avgRating: avg(reviewsTable.rating), totalReviews: count() })
    .from(reviewsTable)
    .where(eq(reviewsTable.restaurantId, id));

  res.json({
    totalOrders: Number(orderStats?.totalOrders || 0),
    completedOrders: Number(completedStats?.completedOrders || 0),
    totalRevenue: Number(orderStats?.totalRevenue || 0),
    averageRating: reviewStats?.avgRating ? Number(reviewStats.avgRating) : null,
    totalReviews: Number(reviewStats?.totalReviews || 0),
    pendingOrders: Number(pendingStats?.pendingOrders || 0),
  });
});

export default router;
