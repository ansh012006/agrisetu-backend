import express from "express";
import { askAssistantHandler } from "../controllers/assistantController.js";
import { protect, authorize } from "../middleware/auth.js";
import { ROLES } from "../utils/roles.js";

const router = express.Router();

router.use(protect, authorize(ROLES.FARMER));

router.post("/ask", askAssistantHandler);

export default router;
