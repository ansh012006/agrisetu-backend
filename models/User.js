import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
 {
 name: { type: String, required: true },
 email: { type: String, required: true, unique: true, lowercase: true, trim: true },
 password: { type: String, required: true, select: false },
  role: {
  type: String,
  enum: ["farmer", "dealer", "agri_officer", "admin", "buyer", "machinery_owner"],
  required: true,
  default: "farmer",
  },
 phone: { type: String, default: "" },
 location: {
 state: { type: String, default: "" },
 district: { type: String, default: "" },
 },
 isActive: { type: Boolean, default: true },
 },
 { timestamps: true }
);

userSchema.pre("save", async function (next) {
 if (!this.isModified("password")) return next();
 this.password = await bcrypt.hash(this.password, 12);
 next();
});

userSchema.methods.comparePassword = async function (candidate) {
 return await bcrypt.compare(candidate, this.password);
};

userSchema.methods.toSafeObject = function () {
 const obj = this.toObject();
 delete obj.password;
 delete obj.__v;
 return obj;
};

export default mongoose.model("User", userSchema);
