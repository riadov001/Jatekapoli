import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import restaurantsRouter from "./restaurants";
import menuRouter from "./menu";
import ordersRouter from "./orders";
import usersRouter from "./users";
import driversRouter from "./drivers";
import reviewsRouter from "./reviews";
import rewardsRouter from "./rewards";
import adminRouter from "./admin";
import storageRouter from "./storage";
import favoritesRouter from "./favorites";
import addressesRouter from "./addresses";
import paymentMethodsRouter from "./paymentMethods";
import supportTicketsRouter from "./supportTickets";
import notificationPrefsRouter from "./notificationPrefs";
import userConsentsRouter from "./userConsents";
import quotesRouter from "./quotes";
import backendRouter from "./backend";
import { subscribe } from "../lib/sse";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(restaurantsRouter);
router.use(menuRouter);
router.use(ordersRouter);
router.use(usersRouter);
router.use(driversRouter);
router.use(reviewsRouter);
router.use(rewardsRouter);
router.use(adminRouter);
router.use(storageRouter);
router.use(favoritesRouter);
router.use(addressesRouter);
router.use(paymentMethodsRouter);
router.use(supportTicketsRouter);
router.use(notificationPrefsRouter);
router.use(userConsentsRouter);
router.use(quotesRouter);
router.use(backendRouter);

/**
 * SSE endpoint — clients subscribe to one or more channels:
 *   GET /api/events?channels=order:5,restaurant:2
 * Channels:
 *   order:{id}          → order status changes (for customer tracking)
 *   restaurant:{id}     → new incoming orders (for restaurant dashboard)
 *   available_orders    → orders ready for pickup (for driver app)
 *   driver:{id}         → location updates (for customer tracking live map)
 */
router.get("/events", requireAuth, (req, res) => {
  const raw = (req.query.channels as string) ?? "";
  const channels = raw.split(",").map((c) => c.trim()).filter(Boolean);
  if (channels.length === 0) {
    res.status(400).json({ error: "channels query param required" });
    return;
  }
  subscribe(req, res, channels);
});

export default router;
