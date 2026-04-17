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

export default router;
