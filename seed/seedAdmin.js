// Creates the first admin account, needed as `createdBy` context for
// seed:input-rules and useful generally. Run: node seed/seedAdmin.js
// Override defaults: ADMIN_EMAIL=you@x.com ADMIN_PASSWORD=Strong123 node seed/seedAdmin.js

import dotenv from "dotenv";
import connectDB from "../config/db.js";
import User from "../models/User.js";
import { ROLES } from "../utils/roles.js";

dotenv.config();

const ADMIN_NAME = process.env.ADMIN_NAME || "Platform Admin";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@agrisetu.local";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "AdminPass123";

const run = async () => {
  await connectDB();

  const existing = await User.findOne({ email: ADMIN_EMAIL });
  if (existing) {
    console.log(`Already exists, skipping: ${ADMIN_EMAIL}`);
  } else {
    await User.create({ name: ADMIN_NAME, email: ADMIN_EMAIL, password: ADMIN_PASSWORD, role: ROLES.ADMIN, isActive: true });
    console.log(`Created admin account: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD} (change the password after first login)`);
  }

  process.exit(0);
};

run().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
