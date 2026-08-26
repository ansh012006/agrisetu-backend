import mongoose from "mongoose";

// One document per (farmer, rule) pair, tracking how much of that
// rule's entitlement has been reserved so far. The atomic guard in
// services/couponService.js reserveQuota() relies on this document's
// findOneAndUpdate filter+$inc happening as a single atomic operation -
// that's what makes concurrent coupon requests safe from
// over-allocation, not any application-level locking.
const ruleAllocationCounterSchema = new mongoose.Schema(
  {
    farmer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    rule: { type: mongoose.Schema.Types.ObjectId, ref: "InputSubsidyRule", required: true },
    totalAllocated: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

ruleAllocationCounterSchema.index({ farmer: 1, rule: 1 }, { unique: true });

const RuleAllocationCounter = mongoose.model("RuleAllocationCounter", ruleAllocationCounterSchema);

export default RuleAllocationCounter;
