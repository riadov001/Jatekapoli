import { Router, type IRouter, type Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
  db,
  usersTable,
  restaurantsTable,
  ordersTable,
  menuItemsTable,
  driversTable,
  reviewsTable,
  dashboardTodosTable,
} from "@workspace/db";
import { eq, inArray, count, sum, gte, ilike, and, or, desc, sql } from "drizzle-orm";
import { requireAuth, type AuthedRequest } from "../middlewares/auth";

const router: IRouter = Router();

const JWT_SECRET = process.env.SESSION_SECRET || "jatek-secret-2024";

// ---------- Roles + permissions ----------
type RoleKey = "super_admin" | "admin" | "manager" | "restaurant_owner" | "employee" | "customer" | "driver";

const ROLE_DEFS: { key: RoleKey; label: string; description: string; permissions: string[] }[] = [
  {
    key: "super_admin",
    label: "Super Admin",
    description: "Accès total, gestion des admins et paramètres système",
    permissions: ["*"],
  },
  {
    key: "admin",
    label: "Admin",
    description: "Gestion complète sauf super-admins et paramètres système",
    permissions: [
      "dashboard.view",
      "orders.*", "shops.*", "products.*", "categories.*", "reviews.*",
      "customers.*", "staff.read", "staff.write", "deliverymen.*",
      "promotions.*", "content.*", "wallets.*",
    ],
  },
  {
    key: "manager",
    label: "Manager",
    description: "Lecture sur tout, écriture sur opérations courantes",
    permissions: [
      "dashboard.view",
      "orders.*", "shops.read", "shops.write", "products.read", "products.write",
      "categories.read", "reviews.*", "customers.read", "deliverymen.read",
      "content.read", "promotions.read",
    ],
  },
  {
    key: "restaurant_owner",
    label: "Commerçant",
    description: "Voit et édite uniquement ses propres shops + leurs produits/orders/reviews",
    permissions: [
      "dashboard.view",
      "orders.read.own", "orders.update_status.own",
      "shops.read.own", "shops.write.own",
      "products.*.own", "reviews.read.own", "staff.read.own", "staff.write.own",
    ],
  },
  {
    key: "employee",
    label: "Employé",
    description: "Assigné à un shop — gère ses commandes, lecture seule sur produits",
    permissions: [
      "dashboard.view",
      "orders.read.shop", "orders.update_status.shop",
      "products.read.shop", "shops.read.shop",
    ],
  },
  {
    key: "customer",
    label: "Client",
    description: "Pas d'accès au dashboard backend",
    permissions: [],
  },
  {
    key: "driver",
    label: "Livreur",
    description: "Pas d'accès au dashboard backend (utilise l'app livreur)",
    permissions: [],
  },
];

const STAFF_ROLES: RoleKey[] = ["super_admin", "admin", "manager", "restaurant_owner", "employee"];

function getPermissionsForRole(role: string): string[] {
  return ROLE_DEFS.find((r) => r.key === role)?.permissions ?? [];
}

/** Returns the list of shop IDs the user is scoped to, or null = no restriction. */
async function getScopedShopIds(userId: number, role: string, assignedShopId: number | null): Promise<number[] | null> {
  if (role === "restaurant_owner") {
    const rows = await db.select({ id: restaurantsTable.id }).from(restaurantsTable).where(eq(restaurantsTable.ownerId, userId));
    return rows.map((r) => r.id);
  }
  if (role === "employee") {
    return assignedShopId ? [assignedShopId] : [];
  }
  return null; // unrestricted
}

async function requireBackendUser(req: AuthedRequest, res: Response): Promise<{ id: number; role: string; assignedShopId: number | null } | null> {
  const userId = req.userId;
  const role = req.userRole;
  if (!userId || !role) {
    res.status(401).json({ error: "Authentication required" });
    return null;
  }
  if (!STAFF_ROLES.includes(role as RoleKey)) {
    res.status(403).json({ error: "Forbidden: dashboard access denied" });
    return null;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return null;
  }
  return { id: user.id, role: user.role, assignedShopId: user.assignedShopId };
}

// ---------- Auth ----------
router.post("/backend/login", async (req, res): Promise<void> => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, String(email).toLowerCase().trim())).limit(1);
  if (!user) { res.status(401).json({ error: "Invalid credentials" }); return; }
  if (!user.isActive) { res.status(403).json({ error: "Account disabled" }); return; }
  if (!STAFF_ROLES.includes(user.role as RoleKey)) {
    res.status(403).json({ error: "This account does not have backend access" });
    return;
  }
  const ok = await bcrypt.compare(String(password), user.password);
  if (!ok) { res.status(401).json({ error: "Invalid credentials" }); return; }
  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "30d" });
  const { password: _, ...safe } = user;
  res.json({ token, user: safe });
});

router.get("/backend/me", requireAuth, async (req: AuthedRequest, res): Promise<void> => {
  const ctx = await requireBackendUser(req, res);
  if (!ctx) return;
  const [u] = await db.select().from(usersTable).where(eq(usersTable.id, ctx.id)).limit(1);
  const { password: _p, ...safe } = u!;
  const scoped = await getScopedShopIds(ctx.id, ctx.role, ctx.assignedShopId);
  res.json({
    user: safe,
    permissions: getPermissionsForRole(ctx.role),
    scopedShopIds: scoped ?? [],
  });
});

// ---------- Dashboard ----------
router.get("/backend/dashboard", requireAuth, async (req: AuthedRequest, res): Promise<void> => {
  const ctx = await requireBackendUser(req, res);
  if (!ctx) return;
  const range = (req.query.range as string) || "month";
  const now = new Date();
  const start = new Date(now);
  if (range === "week") start.setDate(now.getDate() - 7);
  else if (range === "year") start.setFullYear(now.getFullYear() - 1);
  else start.setMonth(now.getMonth() - 1);

  const scopedShopIds = await getScopedShopIds(ctx.id, ctx.role, ctx.assignedShopId);
  const orderShopFilter = scopedShopIds !== null
    ? (scopedShopIds.length > 0 ? inArray(ordersTable.restaurantId, scopedShopIds) : sql`false`)
    : undefined;
  const productShopFilter = scopedShopIds !== null
    ? (scopedShopIds.length > 0 ? inArray(menuItemsTable.restaurantId, scopedShopIds) : sql`false`)
    : undefined;
  const reviewShopFilter = scopedShopIds !== null
    ? (scopedShopIds.length > 0 ? inArray(reviewsTable.restaurantId, scopedShopIds) : sql`false`)
    : undefined;

  const inProgressStatuses = ["pending", "accepted", "preparing", "ready", "picked_up"];

  const baseOrderWhere = (extra: any) => orderShopFilter ? and(orderShopFilter, extra) : extra;

  const [inProg] = await db.select({ c: count() }).from(ordersTable).where(baseOrderWhere(inArray(ordersTable.status, inProgressStatuses)));
  const [cancelled] = await db.select({ c: count() }).from(ordersTable).where(baseOrderWhere(eq(ordersTable.status, "cancelled")));
  const [delivered] = await db.select({ c: count() }).from(ordersTable).where(baseOrderWhere(and(eq(ordersTable.status, "delivered"), gte(ordersTable.createdAt, start))));
  const [outOfStock] = await db.select({ c: count() }).from(menuItemsTable).where(productShopFilter ? and(productShopFilter, eq(menuItemsTable.isAvailable, false)) : eq(menuItemsTable.isAvailable, false));
  const [totalProd] = await db.select({ c: count() }).from(menuItemsTable).where(productShopFilter ?? sql`true`);
  const [reviewCount] = await db.select({ c: count() }).from(reviewsTable).where(reviewShopFilter ?? sql`true`);

  const [earnedRow] = await db.select({ s: sum(ordersTable.total) }).from(ordersTable).where(baseOrderWhere(and(eq(ordersTable.status, "delivered"), gte(ordersTable.createdAt, start))));
  const [deliveryRow] = await db.select({ s: sum(ordersTable.deliveryFee) }).from(ordersTable).where(baseOrderWhere(and(eq(ordersTable.status, "delivered"), gte(ordersTable.createdAt, start))));
  const totalEarned = Number(earnedRow?.s || 0);
  const deliveryEarning = Number(deliveryRow?.s || 0);
  const totalOrderTax = +(totalEarned * 0.20).toFixed(2);
  const totalCommission = +(totalEarned * 0.15).toFixed(2);

  // Orders chart by day for the requested range
  const days = range === "week" ? 7 : range === "year" ? 12 : 30;
  const chart: { label: string; value: number }[] = [];
  if (range === "year") {
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const next = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const [r] = await db.select({ c: count() }).from(ordersTable).where(baseOrderWhere(and(gte(ordersTable.createdAt, d), sql`${ordersTable.createdAt} < ${next.toISOString()}`)));
      chart.push({ label: d.toLocaleString("en", { month: "short" }), value: Number(r?.c || 0) });
    }
  } else {
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now); d.setDate(now.getDate() - i); d.setHours(0, 0, 0, 0);
      const next = new Date(d); next.setDate(d.getDate() + 1);
      const [r] = await db.select({ c: count() }).from(ordersTable).where(baseOrderWhere(and(gte(ordersTable.createdAt, d), sql`${ordersTable.createdAt} < ${next.toISOString()}`)));
      chart.push({ label: `${d.getDate()}/${d.getMonth() + 1}`, value: Number(r?.c || 0) });
    }
  }

  res.json({
    inProgressOrders: Number(inProg?.c || 0),
    cancelledOrders: Number(cancelled?.c || 0),
    deliveredOrders: Number(delivered?.c || 0),
    outOfStockProducts: Number(outOfStock?.c || 0),
    totalProducts: Number(totalProd?.c || 0),
    orderReviews: Number(reviewCount?.c || 0),
    totalEarned,
    deliveryEarning,
    totalOrderTax,
    totalCommission,
    ordersChart: chart,
  });
});

// ---------- Orders ----------
router.get("/backend/orders", requireAuth, async (req: AuthedRequest, res): Promise<void> => {
  const ctx = await requireBackendUser(req, res);
  if (!ctx) return;
  const scoped = await getScopedShopIds(ctx.id, ctx.role, ctx.assignedShopId);
  const conds: any[] = [];
  if (scoped !== null) {
    if (scoped.length === 0) { res.json([]); return; }
    conds.push(inArray(ordersTable.restaurantId, scoped));
  }
  if (req.query.status && typeof req.query.status === "string" && req.query.status !== "all") {
    conds.push(eq(ordersTable.status, req.query.status));
  }
  if (req.query.shopId) {
    conds.push(eq(ordersTable.restaurantId, Number(req.query.shopId)));
  }
  if (req.query.search && typeof req.query.search === "string") {
    const s = `%${req.query.search}%`;
    conds.push(or(ilike(ordersTable.userName, s), ilike(ordersTable.restaurantName, s), ilike(ordersTable.reference, s))!);
  }
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const where = conds.length ? and(...conds) : undefined;
  const rows = await db.select().from(ordersTable).where(where).orderBy(desc(ordersTable.createdAt)).limit(limit);
  res.json(rows);
});

// ---------- Products ----------
router.get("/backend/products", requireAuth, async (req: AuthedRequest, res): Promise<void> => {
  const ctx = await requireBackendUser(req, res);
  if (!ctx) return;
  const scoped = await getScopedShopIds(ctx.id, ctx.role, ctx.assignedShopId);
  const conds: any[] = [];
  if (scoped !== null) {
    if (scoped.length === 0) { res.json([]); return; }
    conds.push(inArray(menuItemsTable.restaurantId, scoped));
  }
  if (req.query.shopId) conds.push(eq(menuItemsTable.restaurantId, Number(req.query.shopId)));
  if (req.query.status === "available") conds.push(eq(menuItemsTable.isAvailable, true));
  if (req.query.status === "unavailable") conds.push(eq(menuItemsTable.isAvailable, false));
  if (req.query.search && typeof req.query.search === "string") {
    conds.push(ilike(menuItemsTable.name, `%${req.query.search}%`));
  }
  const where = conds.length ? and(...conds) : undefined;
  const rows = await db.select().from(menuItemsTable).where(where).orderBy(desc(menuItemsTable.createdAt)).limit(200);
  res.json(rows);
});

// ---------- Shops ----------
router.get("/backend/shops", requireAuth, async (req: AuthedRequest, res): Promise<void> => {
  const ctx = await requireBackendUser(req, res);
  if (!ctx) return;
  const scoped = await getScopedShopIds(ctx.id, ctx.role, ctx.assignedShopId);
  const conds: any[] = [];
  if (scoped !== null) {
    if (scoped.length === 0) { res.json([]); return; }
    conds.push(inArray(restaurantsTable.id, scoped));
  }
  if (req.query.search && typeof req.query.search === "string") {
    conds.push(ilike(restaurantsTable.name, `%${req.query.search}%`));
  }
  const where = conds.length ? and(...conds) : undefined;
  const rows = await db.select().from(restaurantsTable).where(where).orderBy(desc(restaurantsTable.createdAt));
  res.json(rows);
});

// ---------- Staff ----------
router.get("/backend/staff", requireAuth, async (req: AuthedRequest, res): Promise<void> => {
  const ctx = await requireBackendUser(req, res);
  if (!ctx) return;
  if (!["super_admin", "admin", "restaurant_owner"].includes(ctx.role)) {
    res.status(403).json({ error: "Forbidden" }); return;
  }
  let rows;
  if (ctx.role === "restaurant_owner") {
    const myShops = await getScopedShopIds(ctx.id, ctx.role, ctx.assignedShopId);
    if (!myShops || myShops.length === 0) { res.json([]); return; }
    rows = await db.select().from(usersTable).where(and(eq(usersTable.role, "employee"), inArray(usersTable.assignedShopId, myShops)));
  } else {
    rows = await db.select().from(usersTable).where(inArray(usersTable.role, ["super_admin", "admin", "manager", "restaurant_owner", "employee"]));
  }
  res.json(rows.map((u) => { const { password, ...s } = u; return s; }));
});

router.post("/backend/staff", requireAuth, async (req: AuthedRequest, res): Promise<void> => {
  const ctx = await requireBackendUser(req, res);
  if (!ctx) return;
  if (!["super_admin", "admin", "restaurant_owner"].includes(ctx.role)) { res.status(403).json({ error: "Forbidden" }); return; }
  const { name, email, password, role, phone, assignedShopId } = req.body || {};
  if (!name || !email || !password || !role) { res.status(400).json({ error: "Missing fields" }); return; }
  if (ctx.role === "admin" && role === "super_admin") { res.status(403).json({ error: "Only super_admin can create super_admin" }); return; }
  if (ctx.role === "restaurant_owner" && role !== "employee") { res.status(403).json({ error: "Merchants can only create employees" }); return; }
  const hashed = await bcrypt.hash(String(password), 10);
  const [u] = await db.insert(usersTable).values({
    name, email: String(email).toLowerCase().trim(), password: hashed, role, phone: phone || null, assignedShopId: assignedShopId ?? null,
  }).returning();
  const { password: _, ...safe } = u;
  res.status(201).json(safe);
});

router.patch("/backend/staff/:id", requireAuth, async (req: AuthedRequest, res): Promise<void> => {
  const ctx = await requireBackendUser(req, res);
  if (!ctx) return;
  if (!["super_admin", "admin", "restaurant_owner"].includes(ctx.role)) { res.status(403).json({ error: "Forbidden" }); return; }
  const id = Number(req.params.id);
  const updates: any = { ...req.body };
  if (updates.password) updates.password = await bcrypt.hash(String(updates.password), 10);
  if (ctx.role !== "super_admin" && updates.role === "super_admin") { res.status(403).json({ error: "Cannot promote to super_admin" }); return; }
  const [u] = await db.update(usersTable).set(updates).where(eq(usersTable.id, id)).returning();
  if (!u) { res.status(404).json({ error: "Not found" }); return; }
  const { password: _, ...safe } = u;
  res.json(safe);
});

router.delete("/backend/staff/:id", requireAuth, async (req: AuthedRequest, res): Promise<void> => {
  const ctx = await requireBackendUser(req, res);
  if (!ctx) return;
  if (!["super_admin", "admin"].includes(ctx.role)) { res.status(403).json({ error: "Forbidden" }); return; }
  await db.delete(usersTable).where(eq(usersTable.id, Number(req.params.id)));
  res.status(204).end();
});

// ---------- Customers ----------
router.get("/backend/customers", requireAuth, async (req: AuthedRequest, res): Promise<void> => {
  const ctx = await requireBackendUser(req, res);
  if (!ctx) return;
  const conds: any[] = [eq(usersTable.role, "customer")];
  if (req.query.search && typeof req.query.search === "string") {
    const s = `%${req.query.search}%`;
    conds.push(or(ilike(usersTable.name, s), ilike(usersTable.email, s), ilike(usersTable.phone, s))!);
  }
  const rows = await db.select().from(usersTable).where(and(...conds)).orderBy(desc(usersTable.createdAt)).limit(200);
  res.json(rows.map((u) => { const { password, ...s } = u; return s; }));
});

// ---------- Deliverymen ----------
router.get("/backend/deliverymen", requireAuth, async (_req: AuthedRequest, res): Promise<void> => {
  const ctx = await requireBackendUser(_req, res);
  if (!ctx) return;
  const rows = await db.select().from(driversTable).orderBy(desc(driversTable.createdAt));
  res.json(rows);
});

// ---------- Reviews ----------
router.get("/backend/reviews", requireAuth, async (req: AuthedRequest, res): Promise<void> => {
  const ctx = await requireBackendUser(req, res);
  if (!ctx) return;
  const scoped = await getScopedShopIds(ctx.id, ctx.role, ctx.assignedShopId);
  const conds: any[] = [];
  if (scoped !== null) {
    if (scoped.length === 0) { res.json([]); return; }
    conds.push(inArray(reviewsTable.restaurantId, scoped));
  }
  if (req.query.shopId) conds.push(eq(reviewsTable.restaurantId, Number(req.query.shopId)));
  const where = conds.length ? and(...conds) : undefined;
  const rows = await db.select().from(reviewsTable).where(where).orderBy(desc(reviewsTable.createdAt)).limit(200);
  res.json(rows);
});

// ---------- Categories ----------
router.get("/backend/categories", requireAuth, async (req: AuthedRequest, res): Promise<void> => {
  const ctx = await requireBackendUser(req, res);
  if (!ctx) return;
  const rows = await db
    .select({ name: restaurantsTable.category, count: count() })
    .from(restaurantsTable)
    .groupBy(restaurantsTable.category);
  res.json(rows.map((r) => ({ name: r.name, count: Number(r.count) })));
});

// ---------- Roles ----------
router.get("/backend/roles", requireAuth, async (req: AuthedRequest, res): Promise<void> => {
  const ctx = await requireBackendUser(req, res);
  if (!ctx) return;
  res.json(ROLE_DEFS);
});

// ---------- Todos ----------
router.get("/backend/todos", requireAuth, async (req: AuthedRequest, res): Promise<void> => {
  const ctx = await requireBackendUser(req, res);
  if (!ctx) return;
  const rows = await db.select().from(dashboardTodosTable).where(eq(dashboardTodosTable.userId, ctx.id)).orderBy(desc(dashboardTodosTable.createdAt));
  res.json(rows);
});

router.post("/backend/todos", requireAuth, async (req: AuthedRequest, res): Promise<void> => {
  const ctx = await requireBackendUser(req, res);
  if (!ctx) return;
  const text = String(req.body?.text || "").trim();
  if (!text) { res.status(400).json({ error: "Text required" }); return; }
  const [t] = await db.insert(dashboardTodosTable).values({ userId: ctx.id, text }).returning();
  res.status(201).json(t);
});

router.patch("/backend/todos/:id", requireAuth, async (req: AuthedRequest, res): Promise<void> => {
  const ctx = await requireBackendUser(req, res);
  if (!ctx) return;
  const id = Number(req.params.id);
  const [t] = await db.update(dashboardTodosTable).set({ done: !!req.body?.done }).where(and(eq(dashboardTodosTable.id, id), eq(dashboardTodosTable.userId, ctx.id))).returning();
  if (!t) { res.status(404).json({ error: "Not found" }); return; }
  res.json(t);
});

router.delete("/backend/todos/:id", requireAuth, async (req: AuthedRequest, res): Promise<void> => {
  const ctx = await requireBackendUser(req, res);
  if (!ctx) return;
  await db.delete(dashboardTodosTable).where(and(eq(dashboardTodosTable.id, Number(req.params.id)), eq(dashboardTodosTable.userId, ctx.id)));
  res.status(204).end();
});

export default router;
