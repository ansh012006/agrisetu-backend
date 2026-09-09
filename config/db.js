import mongoose from "mongoose";

const connectDB = async () => {
  try {
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI is not set in .env");
  // ponytail: dbName fallback covers Atlas URIs missing /dbname (defaults to test otherwise)
  const conn = await mongoose.connect(process.env.MONGO_URI, { dbName: "agrisetu", serverSelectionTimeoutMS: 10000 });
  console.log(`[MongoDB] Connected: ${conn.connection.host}/${conn.connection.name}`);
  } catch (error) {
  console.error("[MongoDB] Connection error:", error?.message || error);
  if (error?.reason) console.error("[MongoDB] Reason:", error.reason);
  console.error("[MongoDB] Fix: Atlas Network Access must allow your IP (0.0.0.0/0 for dev), user/pass correct, DB name present.");
  process.exit(1);
  }
};

export default connectDB;
