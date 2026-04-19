import { Router, type IRouter } from "express";
import { db, supportTicketsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth, type AuthedRequest } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/support-tickets", requireAuth, async (req: AuthedRequest, res): Promise<void> => {
  const rows = await db
    .select()
    .from(supportTicketsTable)
    .where(eq(supportTicketsTable.userId, req.userId!))
    .orderBy(desc(supportTicketsTable.createdAt));
  res.json(rows);
});

router.post("/support-tickets", requireAuth, async (req: AuthedRequest, res): Promise<void> => {
  const userId = req.userId!;
  const { category, subject, message } = req.body ?? {};
  if (!category || !subject || !message) {
    res.status(400).json({ error: "category, subject and message required" });
    return;
  }
  const [row] = await db
    .insert(supportTicketsTable)
    .values({ userId, category, subject, message, status: "open" })
    .returning();
  res.status(201).json(row);
});

export default router;
