
import { Router } from "express";
import mongoose from "mongoose";

import Attendance from "../models/Attendance.js";
import Enrollment from "../models/Enrollment.js";

import {
  createAttendanceSchema,
  updateAttendanceSchema,
} from "../validators/attendanceSchemas.js";

import {
  requireAuth,
  requireRole,
} from "../middleware/authMiddleware.js";

const router = Router();

router.use(requireAuth);

const managers = ["Administrator", "Principal"];

const viewers = [
  "Administrator",
  "Principal",
  "Teacher",
  "Accountant",
];

const attendancePopulation = [
  {
    path: "studentId",
    select: "admissionNumber firstName lastName status",
  },
  {
    path: "enrollmentId",
    select: "rollNumber status enrollmentDate",
  },
  {
    path: "academicYearId",
    select: "name startDate endDate status",
  },
  {
    path: "classId",
    select: "name gradeNumber status",
  },
  {
    path: "sectionId",
    select: "name status classId",
  },
  {
    path: "markedBy",
    select: "name email role",
  },
];

function sendValidationError(res, error) {
  return res.status(400).json({
    success: false,
    message: "Please correct the supplied fields.",
    errors: error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    })),
  });
}

function handleDatabaseError(error, res, next) {
  if (error.code === 11000) {
    return res.status(409).json({
      success: false,
      message:
        "Attendance for this student on this date already exists.",
    });
  }

  if (
    error.name === "ValidationError" ||
    error.name === "CastError"
  ) {
    return res.status(400).json({
      success: false,
      message: "Attendance data could not be saved.",
    });
  }

  return next(error);
}

function getStartOfDay(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  date.setUTCHours(0, 0, 0, 0);
  return date;
}

function getNextDay(value) {
  const date = getStartOfDay(value);

  if (!date) {
    return null;
  }

  date.setUTCDate(date.getUTCDate() + 1);
  return date;
}

function isValidId(id) {
  return mongoose.isValidObjectId(id);
}

async function validateEnrollment(input) {
  const enrollment = await Enrollment.findById(input.enrollmentId);

  if (!enrollment || enrollment.status !== "Active") {
    return {
      error: "The selected enrollment does not exist or is inactive.",
    };
  }

  const referencesMatch =
    enrollment.studentId.toString() === input.studentId &&
    enrollment.academicYearId.toString() === input.academicYearId &&
    enrollment.classId.toString() === input.classId &&
    enrollment.sectionId.toString() === input.sectionId;

  if (!referencesMatch) {
    return {
      error:
        "The student, academic year, class, and section must match the selected enrollment.",
    };
  }

  const date = getStartOfDay(input.date);

  if (!date) {
    return { error: "Please provide a valid attendance date." };
  }

  const enrollmentDate = getStartOfDay(enrollment.enrollmentDate);

  if (date < enrollmentDate) {
    return {
      error: "Attendance cannot be recorded before the enrollment date.",
    };
  }

  if (
    enrollment.transferDate &&
    date >= getStartOfDay(enrollment.transferDate)
  ) {
    return {
      error:
        "This enrollment was transferred on or before the selected date. Use the student's applicable enrollment.",
    };
  }

  return { enrollment, date };
}

// GET /api/attendance
// Filters: date, academicYearId, classId, sectionId, studentId, status
router.get(
  "/",
  requireRole(...viewers),
  async (req, res, next) => {
    try {
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(
        100,
        Math.max(1, Number(req.query.limit) || 20)
      );

      const filter = {};

      for (const field of [
        "academicYearId",
        "classId",
        "sectionId",
        "studentId",
      ]) {
        if (req.query[field] !== undefined) {
          if (!isValidId(req.query[field])) {
            return res.status(400).json({
              success: false,
              message: `Invalid ${field}.`,
            });
          }

          filter[field] = req.query[field];
        }
      }

      if (req.query.status !== undefined) {
        const allowedStatuses = [
          "Present",
          "Absent",
          "Late",
          "Excused",
        ];

        if (!allowedStatuses.includes(req.query.status)) {
          return res.status(400).json({
            success: false,
            message: "Invalid attendance status.",
          });
        }

        filter.status = req.query.status;
      }

      if (req.query.date !== undefined) {
        const start = getStartOfDay(req.query.date);
        const end = getNextDay(req.query.date);

        if (!start || !end) {
          return res.status(400).json({
            success: false,
            message: "Invalid attendance date.",
          });
        }

        filter.date = { $gte: start, $lt: end };
      }

      const [records, total] = await Promise.all([
        Attendance.find(filter)
          .populate(attendancePopulation)
          .sort({ date: -1, createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),

        Attendance.countDocuments(filter),
      ]);

      return res.json({
        success: true,
        data: records,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      return next(error);
    }
  }
);

// GET /api/attendance/:id
router.get(
  "/:id",
  requireRole(...viewers),
  async (req, res, next) => {
    try {
      if (!isValidId(req.params.id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid attendance ID.",
        });
      }

      const record = await Attendance.findById(req.params.id)
        .populate(attendancePopulation)
        .lean();

      if (!record) {
        return res.status(404).json({
          success: false,
          message: "Attendance record not found.",
        });
      }

      return res.json({
        success: true,
        data: record,
      });
    } catch (error) {
      return next(error);
    }
  }
);

// POST /api/attendance
router.post(
  "/",
  requireRole(...managers),
  async (req, res, next) => {
    try {
      const result = createAttendanceSchema.safeParse(req.body);

      if (!result.success) {
        return sendValidationError(res, result.error);
      }

      const input = result.data;

      const validation = await validateEnrollment(input);

      if (validation.error) {
        return res.status(400).json({
          success: false,
          message: validation.error,
        });
      }

      const record = await Attendance.create({
        ...input,
        date: validation.date,
        markedBy: req.user.id,
      });

      const populated = await Attendance.findById(record._id)
        .populate(attendancePopulation)
        .lean();

      return res.status(201).json({
        success: true,
        message: "Attendance marked successfully.",
        data: populated,
      });
    } catch (error) {
      return handleDatabaseError(error, res, next);
    }
  }
);

// PATCH /api/attendance/:id
router.patch(
  "/:id",
  requireRole(...managers),
  async (req, res, next) => {
    try {
      if (!isValidId(req.params.id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid attendance ID.",
        });
      }

      const result = updateAttendanceSchema.safeParse(req.body);

      if (!result.success) {
        return sendValidationError(res, result.error);
      }

      const record = await Attendance.findById(req.params.id);

      if (!record) {
        return res.status(404).json({
          success: false,
          message: "Attendance record not found.",
        });
      }

      if (result.data.status !== undefined) {
        record.status = result.data.status;
      }

      if (result.data.remarks !== undefined) {
        record.remarks = result.data.remarks;
      }

      await record.save();

      const populated = await Attendance.findById(record._id)
        .populate(attendancePopulation)
        .lean();

      return res.json({
        success: true,
        message: "Attendance updated successfully.",
        data: populated,
      });
    } catch (error) {
      return handleDatabaseError(error, res, next);
    }
  }
);

export default router;
