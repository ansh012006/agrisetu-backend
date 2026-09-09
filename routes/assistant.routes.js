import express from "express";
import { authenticate } from "../middleware/auth.js";
import { askAssistantHandler, contextualAskHandler } from "../controllers/assistantController.js";

const router = express.Router();
router.use(authenticate);

router.post("/ask", askAssistantHandler);
router.post("/contextual-ask", contextualAskHandler);

export default router;
