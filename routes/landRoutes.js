import express from "express";
import { getLands, createLand, updateLand, deleteLand } from "../controllers/landController.js";
import { protect, authorize } from "../middleware/auth.js";
import { ROLES } from "../utils/roles.js";

const router = express.Router();

router.use(protect, authorize(ROLES.FARMER));

router.get("/", getLands);
router.post("/", createLand);
router.patch("/:id", updateLand);
router.delete("/:id", deleteLand);

export default router;
