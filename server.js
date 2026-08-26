import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import landRoutes from "./routes/landRoutes.js";
import diseaseRoutes from "./routes/diseaseRoutes.js";
import mandiRoutes from "./routes/mandiRoutes.js";
import couponRoutes from "./routes/couponRoutes.js";
import cropRecommendationRoutes from "./routes/cropRecommendationRoutes.js";
import weatherRoutes from "./routes/weatherRoutes.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";

dotenv.config();
connectDB();

const app = express();

app.use(helmet());
app.use(cors()); // open CORS - this backend is called by a native Android app, not a browser, so there's no origin to restrict to
app.use(express.json());
app.use(cookieParser());

const generalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300 });
const aiLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 30, message: { success: false, message: "Too many AI requests in a short time. Please wait a few minutes before trying again." } });

app.use("/api", generalLimiter);

app.get("/", (req, res) => {
  res.json({ success: true, message: "AgriSetu backend is running." });
});

app.use("/api/auth", authRoutes);
app.use("/api/lands", landRoutes);
app.use("/api/disease", aiLimiter, diseaseRoutes);
app.use("/api/mandi", mandiRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/crop-recommendations", aiLimiter, cropRecommendationRoutes);
app.use("/api/weather", weatherRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`[Server] Running on port ${PORT} in ${process.env.NODE_ENV || "development"} mode`);
});
