import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq, ilike, and } from "drizzle-orm";
import {
  UpdateUserBody,
  UpdateUserParams,
  GetUserParams,
  DeleteUserParams,
  ListUsersQueryParams,
} from "@workspace/api-zod";
import { requireAuth, type AuthedRequest } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/users", async (req, res): Promise<void> => {
  const queryParams = ListUsersQueryParams.safeParse(req.query);

  let conditions: any[] = [];

  if (queryParams.success) {
    const { role, search } = queryParams.data;
    if (role) conditions.push(eq(usersTable.role, role));
    if (search) conditions.push(ilike(usersTable.name, `%${search}%`));
  }

  const users = conditions.length > 0
    ? await db.select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, role: usersTable.role, phone: usersTable.phone, address: usersTable.address, avatarUrl: usersTable.avatarUrl, isActive: usersTable.isActive, loyaltyPoints: usersTable.loyaltyPoints, createdAt: usersTable.createdAt }).from(usersTable).where(and(...conditions))
    : await db.select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, role: usersTable.role, phone: usersTable.phone, address: usersTable.address, avatarUrl: usersTable.avatarUrl, isActive: usersTable.isActive, loyaltyPoints: usersTable.loyaltyPoints, createdAt: usersTable.createdAt }).from(usersTable);

  res.json(users);
});

router.get("/users/:id", async (req, res): Promise<void> => {
  const params = GetUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [user] = await db
    .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, role: usersTable.role, phone: usersTable.phone, address: usersTable.address, avatarUrl: usersTable.avatarUrl, isActive: usersTable.isActive, loyaltyPoints: usersTable.loyaltyPoints, createdAt: usersTable.createdAt })
    .from(usersTable)
    .where(eq(usersTable.id, params.data.id))
    .limit(1);

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(user);
});

router.patch("/users/:id", requireAuth, async (req: AuthedRequest, res): Promise<void> => {
  const params = UpdateUserParams.safeParse(req.params);
  if (params.success && req.userId !== params.data.id && req.userRole !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [user] = await db
    .update(usersTable)
    .set(parsed.data)
    .where(eq(usersTable.id, params.data.id))
    .returning({ id: usersTable.id, name: usersTable.name, email: usersTable.email, role: usersTable.role, phone: usersTable.phone, address: usersTable.address, avatarUrl: usersTable.avatarUrl, isActive: usersTable.isActive, loyaltyPoints: usersTable.loyaltyPoints, createdAt: usersTable.createdAt });

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(user);
});

router.delete("/users/:id", requireAuth, async (req: AuthedRequest, res): Promise<void> => {
  const params = DeleteUserParams.safeParse(req.params);
  if (params.success && req.userId !== params.data.id && req.userRole !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  await db.delete(usersTable).where(eq(usersTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
