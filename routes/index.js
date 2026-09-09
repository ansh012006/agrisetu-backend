import express from "express";
import authRoutes from "./auth.routes.js";
import landRoutes from "./land.routes.js";
import diseaseRoutes from "./disease.routes.js";
import cropRoutes from "./crop.routes.js";
import couponRoutes from "./coupon.routes.js";
import schemeRoutes from "./scheme.routes.js";
import weatherRoutes from "./weather.routes.js";
import mandiRoutes from "./mandi.routes.js";
import assistantRoutes from "./assistant.routes.js";
import marketplaceRoutes from "./marketplace.routes.js";
import machineryRoutes from "./machinery.routes.js";

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/lands", landRoutes);
router.use("/disease", diseaseRoutes);
router.use("/crop-recommendations", cropRoutes);
router.use("/coupons", couponRoutes);
router.use("/schemes", schemeRoutes);
router.use("/weather", weatherRoutes);
router.use("/mandi", mandiRoutes);
router.use("/assistant", assistantRoutes);
router.use("/marketplace", marketplaceRoutes);
router.use("/machinery", machineryRoutes);

router.get("/health", (_req, res) => {
 res.json({ success: true, message: "AgriSetu API is running", timestamp: new Date().toISOString() });
});

export default router;
