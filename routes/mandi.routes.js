import express from "express";
import { getPrices } from "../controllers/mandiController.js";

const router = express.Router();

router.get("/prices", getPrices);

export default router;
