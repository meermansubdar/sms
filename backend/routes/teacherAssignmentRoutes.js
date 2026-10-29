
import { Router } from "express";
import mongoose from "mongoose";

import TeacherAssignment from "../models/TeacherAssignment.js";
import User from "../models/User.js";
import Section from "../models/Section.js";
import AcademicYear from "../models/AcademicYear.js";

import {
  requireAuth,
  requireRole,
} from "../middleware/authMiddleware.js";

const router = Router();

router.use(requireAuth);

const managers = ["Administrator", "Principal"];

// Create a Teacher-to-section assignment.
router.post(
  "/",
  requireRole(...managers),
  async (req, res, next) => {
    try {
      const { teacherId, sectionId, academicYearId } = req.body;

      if (
        !mongoose.isValidObjectId(teacherId) ||
        !mongoose.isValidObjectId(sectionId) ||
        !mongoose.isValidObjectId(academicYearId)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Valid teacherId, sectionId, and academicYearId are required.",
        });
      }

      const [teacher, section, academicYear] = await Promise.all([
        User.findById(teacherId).select("role status name email"),
        Section.findById(sectionId).select("classId status name"),
        AcademicYear.findById(academicYearId).select("status name"),
      ]);

      if (!teacher || teacher.role !== "Teacher" || teacher.status !== "Active") {
        return res.status(400).json({
          success: false,
          message: "The selected user is not an active Teacher.",
        });
      }

      if (!section || section.status !== "Active") {
        return res.status(400).json({
          success: false,
          message: "The selected section is not active.",
        });
      }

      if (!academicYear || academicYear.status !== "Active") {
        return res.status(400).json({
          success: false,
          message: "The selected academic year is not active.",
        });
      }

      const assignment = await TeacherAssignment.create({
        teacherId,
        sectionId,
        academicYearId,
        status: "Active",
      });

      const safeAssignment = await TeacherAssignment.findById(
        assignment._id
      )
        .populate("teacherId", "name email role")
        .populate("sectionId", "name classId status")
        .populate("academicYearId", "name status")
        .lean();

      return res.status(201).json({
        success: true,
        message: "Teacher assignment created successfully.",
        data: safeAssignment,
      });
    } catch (error) {
      if (error?.code === 11000) {
        return res.status(409).json({
          success: false,
          message:
            "An active assignment already exists for this Teacher, section, and academic year.",
        });
      }

      next(error);
    }
  }
);

// List assignments. Optional filters: teacherId, sectionId, academicYearId, status.
router.get(
  "/",
  requireRole(...managers),
  async (req, res, next) => {
    try {
      const filter = {};

      for (const field of ["teacherId", "sectionId", "academicYearId"]) {
        if (req.query[field]) {
          if (!mongoose.isValidObjectId(req.query[field])) {
            return res.status(400).json({
              success: false,
              message: `Invalid ${field}.`,
            });
          }

          filter[field] = req.query[field];
        }
      }

      if (req.query.status) {
        if (!["Active", "Inactive"].includes(req.query.status)) {
          return res.status(400).json({
            success: false,
            message: "Status must be Active or Inactive.",
          });
        }

        filter.status = req.query.status;
      }

      const assignments = await TeacherAssignment.find(filter)
        .populate("teacherId", "name email role status")
        .populate("sectionId", "name classId status")
        .populate("academicYearId", "name status")
        .sort({ createdAt: -1 })
        .lean();

      return res.status(200).json({
        success: true,
        message: "Teacher assignments retrieved successfully.",
        data: assignments,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Activate or deactivate an assignment.
router.patch(
  "/:id/status",
  requireRole(...managers),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid teacher assignment ID.",
        });
      }

      if (!["Active", "Inactive"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Status must be Active or Inactive.",
        });
      }

      const assignment = await TeacherAssignment.findByIdAndUpdate(
        id,
        { $set: { status } },
        { new: true, runValidators: true }
      )
        .populate("teacherId", "name email role")
        .populate("sectionId", "name classId status")
        .populate("academicYearId", "name status")
        .lean();

      if (!assignment) {
        return res.status(404).json({
          success: false,
          message: "Teacher assignment not found.",
        });
      }

      return res.status(200).json({
        success: true,
        message: `Teacher assignment ${status.toLowerCase()} successfully.`,
        data: assignment,
      });
    } catch (error) {
      if (error?.code === 11000) {
        return res.status(409).json({
          success: false,
          message:
            "An active assignment already exists for this Teacher, section, and academic year.",
        });
      }

      next(error);
    }
  }
);

export default router;
