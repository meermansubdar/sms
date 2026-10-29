
import { Router } from "express";
import User from "../models/User.js";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";

const router = Router();

router.use(requireAuth);

router.get(
  "/teachers",
  requireRole("Administrator", "Principal"),
  async (req, res, next) => {
    try {
      const teachers = await User.find({
        role: "Teacher",
        status: "Active",
      })
        .select("name email role status")
        .sort({ name: 1 })
        .lean();

      return res.status(200).json({
        success: true,
        data: teachers,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
