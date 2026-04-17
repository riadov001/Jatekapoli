import { Router, type IRouter } from "express";
import { db, reviewsTable, restaurantsTable } from "@workspace/db";
import { eq, and, avg } from "drizzle-orm";
import {
  CreateReviewBody,
  DeleteReviewParams,
  ListReviewsQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/reviews", async (req, res): Promise<void> => {
  const queryParams = ListReviewsQueryParams.safeParse(req.query);

  let conditions: any[] = [];

  if (queryParams.success) {
    const { restaurantId, userId } = queryParams.data;
    if (restaurantId) conditions.push(eq(reviewsTable.restaurantId, restaurantId));
    if (userId) conditions.push(eq(reviewsTable.userId, userId));
  }

  const reviews = conditions.length > 0
    ? await db.select().from(reviewsTable).where(and(...conditions))
    : await db.select().from(reviewsTable);

  res.json(reviews);
});

router.post("/reviews", async (req, res): Promise<void> => {
  const parsed = CreateReviewBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const userId = (req as any).userId || 1;

  const [review] = await db.insert(reviewsTable).values({
    ...parsed.data,
    userId,
    userName: (req as any).userName || "Customer",
    orderId: parsed.data.orderId ?? null,
    comment: parsed.data.comment ?? null,
  }).returning();

  // Update restaurant rating
  const [ratingResult] = await db
    .select({ avgRating: avg(reviewsTable.rating) })
    .from(reviewsTable)
    .where(eq(reviewsTable.restaurantId, parsed.data.restaurantId));

  if (ratingResult?.avgRating) {
    const [countResult] = await db
      .select({ count: eq(reviewsTable.restaurantId, parsed.data.restaurantId) })
      .from(reviewsTable)
      .where(eq(reviewsTable.restaurantId, parsed.data.restaurantId));

    await db.update(restaurantsTable).set({
      rating: Number(ratingResult.avgRating),
    }).where(eq(restaurantsTable.id, parsed.data.restaurantId));
  }

  res.status(201).json(review);
});

router.delete("/reviews/:id", async (req, res): Promise<void> => {
  const params = DeleteReviewParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  await db.delete(reviewsTable).where(eq(reviewsTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
