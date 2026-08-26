import jwt from "jsonwebtoken";

const parseExpiry = () => process.env.JWT_EXPIRES_IN || "7d";

export const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: parseExpiry(),
  });
};
