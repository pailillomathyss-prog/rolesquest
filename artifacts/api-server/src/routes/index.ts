import { Router, type IRouter } from "express";
import healthRouter from "./health";
import rolesRouter from "./roles";
import inviteRouter from "./invite";

const router: IRouter = Router();

router.use(healthRouter);
router.use(rolesRouter);
router.use(inviteRouter);

export default router;
