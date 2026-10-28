
import { Router } from "express";
import mongoose from "mongoose";

import Enrollment from "../models/Enrollment.js";
import Student from "../models/Student.js";
import AcademicYear from "../models/AcademicYear.js";
import SchoolClass from "../models/SchoolClass.js";
import Section from "../models/Section.js";

import {
  createEnrollmentSchema,
  updateEnrollmentSchema,
  transferEnrollmentSchema,
} from "../validators/enrollmentSchemas.js";

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

function isValidId(id) {
  return mongoose.isValidObjectId(id);
}

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
        "A duplicate enrollment, or a duplicate roll number in this class and academic year, already exists.",
    });
  }

  if (
    error.name === "ValidationError" ||
    error.name === "CastError"
  ) {
    return res.status(400).json({
      success: false,
      message: "Enrollment data could not be saved.",
    });
  }

  return next(error);
}

const enrollmentPopulation = [
  {
    path: "studentId",
    select: "admissionNumber firstName lastName status",
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
];

async function validateActiveReferences({
  studentId,
  academicYearId,
  classId,
  sectionId,
}) {
  const [student, academicYear, schoolClass, section] =
    await Promise.all([
      Student.findById(studentId),
      AcademicYear.findById(academicYearId),
      SchoolClass.findById(classId),
      Section.findById(sectionId),
    ]);

  if (!student || student.status !== "Active") {
    return "The selected student does not exist or is inactive.";
  }

  if (!academicYear || academicYear.status !== "Active") {
    return "The selected academic year does not exist or is inactive.";
  }

  if (!schoolClass || schoolClass.status !== "Active") {
    return "The selected class does not exist or is inactive.";
  }

  if (!section || section.status !== "Active") {
    return "The selected section does not exist or is inactive.";
  }

  if (section.classId.toString() !== classId.toString()) {
    return "The selected section does not belong to the selected class.";
  }

  return null;
}

// GET /api/enrollments
// Supports pagination and filters.
router.get(
  "/",
  requireRole(...viewers),
  async (req, res, next) => {
    try {
      const page = Number(req.query.page ?? 1);
      const limit = Number(req.query.limit ?? 20);

      if (
        !Number.isInteger(page) ||
        page < 1 ||
        !Number.isInteger(limit) ||
        limit < 1 ||
        limit > 100
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Page must be positive and limit must be between 1 and 100.",
        });
      }

      const filter = {};

      for (const field of [
        "studentId",
        "academicYearId",
        "classId",
        "sectionId",
      ]) {
        if (req.query[field]) {
          if (!isValidId(req.query[field])) {
            return res.status(400).json({
              success: false,
              message: `Invalid ${field}.`,
            });
          }

          filter[field] = req.query[field];
        }
      }

      if (req.query.status) {
        const allowedStatuses = [
          "Active",
          "Transferred",
          "Completed",
          "Cancelled",
        ];

        if (!allowedStatuses.includes(req.query.status)) {
          return res.status(400).json({
            success: false,
            message: "Invalid enrollment status.",
          });
        }

        filter.status = req.query.status;
      }

      const [enrollments, total] = await Promise.all([
        Enrollment.find(filter)
          .populate(enrollmentPopulation)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),

        Enrollment.countDocuments(filter),
      ]);

      return res.status(200).json({
        success: true,
        data: enrollments,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/enrollments
// Create a new Active enrollment.
router.post(
  "/",
  requireRole(...managers),
  async (req, res, next) => {
    try {
      const result = createEnrollmentSchema.safeParse(req.body);

      if (!result.success) {
        return sendValidationError(res, result.error);
      }

      const payload = { ...result.data };

      // New enrollments must start as Active.
      if (payload.status && payload.status !== "Active") {
        return res.status(400).json({
          success: false,
          message:
            "New enrollments must have Active status.",
        });
      }

      payload.status = "Active";
      payload.transferDate = null;

      if (payload.enrollmentDate) {
        payload.enrollmentDate = new Date(
          payload.enrollmentDate
        );
      }

      const referenceError = await validateActiveReferences({
        studentId: payload.studentId,
        academicYearId: payload.academicYearId,
        classId: payload.classId,
        sectionId: payload.sectionId,
      });

      if (referenceError) {
        return res.status(400).json({
          success: false,
          message: referenceError,
        });
      }

      const enrollment = await Enrollment.create(payload);

      await enrollment.populate(enrollmentPopulation);

      return res.status(201).json({
        success: true,
        message: "Student enrolled successfully.",
        data: enrollment,
      });
    } catch (error) {
      handleDatabaseError(error, res, next);
    }
  }
);

// GET /api/enrollments/:id
router.get(
  "/:id",
  requireRole(...viewers),
  async (req, res, next) => {
    try {
      if (!isValidId(req.params.id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid enrollment ID.",
        });
      }

      const enrollment = await Enrollment.findById(
        req.params.id
      )
        .populate(enrollmentPopulation)
        .lean();

      if (!enrollment) {
        return res.status(404).json({
          success: false,
          message: "Enrollment not found.",
        });
      }

      return res.status(200).json({
        success: true,
        data: enrollment,
      });
    } catch (error) {
      next(error);
    }
  }
);

// PATCH /api/enrollments/:id
// Update permitted details without changing the student's
// identity, academic year, class, or section.
router.patch(
  "/:id",
  requireRole(...managers),
  async (req, res, next) => {
    try {
      if (!isValidId(req.params.id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid enrollment ID.",
        });
      }

      const result = updateEnrollmentSchema.safeParse(
        req.body
      );

      if (!result.success) {
        return sendValidationError(res, result.error);
      }

      const changes = { ...result.data };

      if (
        changes.status === "Transferred" ||
        changes.status === "Active" ||
        changes.transferDate !== undefined
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Use the transfer endpoint for transfers. Enrollment status cannot be reactivated or transferred through this update endpoint.",
        });
      }

      const existing = await Enrollment.findById(
        req.params.id
      );

      if (!existing) {
        return res.status(404).json({
          success: false,
          message: "Enrollment not found.",
        });
      }

      if (existing.status !== "Active") {
        return res.status(400).json({
          success: false,
          message:
            "Only Active enrollments can be edited.",
        });
      }

      if (changes.enrollmentDate) {
        changes.enrollmentDate = new Date(
          changes.enrollmentDate
        );
      }

      Object.assign(existing, changes);
      await existing.save();
      await existing.populate(enrollmentPopulation);

      return res.status(200).json({
        success: true,
        message: "Enrollment updated successfully.",
        data: existing,
      });
    } catch (error) {
      handleDatabaseError(error, res, next);
    }
  }
);

// PATCH /api/enrollments/:id/status
// Allowed transitions: Active -> Completed or Cancelled.
router.patch(
  "/:id/status",
  requireRole(...managers),
  async (req, res, next) => {
    try {
      if (!isValidId(req.params.id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid enrollment ID.",
        });
      }

      const { status } = req.body ?? {};

      if (!["Completed", "Cancelled"].includes(status)) {
        return res.status(400).json({
          success: false,
          message:
            "Status can only be changed to Completed or Cancelled through this endpoint.",
        });
      }

      const enrollment = await Enrollment.findById(
        req.params.id
      );

      if (!enrollment) {
        return res.status(404).json({
          success: false,
          message: "Enrollment not found.",
        });
      }

      if (enrollment.status !== "Active") {
        return res.status(400).json({
          success: false,
          message:
            "Only Active enrollments can be completed or cancelled.",
        });
      }

      enrollment.status = status;
      await enrollment.save();
      await enrollment.populate(enrollmentPopulation);

      return res.status(200).json({
        success: true,
        message: `Enrollment marked ${status.toLowerCase()}.`,
        data: enrollment,
      });
    } catch (error) {
      handleDatabaseError(error, res, next);
    }
  }
);

// PATCH /api/enrollments/:id/transfer
// Transfer an Active student to another class/section.
// The previous enrollment remains in the history.
router.patch(
  "/:id/transfer",
  requireRole(...managers),
  async (req, res, next) => {
    let previousEnrollment = null;
    let oldStatus = null;
    let oldTransferDate = null;

    try {
      if (!isValidId(req.params.id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid enrollment ID.",
        });
      }

      const result = transferEnrollmentSchema.safeParse(
        req.body
      );

      if (!result.success) {
        return sendValidationError(res, result.error);
      }

      const input = result.data;

      previousEnrollment = await Enrollment.findById(
        req.params.id
      );

      if (!previousEnrollment) {
        return res.status(404).json({
          success: false,
          message: "Enrollment not found.",
        });
      }

      if (previousEnrollment.status !== "Active") {
        return res.status(400).json({
          success: false,
          message:
            "Only Active enrollments can be transferred.",
        });
      }

      if (
        previousEnrollment.classId.toString() ===
          input.newClassId.toString() &&
        previousEnrollment.sectionId.toString() ===
          input.newSectionId.toString()
      ) {
        return res.status(400).json({
          success: false,
          message:
            "The destination must be a different class or section.",
        });
      }

      const referenceError = await validateActiveReferences({
        studentId: previousEnrollment.studentId,
        academicYearId: previousEnrollment.academicYearId,
        classId: input.newClassId,
        sectionId: input.newSectionId,
      });

      if (referenceError) {
        return res.status(400).json({
          success: false,
          message: referenceError,
        });
      }

      const transferDate = input.transferDate
        ? new Date(input.transferDate)
        : new Date();

      const newEnrollmentDate = input.enrollmentDate
        ? new Date(input.enrollmentDate)
        : transferDate;

      // Save the original values so we can restore the
      // previous enrollment if creating the new one fails.
      oldStatus = previousEnrollment.status;
      oldTransferDate = previousEnrollment.transferDate;

      previousEnrollment.status = "Transferred";
      previousEnrollment.transferDate = transferDate;
      await previousEnrollment.save();

      let newEnrollment;

      try {
        newEnrollment = await Enrollment.create({
          studentId: previousEnrollment.studentId,
          academicYearId: previousEnrollment.academicYearId,
          classId: input.newClassId,
          sectionId: input.newSectionId,
          rollNumber: input.newRollNumber,
          enrollmentDate: newEnrollmentDate,
          status: "Active",
          transferDate: null,
          remarks:
            input.remarks ??
            previousEnrollment.remarks ??
            "",
        });
      } catch (createError) {
        // Compensation if the new enrollment cannot be created.
        previousEnrollment.status = oldStatus;
        previousEnrollment.transferDate = oldTransferDate;
        await previousEnrollment.save();

        throw createError;
      }

      await newEnrollment.populate(enrollmentPopulation);

      return res.status(201).json({
        success: true,
        message:
          "Student transferred successfully. Previous enrollment history has been preserved.",
        data: {
          previousEnrollmentId: previousEnrollment._id,
          newEnrollment,
        },
      });
    } catch (error) {
      handleDatabaseError(error, res, next);
    }
  }
);

export default router;
