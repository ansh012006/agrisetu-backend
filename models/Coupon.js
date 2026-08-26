import mongoose from "mongoose";

export const COUPON_STATUSES = ["active", "redeemed", "expired", "cancelled"];
const DEFAULT_VALIDITY_DAYS = 30;

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I - avoids visual ambiguity

const generateCouponCode = () => {
  let code = "";
  for (let i = 0; i < 8; i++) code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return `AGRI-${code.slice(0, 4)}-${code.slice(4)}`;
};

const couponSchema = new mongoose.Schema(
  {
    farmer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    land: { type: mongoose.Schema.Types.ObjectId, ref: "Land", required: true },
    rule: { type: mongoose.Schema.Types.ObjectId, ref: "InputSubsidyRule", required: true },
    product: { type: String, required: true, trim: true },
    productCategory: { type: String, required: true, trim: true },
    quantity: {
      value: { type: Number, required: true, min: 0.01 },
      unit: { type: String, required: true },
    },
    couponCode: { type: String, required: true, unique: true, uppercase: true, trim: true },
    status: { type: String, enum: COUPON_STATUSES, default: "active" },
    expiresAt: { type: Date, required: true },
    redeemedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

couponSchema.index({ farmer: 1, createdAt: -1 });

couponSchema.statics.generateUniqueCode = async function generateUniqueCode() {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCouponCode();
    const exists = await this.exists({ couponCode: code });
    if (!exists) return code;
  }
  throw new Error("Could not generate a unique coupon code.");
};

couponSchema.statics.defaultExpiry = function defaultExpiry() {
  return new Date(Date.now() + (Number(process.env.COUPON_VALIDITY_DAYS) || DEFAULT_VALIDITY_DAYS) * 24 * 60 * 60 * 1000);
};

const Coupon = mongoose.model("Coupon", couponSchema);

export default Coupon;
