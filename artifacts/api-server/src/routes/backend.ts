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
type RoleKey = "super_admin" | "admin" | "manager" | "restaurant_owner" | "employee" | "customer" | "driver" | "other";

/**
 * All permission keys exposed to the dashboard. Super admins use this list when
 * customizing per-user (role='other') access.
 */
export const ALL_PERMISSION_KEYS: { key: string; label: string; group: string }[] = [
  { key: "dashboard.view", label: "Voir le tableau de bord", group: "Général" },
  { key: "orders.read", label: "Lire les commandes", group: "Commandes" },
  { key: "orders.write", label: "Modifier les commandes", group: "Commandes" },
  { key: "orders.update_status", label: "Changer le statut", group: "Commandes" },
  { key: "shops.read", label: "Lire les boutiques", group: "Boutiques" },
  { key: "shops.write", label: "Créer/éditer boutiques", group: "Boutiques" },
  { key: "shops.delete", label: "Supprimer boutiques", group: "Boutiques" },
  { key: "products.read", label: "Lire les produits", group: "Produits" },
  { key: "products.write", label: "Créer/éditer produits", group: "Produits" },
  { key: "products.delete", label: "Supprimer produits", group: "Produits" },
  { key: "categories.read", label: "Lire catégories", group: "Catégories" },
  { key: "categories.write", label: "Gérer catégories", group: "Catégories" },
  { key: "customers.read", label: "Lire les clients", group: "Clients" },
  { key: "customers.write", label: "Éditer/désactiver clients", group: "Clients" },
  { key: "deliverymen.read", label: "Lire les livreurs", group: "Livreurs" },
  { key: "deliverymen.write", label: "Gérer les livreurs", group: "Livreurs" },
  { key: "reviews.read", label: "Lire les avis", group: "Avis" },
  { key: "reviews.delete", label: "Supprimer des avis", group: "Avis" },
  { key: "staff.read", label: "Lire le personnel", group: "Personnel" },
  { key: "staff.write", label: "Gérer le personnel", group: "Personnel" },
  { key: "promotions.read", label: "Lire promotions", group: "Promotions" },
  { key: "promotions.write", label: "Gérer promotions", group: "Promotions" },
  { key: "wallets.read", label: "Lire les wallets", group: "Wallets" },
  { key: "wallets.write", label: "Gérer les wallets", group: "Wallets" },
  { key: "content.read", label: "Lire le contenu", group: "Contenu" },
  { key: "content.write", label: "Éditer le contenu", group: "Contenu" },
];

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
  {
    key: "other",
    label: "Personnalisé",
    description: "Accès personnalisés assignés par un super admin",
    permissions: [],
  },
];

const STAFF_ROLES: RoleKey[] = ["super_admin", "admin", "manager", "restaurant_owner", "employee", "other"];

function getPermissionsForRole(role: string): string[] {
  return ROLE_DEFS.find((r) => r.key === role)?.permissions ?? [];
}

/**
 * Compute the effective permission keys for a user, expanding wildcards.
 * For role='other', merges inheritedRoles + grants.
 */
function computeEffectivePermissions(role: string, custom: { inheritedRoles?: string[]; grants?: string[] } | null): string[] {
  if (role !== "other") return getPermissionsForRole(role);
  const inherited = (custom?.inheritedRoles ?? []).flatMap((r) => getPermissionsForRole(r));
  const grants = custom?.grants ?? [];
  return Array.from(new Set([...inherited, ...grants]));
}

/**
 * True when the user has the given permission. Supports '*' wildcard, group
 * wildcards like 'shops.*', and exact matches.
 */
function hasPermission(role: string, custom: { inheritedRoles?: string[]; grants?: string[] } | null, perm: string): boolean {
  const effective = computeEffectivePermissions(role, custom);
  if (effective.includes("*")) return true;
  if (effective.includes(perm)) return true;
  const [group] = perm.split(".");
  return effective.includes(`${group}.*`);
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

async function requireBackendUser(req: AuthedRequest, res: Response): Promise<{ id: number; role: string; assignedShopId: number | null; permissions: { inheritedRoles?: string[]; grants?: string[] } | null } | null> {
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
  const permissions = (user as { permissions?: unknown }).permissions as { inheritedRoles?: string[]; grants?: string[] } | null ?? null;
  return { id: user.id, role: user.role, assignedShopId: user.assignedShopId, permissions };
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
    permissions: computeEffectivePermissions(ctx.role, ctx.permissions),
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

const STAFF_FIELD_ALLOWLIST = ["name", "email", "password", "role", "phone", "isActive", "assignedShopId"] as const;
const ROLE_TRANSITIONS: Record<string, RoleKey[]> = {
  super_admin: ["super_admin", "admin", "manager", "restaurant_owner", "employee", "other"],
  admin: ["admin", "manager", "restaurant_owner", "employee"],
  restaurant_owner: ["employee"],
};

router.post("/backend/staff", requireAuth, async (req: AuthedRequest, res): Promise<void> => {
  const ctx = await requireBackendUser(req, res);
  if (!ctx) return;
  const allowedRolesForActor = ROLE_TRANSITIONS[ctx.role];
  if (!allowedRolesForActor) { res.status(403).json({ error: "Forbidden" }); return; }
  const { name, email, password, role, phone, assignedShopId } = req.body || {};
  if (!name || !email || !password || !role) { res.status(400).json({ error: "Missing fields" }); return; }
  if (!allowedRolesForActor.includes(role)) { res.status(403).json({ error: `Cannot create role '${role}'` }); return; }

  let finalShopId: number | null = assignedShopId ?? null;
  if (ctx.role === "restaurant_owner") {
    // merchant: must assign to one of their own shops
    const ownedShops = await getScopedShopIds(ctx.id, ctx.role, ctx.assignedShopId) ?? [];
    if (!finalShopId || !ownedShops.includes(finalShopId)) {
      res.status(403).json({ error: "assignedShopId must belong to your shops" }); return;
    }
  }
  const hashed = await bcrypt.hash(String(password), 10);
  const [u] = await db.insert(usersTable).values({
    name, email: String(email).toLowerCase().trim(), password: hashed, role, phone: phone || null, assignedShopId: finalShopId,
  }).returning();
  const { password: _, ...safe } = u;
  res.status(201).json(safe);
});

router.patch("/backend/staff/:id", requireAuth, async (req: AuthedRequest, res): Promise<void> => {
  const ctx = await requireBackendUser(req, res);
  if (!ctx) return;
  const allowedRolesForActor = ROLE_TRANSITIONS[ctx.role];
  if (!allowedRolesForActor) { res.status(403).json({ error: "Forbidden" }); return; }
  const id = Number(req.params.id);

  // Load target to enforce target-scope and role-boundary
  const [target] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
  if (!target) { res.status(404).json({ error: "Not found" }); return; }
  if (!allowedRolesForActor.includes(target.role as RoleKey) && target.role !== ctx.role) {
    res.status(403).json({ error: "Cannot modify this user" }); return;
  }
  if (ctx.role === "restaurant_owner") {
    const ownedShops = await getScopedShopIds(ctx.id, ctx.role, ctx.assignedShopId) ?? [];
    if (target.role !== "employee" || !target.assignedShopId || !ownedShops.includes(target.assignedShopId)) {
      res.status(403).json({ error: "Cannot modify this user" }); return;
    }
  }

  // Field allowlist
  const updates: any = {};
  for (const k of STAFF_FIELD_ALLOWLIST) {
    if (k in (req.body || {})) updates[k] = req.body[k];
  }
  if (updates.password) updates.password = await bcrypt.hash(String(updates.password), 10);
  if (updates.role && !allowedRolesForActor.includes(updates.role)) {
    res.status(403).json({ error: `Cannot assign role '${updates.role}'` }); return;
  }
  if (ctx.role === "restaurant_owner") {
    if (updates.role && updates.role !== "employee") { res.status(403).json({ error: "Forbidden" }); return; }
    if ("assignedShopId" in updates) {
      const ownedShops = await getScopedShopIds(ctx.id, ctx.role, ctx.assignedShopId) ?? [];
      if (!updates.assignedShopId || !ownedShops.includes(updates.assignedShopId)) {
        res.status(403).json({ error: "assignedShopId must belong to your shops" }); return;
      }
    }
  }

  const [u] = await db.update(usersTable).set(updates).where(eq(usersTable.id, id)).returning();
  if (!u) { res.status(404).json({ error: "Not found" }); return; }
  const { password: _, ...safe } = u;
  res.json(safe);
});

/**
 * Set custom permissions on a user (super_admin only). Forces role='other' and
 * stores `{ inheritedRoles, grants }`. Pass `permissions: null` to clear.
 */
router.patch("/backend/staff/:id/permissions", requireAuth, async (req: AuthedRequest, res): Promise<void> => {
  const ctx = await requireBackendUser(req, res);
  if (!ctx) return;
  if (ctx.role !== "super_admin") { res.status(403).json({ error: "Only super admins may customize permissions" }); return; }
  const id = Number(req.params.id);
  const [target] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
  if (!target) { res.status(404).json({ error: "Not found" }); return; }
  if (target.role === "super_admin") { res.status(403).json({ error: "Cannot customize a super admin" }); return; }

  const body = req.body || {};
  if (body.permissions === null) {
    // Clear: revert to baseRole or employee
    const baseRole: RoleKey = (body.baseRole as RoleKey) || "employee";
    const [u] = await db.update(usersTable).set({ role: baseRole, permissions: null }).where(eq(usersTable.id, id)).returning();
    const { password: _p, ...safe } = u!;
    res.json(safe);
    return;
  }
  const inheritedRoles: string[] = Array.isArray(body.inheritedRoles) ? body.inheritedRoles.filter((r: any) => typeof r === "string") : [];
  const grants: string[] = Array.isArray(body.grants) ? body.grants.filter((g: any) => typeof g === "string") : [];
  const allowedKeys = new Set(ALL_PERMISSION_KEYS.map((p) => p.key));
  const cleanGrants = grants.filter((g) => allowedKeys.has(g));
  const allowedInherit = ["admin", "manager", "restaurant_owner", "employee"];
  const cleanInherit = inheritedRoles.filter((r) => allowedInherit.includes(r));

  const [u] = await db.update(usersTable).set({
    role: "other",
    permissions: { inheritedRoles: cleanInherit, grants: cleanGrants },
  }).where(eq(usersTable.id, id)).returning();
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
  if (!["super_admin", "admin", "manager"].includes(ctx.role)) { res.status(403).json({ error: "Forbidden" }); return; }
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
  if (!["super_admin", "admin", "manager"].includes(ctx.role)) { res.status(403).json({ error: "Forbidden" }); return; }
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
  const scoped = await getScopedShopIds(ctx.id, ctx.role, ctx.assignedShopId);
  const baseQuery = db
    .select({ name: restaurantsTable.category, count: count() })
    .from(restaurantsTable)
    .groupBy(restaurantsTable.category);
  let rows;
  if (scoped !== null) {
    if (scoped.length === 0) { res.json([]); return; }
    rows = await baseQuery.where(inArray(restaurantsTable.id, scoped));
  } else {
    rows = await baseQuery;
  }
  res.json(rows.map((r) => ({ name: r.name, count: Number(r.count) })));
});

// ---------- Roles ----------
router.get("/backend/roles", requireAuth, async (req: AuthedRequest, res): Promise<void> => {
  const ctx = await requireBackendUser(req, res);
  if (!ctx) return;
  res.json(ROLE_DEFS);
});

/** All permission keys available to assign to a 'other' role user. */
router.get("/backend/permissions", requireAuth, async (req: AuthedRequest, res): Promise<void> => {
  const ctx = await requireBackendUser(req, res);
  if (!ctx) return;
  res.json(ALL_PERMISSION_KEYS);
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
