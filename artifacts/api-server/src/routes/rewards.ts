import { Router, type IRouter } from "express";
import { db, usersTable, ordersTable } from "@workspace/db";
import { eq, count, sum } from "drizzle-orm";
import jwt from "jsonwebtoken";

const router: IRouter = Router();

const JWT_SECRET = process.env.SESSION_SECRET || "jatek-secret-2024";

function getTier(points: number): string {
  if (points >= 500) return "Gold";
  if (points >= 100) return "Silver";
  return "Bronze";
}

function getNextTierPoints(points: number): number {
  if (points >= 500) return 0;
  if (points >= 100) return 500 - points;
  return 100 - points;
}

router.get("/rewards/my", async (req, res): Promise<void> => {
  const authHeader = req.headers.authorization;
  let userId = 1;

  if (authHeader?.startsWith("Bearer ")) {
    try {
      const token = authHeader.split(" ")[1];
      const payload = jwt.verify(token, JWT_SECRET) as { userId: number };
      userId = payload.userId;
    } catch {
      // use default
    }
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const [orderStats] = await db
    .select({ totalOrders: count(), totalSpent: sum(ordersTable.total) })
    .from(ordersTable)
    .where(eq(ordersTable.userId, userId));

  const loyaltyPoints = user.loyaltyPoints;

  res.json({
    userId,
    loyaltyPoints,
    tier: getTier(loyaltyPoints),
    nextTierPoints: getNextTierPoints(loyaltyPoints),
    totalOrdersCount: Number(orderStats?.totalOrders || 0),
    totalSpent: Number(orderStats?.totalSpent || 0),
  });
});

export default router;
