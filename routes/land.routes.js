import express from "express";
import { getLands, createLand, updateLand, deleteLand } from "../controllers/landController.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();
router.use(authenticate);

router.get("/", getLands);
router.post("/", createLand);
router.patch("/:id", updateLand);
router.delete("/:id", deleteLand);

export default router;
