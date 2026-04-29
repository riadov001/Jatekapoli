import express, { type Express, type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import pinoHttp from "pino-http";
import path from "path";
import { existsSync } from "fs";
import router from "./routes";
import { logger } from "./lib/logger";
import { attachAuth } from "./middlewares/auth";

const app: Express = express();

app.disable("x-powered-by");
app.set("trust proxy", 1);

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

app.use(compression());

// In production, restrict CORS to known origins. Set ALLOWED_ORIGINS as a
// comma-separated list (e.g. "https://app.example.com,https://admin.example.com").
// We also auto-allow Replit's hosted preview/deploy subdomains and same-origin
// (no Origin header — typical for native mobile apps that just send a host).
const isProd = process.env["NODE_ENV"] === "production";
const allowedOrigins: string[] = (process.env["ALLOWED_ORIGINS"] ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const corsOriginCheck: cors.CorsOptions["origin"] = (origin, callback) => {
  // Same-origin / native mobile / curl — no Origin header at all.
  if (!origin) return callback(null, true);
  // Dev: open CORS to make local browsers + multiple ports painless.
  if (!isProd) return callback(null, true);
  // Explicit allow-list match.
  if (allowedOrigins.includes(origin)) return callback(null, true);
  // Auto-allow the production custom domain (configured via EXPO_PUBLIC_DOMAIN).
  // Note: we deliberately do NOT wildcard *.replit.app / *.replit.dev — combined
  // with `credentials: true` that would trust any tenant on the shared platform.
  // For replit-hosted preview/deploy URLs, set ALLOWED_ORIGINS explicitly.
  try {
    const host = new URL(origin).hostname;
    const customHost = (process.env["EXPO_PUBLIC_DOMAIN"] ?? "").trim();
    if (customHost && host === customHost) {
      return callback(null, true);
    }
  } catch {
    // Fall through to reject below.
  }
  logger.warn({ origin }, "CORS: rejected origin");
  return callback(new Error(`CORS: origin not allowed: ${origin}`));
};

app.use(
  cors({
    origin: corsOriginCheck,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    maxAge: 86400,
  }),
);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

const apiLimiter = rateLimit({
  windowMs: 60_000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === "/healthz" || req.path.startsWith("/events"),
});

const authLimiter = rateLimit({
  windowMs: 15 * 60_000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/auth", authLimiter);
app.use("/api", apiLimiter);

app.use((req, res, next) => {
  req.setTimeout(30_000);
  res.setTimeout(30_000);
  next();
});

app.use("/api", attachAuth);
app.use("/api", router);

// ─── Production static file serving ──────────────────────────────────────────
// In production the API server also serves the built web apps:
//   /admin/* → backend-dashboard (built to artifacts/backend-dashboard/dist/public)
//   /*        → food-delivery    (built to artifacts/food-delivery/dist/public)
if (process.env.NODE_ENV === "production") {
  const dashboardDir = path.resolve(__dirname, "../../backend-dashboard/dist/public");
  const webDir = path.resolve(__dirname, "../../food-delivery/dist/public");

  if (existsSync(dashboardDir)) {
    app.use("/admin", express.static(dashboardDir, { index: "index.html" }));
    // SPA fallback for /admin/* routes
    app.get("/admin/*", (_req, res) => {
      res.sendFile(path.join(dashboardDir, "index.html"));
    });
    logger.info("Serving backend-dashboard static files from " + dashboardDir);
  } else {
    logger.warn("backend-dashboard/dist/public not found — run pnpm build first");
  }

  if (existsSync(webDir)) {
    app.use("/", express.static(webDir, { index: "index.html" }));
    // SPA fallback for all non-API routes
    app.get("*", (_req, res) => {
      res.sendFile(path.join(webDir, "index.html"));
    });
    logger.info("Serving food-delivery static files from " + webDir);
  } else {
    logger.warn("food-delivery/dist/public not found — run pnpm build first");
  }
} else {
  app.use((req, res) => {
    res.status(404).json({ error: "Not found", path: req.path });
  });
}

app.use((err: Error & { status?: number }, req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err, url: req.url, method: req.method }, "Unhandled error");
  if (res.headersSent) return;
  const status = err.status && err.status >= 400 && err.status < 600 ? err.status : 500;
  res.status(status).json({ error: status === 500 ? "Internal server error" : err.message });
});

export default app;
