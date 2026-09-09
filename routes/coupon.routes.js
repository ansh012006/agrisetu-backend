import express from "express";
import { authenticate } from "../middleware/auth.js";
import { authorize } from "../utils/roles.js";
import {
 createCoupon,
 getMyCouponsHandler,
 getMyLimitsHandler,
 lookupCouponHandler,
 redeemCouponHandler,
 cancelCouponHandler,
} from "../controllers/couponController.js";

const router = express.Router();

router.use(authenticate);

router.post("/", authorize("farmer", "buyer", "machinery_owner"), createCoupon);
router.get("/mine", authorize("farmer", "buyer", "machinery_owner", "dealer"), getMyCouponsHandler);
router.get("/my-limits", authorize("farmer", "buyer", "machinery_owner", "dealer"), getMyLimitsHandler);

router.get("/lookup/:code", authorize("dealer", "agri_officer", "admin"), lookupCouponHandler);
router.post("/redeem", authorize("dealer", "agri_officer", "admin"), redeemCouponHandler);

router.patch("/:id/cancel", authorize("farmer", "buyer", "machinery_owner"), cancelCouponHandler);

export default router;
