import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import apiRoutes from "./routes/index.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";

dotenv.config();

const app = express();

// Catch any unhandled promise rejections so the process doesn't die silently.
process.on("unhandledRejection", (err) => {
  console.error("[Server] Unhandled promise rejection:", err);
});

process.on("uncaughtException", (err) => {
  console.error("[Server] Uncaught exception:", err);
});

app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.get("/", (_req, res) => {
 res.json({ success: true, message: "AgriSetu Backend API", version: "1.0.0" });
});

app.use("/api", apiRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
 app.listen(PORT, () => {
  console.log(`[Server] Running on port ${PORT} (${process.env.NODE_ENV || "development"})`);
 });
});
