import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const JWT_SECRET = process.env.SESSION_SECRET || "tawsila-secret-2024";
if (!process.env.SESSION_SECRET && process.env.NODE_ENV === "production") {
  throw new Error("SESSION_SECRET environment variable is required in production");
}

export interface AuthedRequest extends Request {
  userId?: number;
  userName?: string;
  userRole?: string;
}

async function decodeUser(req: Request): Promise<{ id: number; name: string; role: string } | null> {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) return null;
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: number };
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, payload.userId))
      .limit(1);
    if (!user) return null;
    return { id: user.id, name: user.name, role: user.role };
  } catch {
    return null;
  }
}

/** Attaches userId/userName/userRole to req when a valid token is present; never blocks. */
export async function attachAuth(req: AuthedRequest, _res: Response, next: NextFunction): Promise<void> {
  const user = await decodeUser(req);
  if (user) {
    req.userId = user.id;
    req.userName = user.name;
    req.userRole = user.role;
  }
  next();
}

/** Rejects with 401 when no valid token is present. */
export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): Promise<void> {
  const user = await decodeUser(req);
  if (!user) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  req.userId = user.id;
  req.userName = user.name;
  req.userRole = user.role;
  next();
}

/** Rejects with 401/403 unless the authenticated user has one of the allowed roles. */
export function requireRole(...roles: string[]) {
  return async function (req: AuthedRequest, res: Response, next: NextFunction): Promise<void> {
    const user = await decodeUser(req);
    if (!user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    if (!roles.includes(user.role)) {
      res.status(403).json({ error: "Forbidden: insufficient permissions" });
      return;
    }
    req.userId = user.id;
    req.userName = user.name;
    req.userRole = user.role;
    next();
  };
}
