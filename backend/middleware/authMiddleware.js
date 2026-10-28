
import jwt from "jsonwebtoken";
import User from "../models/User.js";

export async function requireAuth(req, res, next) {
  try {
    const authorization = req.headers.authorization;

    if (
      !authorization ||
      !authorization.startsWith("Bearer ")
    ) {
      return res.status(401).json({
        success: false,
        message: "Authentication required."
      });
    }

    const token = authorization.slice(7).trim();

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required."
      });
    }

    const secret = process.env.JWT_SECRET;

    if (!secret || secret === "REPLACE_WITH_A_RANDOM_SECRET") {
      return res.status(500).json({
        success: false,
        message: "Authentication is not configured."
      });
    }

    const payload = jwt.verify(token, secret);

    if (
      typeof payload === "string" ||
      typeof payload.sub !== "string"
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token."
      });
    }

    const user = await User.findById(payload.sub).select(
      "name email role status"
    );

    if (!user || user.status !== "Active") {
      return res.status(401).json({
        success: false,
        message: "Account is unavailable."
      });
    }

    req.user = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role
    };

    next();
  } catch (error) {
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired authentication token."
      });
    }

    next(error);
  }
}

export function requireRole(...allowedRoles) {
  return function (req, res, next) {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required."
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission for this action."
      });
    }

    next();
  };
}
