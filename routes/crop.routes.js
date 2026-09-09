import express from "express";
import { authenticate } from "../middleware/auth.js";
import { generateRecommendation, getRecommendationHistory } from "../controllers/cropRecommendationController.js";

const router = express.Router();
router.use(authenticate);

router.post("/", generateRecommendation);
router.get("/history", getRecommendationHistory);

export default router;
