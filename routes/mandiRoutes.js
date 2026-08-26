import express from "express";
import { getPrices } from "../controllers/mandiController.js";
import { protect, authorize } from "../middleware/auth.js";
import { ROLES } from "../utils/roles.js";

const router = express.Router();

router.use(protect, authorize(ROLES.FARMER));

router.get("/prices", getPrices);

export default router;
