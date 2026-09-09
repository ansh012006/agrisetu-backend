import mongoose from "mongoose";

const landSchema = new mongoose.Schema(
 {
 farmer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
 landName: { type: String, required: true },
 area: {
 value: { type: Number, required: true },
 unit: { type: String, default: "acre" },
 },
 location: {
 state: { type: String, default: "" },
 district: { type: String, default: "" },
 village: { type: String, default: "" },
 },
 soilType: { type: String, default: "" },
 currentCrop: { type: String, default: "" },
 ownershipStatus: { type: String, default: "owned" },
 irrigationAvailable: { type: Boolean, default: false },
 },
 { timestamps: true }
);

export default mongoose.model("Land", landSchema);
