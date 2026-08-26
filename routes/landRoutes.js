import express from "express";
import { getLands, createLand } from "../controllers/landController.js";
import { protect, authorize } from "../middleware/auth.js";
import { ROLES } from "../utils/roles.js";

const router = express.Router();

router.use(protect, authorize(ROLES.FARMER));

router.get("/", getLands);
router.post("/", createLand);

export default router;
