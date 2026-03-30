import { Router } from "express";
import { requireAdmin } from "../../middleware/requireAdmin.js";
import teamsRoutes from "./teams.js";
import assetsRoutes from "./assets.js";
import roundsRoutes from "./rounds.js";

const router = Router();

router.use(requireAdmin);
router.use(teamsRoutes);
router.use(assetsRoutes);
router.use(roundsRoutes);

export default router;
