import { verifyToken } from "../utils/generateToken.js";
import User from "../models/User.js";

export const authenticate = async (req, res, next) => {
 let token;
 const authHeader = req.headers.authorization;
 if (authHeader && authHeader.startsWith("Bearer ")) token = authHeader.split(" ")[1];
 if (!token) return res.status(401).json({ success: false, message: "Not authorized. Please log in." });

 const decoded = verifyToken(token);
 if (!decoded) return res.status(401).json({ success: false, message: "Invalid or expired token." });

 const user = await User.findById(decoded.userId).select("-password");
 if (!user || !user.isActive) return res.status(401).json({ success: false, message: "User not found or deactivated." });

 req.user = user;
 next();
};

export const optionalAuth = async (req, res, next) => {
 let token;
 const authHeader = req.headers.authorization;
 if (authHeader && authHeader.startsWith("Bearer ")) token = authHeader.split(" ")[1];
 if (!token) return next();

 const decoded = verifyToken(token);
 if (decoded) {
 const user = await User.findById(decoded.userId).select("-password");
 if (user) req.user = user;
 }
 next();
};
