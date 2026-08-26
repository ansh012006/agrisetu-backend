import express from "express";
import { body } from "express-validator";
import { createCoupon, getMyCouponsHandler, getMyLimitsHandler, lookupCouponHandler, redeemCouponHandler } from "../controllers/couponController.js";
import { protect, authorize } from "../middleware/auth.js";
import { ROLES } from "../utils/roles.js";
import { PRODUCT_CATEGORIES } from "../models/InputSubsidyRule.js";

const router = express.Router();

router.use(protect);

// Farmer-facing: generate and view their own coupons.
router.get("/mine", authorize(ROLES.FARMER), getMyCouponsHandler);
router.get("/my-limits", authorize(ROLES.FARMER), getMyLimitsHandler);
router.post(
  "/",
  authorize(ROLES.FARMER),
  [
    body("landId").isMongoId().withMessage("A valid land is required"),
    body("product").trim().notEmpty().withMessage("Product is required"),
    body("productCategory").isIn(PRODUCT_CATEGORIES).withMessage("Select a valid product category"),
    body("quantityValue").isFloat({ gt: 0 }).withMessage("Quantity must be greater than 0"),
  ],
  createCoupon
);

// Dealer/officer-facing: look up and redeem a farmer's coupon at point of sale.
router.get("/lookup/:code", authorize(ROLES.DEALER, ROLES.AGRI_OFFICER), lookupCouponHandler);
router.post("/redeem", authorize(ROLES.DEALER, ROLES.AGRI_OFFICER), redeemCouponHandler);

export default router;
