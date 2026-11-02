
import { Router } from "express";

import Subject from "../models/Subject.js";

import {
  requireAuth,
  requireRole,
} from "../middleware/authMiddleware.js";

const router = Router();

router.use(requireAuth);

const managers = ["Administrator", "Principal"];
const viewers = ["Administrator", "Principal", "Teacher", "Accountant"];

// Create a subject.
router.post(
  "/",
  requireRole(...managers),
  async (req, res, next) => {
    try {
      const { name, code, description } = req.body;

      if (
        typeof name !== "string" ||
        !name.trim() ||
        typeof code !== "string" ||
        !code.trim()
      ) {
        return res.status(400).json({
          success: false,
          message: "Subject name and code are required.",
        });
      }

      if (
        description !== undefined &&
        (typeof description !== "string" ||
          description.trim().length > 500)
      ) {
        return res.status(400).json({
          success: false,
          message: "Description must not exceed 500 characters.",
        });
      }

      const subject = await Subject.create({
        name: name.trim(),
        code: code.trim().toUpperCase(),
        description: description?.trim() || "",
      });

      return res.status(201).json({
        success: true,
        message: "Subject created successfully.",
        data: subject,
      });
    } catch (error) {
      if (error?.code === 11000) {
        return res.status(409).json({
          success: false,
          message: "Subject name or code already exists.",
        });
      }

      next(error);
    }
  }
);

// List subjects with optional search and status filters.
router.get(
  "/",
  requireRole(...viewers),
  async (req, res, next) => {
    try {
      const filter = {};

      if (req.query.status) {
        if (!["Active", "Inactive"].includes(req.query.status)) {
          return res.status(400).json({
            success: false,
            message: "Status must be Active or Inactive.",
          });
        }

        filter.status = req.query.status;
      }

      if (req.query.search) {
        const search = req.query.search.trim();

        if (search) {
          filter.$or = [
            { name: { $regex: search, $options: "i" } },
            { code: { $regex: search, $options: "i" } },
          ];
        }
      }

      const subjects = await Subject.find(filter)
        .sort({ name: 1 })
        .lean();

      return res.status(200).json({
        success: true,
        message: "Subjects retrieved successfully.",
        data: subjects,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get one subject.
router.get(
  "/:id",
  requireRole(...viewers),
  async (req, res, next) => {
    try {
      const subject = await Subject.findById(req.params.id).lean();

      if (!subject) {
        return res.status(404).json({
          success: false,
          message: "Subject not found.",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Subject retrieved successfully.",
        data: subject,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Update a subject.
router.patch(
  "/:id",
  requireRole(...managers),
  async (req, res, next) => {
    try {
      const { name, code, description } = req.body;

      const updates = {};

      if (name !== undefined) {
        if (typeof name !== "string" || !name.trim()) {
          return res.status(400).json({
            success: false,
            message: "Subject name cannot be empty.",
          });
        }

        updates.name = name.trim();
      }

      if (code !== undefined) {
        if (typeof code !== "string" || !code.trim()) {
          return res.status(400).json({
            success: false,
            message: "Subject code cannot be empty.",
          });
        }

        updates.code = code.trim().toUpperCase();
      }

      if (description !== undefined) {
        if (
          typeof description !== "string" ||
          description.trim().length > 500
        ) {
          return res.status(400).json({
            success: false,
            message: "Description must not exceed 500 characters.",
          });
        }

        updates.description = description.trim();
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({
          success: false,
          message: "At least one field must be provided.",
        });
      }

      const subject = await Subject.findByIdAndUpdate(
        req.params.id,
        { $set: updates },
        { new: true, runValidators: true }
      );

      if (!subject) {
        return res.status(404).json({
          success: false,
          message: "Subject not found.",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Subject updated successfully.",
        data: subject,
      });
    } catch (error) {
      if (error?.code === 11000) {
        return res.status(409).json({
          success: false,
          message: "Subject name or code already exists.",
        });
      }

      next(error);
    }
  }
);

// Activate or deactivate a subject.
router.patch(
  "/:id/status",
  requireRole(...managers),
  async (req, res, next) => {
    try {
      const { status } = req.body;

      if (!["Active", "Inactive"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Status must be Active or Inactive.",
        });
      }

      const subject = await Subject.findByIdAndUpdate(
        req.params.id,
        { $set: { status } },
        { new: true, runValidators: true }
      );

      if (!subject) {
        return res.status(404).json({
          success: false,
          message: "Subject not found.",
        });
      }

      return res.status(200).json({
        success: true,
        message: `Subject ${status.toLowerCase()} successfully.`,
        data: subject,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
