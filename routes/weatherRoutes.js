import express from "express";
import { getWeather } from "../controllers/weatherController.js";
import { protect, authorize } from "../middleware/auth.js";
import { ROLES } from "../utils/roles.js";

const router = express.Router();

router.use(protect, authorize(ROLES.FARMER));

router.get("/", getWeather);

export default router;
