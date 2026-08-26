import { validationResult } from "express-validator";
import { generateCoupon, getMyCoupons, getMyLimits, redeemCoupon, lookupCoupon, EligibilityError } from "../services/couponService.js";

// @route   POST /api/coupons
export const createCoupon = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }

    const { landId, product, productCategory, quantityValue, crop } = req.body;
    const result = await generateCoupon({
      farmerId: req.user._id,
      landId,
      product,
      productCategory,
      quantityValue: Number(quantityValue),
      crop,
    });

    res.status(201).json({ success: true, coupon: result.coupon, remainingQuota: result.remainingQuota });
  } catch (error) {
    if (error instanceof EligibilityError) {
      return res.status(error.statusCode).json({ success: false, message: error.message, code: error.code });
    }
    next(error);
  }
};

// @route   GET /api/coupons/mine?status=
export const getMyCouponsHandler = async (req, res, next) => {
  try {
    const coupons = await getMyCoupons(req.user._id, req.query.status);
    res.status(200).json({ success: true, count: coupons.length, coupons });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/coupons/my-limits
export const getMyLimitsHandler = async (req, res, next) => {
  try {
    const limits = await getMyLimits(req.user._id);
    res.status(200).json({ success: true, limits });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/coupons/lookup/:code
// @access  dealer, agri_officer — preview a coupon before redeeming it
export const lookupCouponHandler = async (req, res, next) => {
  try {
    const coupon = await lookupCoupon(req.params.code);
    res.status(200).json({ success: true, coupon });
  } catch (error) {
    if (error instanceof EligibilityError) {
      return res.status(error.statusCode).json({ success: false, message: error.message, code: error.code });
    }
    next(error);
  }
};

// @route   POST /api/coupons/redeem
// @access  dealer, agri_officer
export const redeemCouponHandler = async (req, res, next) => {
  try {
    const { couponCode } = req.body;
    if (!couponCode) {
      return res.status(400).json({ success: false, message: "Coupon code is required." });
    }
    const coupon = await redeemCoupon(couponCode, req.user._id);
    res.status(200).json({ success: true, coupon });
  } catch (error) {
    if (error instanceof EligibilityError) {
      return res.status(error.statusCode).json({ success: false, message: error.message, code: error.code });
    }
    next(error);
  }
};
