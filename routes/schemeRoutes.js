import express from "express";
import { getSchemes } from "../controllers/schemeController.js";
import { protect, authorize } from "../middleware/auth.js";
import { ROLES } from "../utils/roles.js";

const router = express.Router();

router.use(protect, authorize(ROLES.FARMER));

router.get("/", getSchemes);

export default router;
