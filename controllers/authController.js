import { validationResult } from "express-validator";
import User from "../models/User.js";
import { generateToken } from "../utils/generateToken.js";
import { PUBLIC_REGISTERABLE_ROLES } from "../utils/roles.js";

// @route   POST /api/auth/register
export const register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }

    const { name, email, password, role, phone, state, district } = req.body;

    if (!PUBLIC_REGISTERABLE_ROLES.includes(role)) {
      return res.status(400).json({ success: false, message: "Invalid role for self-registration." });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ success: false, message: "An account with this email already exists." });
    }

    const user = await User.create({
      name,
      email,
      password,
      role,
      phone: phone || "",
      location: { state: state || "", district: district || "" },
    });

    const token = generateToken(user._id);
    res.status(201).json({ success: true, token, user: user.toSafeObject() });
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/auth/login
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required." });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: "Invalid email or password." });
    }
    if (!user.isActive) {
      return res.status(403).json({ success: false, message: "This account has been deactivated." });
    }

    const token = generateToken(user._id);
    res.status(200).json({ success: true, token, user: user.toSafeObject() });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/auth/me
export const getMe = async (req, res, next) => {
  try {
    res.status(200).json({ success: true, token: null, user: req.user.toSafeObject() });
  } catch (error) {
    next(error);
  }
};
