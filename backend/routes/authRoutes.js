
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";

import User from "../models/User.js";
import { loginSchema } from "../validators/authSchemas.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many login attempts. Try again later."
  }
});

router.post("/login", loginLimiter, async (req, res, next) => {
  try {
    const validation = loginSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid login details.",
        errors: validation.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message
        }))
      });
    }

    const email = validation.data.email.toLowerCase();

    const user = await User.findOne({ email }).select(
      "+passwordHash"
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password."
      });
    }

    const passwordMatches = await bcrypt.compare(
      validation.data.password,
      user.passwordHash
    );

    if (!passwordMatches || user.status !== "Active") {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password."
      });
    }

    const secret = process.env.JWT_SECRET;

    if (!secret || secret === "REPLACE_WITH_A_RANDOM_SECRET") {
      return res.status(500).json({
        success: false,
        message: "Authentication is not configured."
      });
    }

    const token = jwt.sign(
      {
        role: user.role
      },
      secret,
      {
        subject: user._id.toString(),
        expiresIn: process.env.JWT_EXPIRES_IN || "1h"
      }
    );

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
});

router.get("/me", requireAuth, (req, res) => {
  res.status(200).json({
    success: true,
    user: req.user
  });
});

export default router;
