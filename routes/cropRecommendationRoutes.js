import express from "express";
import { generateRecommendation, getRecommendationHistory } from "../controllers/cropRecommendationController.js";
import { protect, authorize } from "../middleware/auth.js";
import { ROLES } from "../utils/roles.js";

const router = express.Router();

router.use(protect, authorize(ROLES.FARMER));

router.post("/", generateRecommendation);
router.get("/history", getRecommendationHistory);

export default router;
