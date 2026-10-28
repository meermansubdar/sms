
import { Router } from "express";
import mongoose from "mongoose";
import Student from "../models/Student.js";
import {
  createStudentSchema,
  updateStudentSchema,
} from "../validators/studentSchemas.js";
import {
  requireAuth,
  requireRole
} from "../middleware/authMiddleware.js";

const router = Router();
router.use(requireAuth);

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

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

// GET /api/students?page=1&limit=20&search=ali&status=Active
router.get("/", requireRole("Administrator", "Principal", "Teacher","Accountant"), async (req, res, next) => {
  try {
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);
    const search = String(req.query.search ?? "").trim();
    const status = String(req.query.status ?? "");

    if (
      !Number.isInteger(page) ||
      page < 1 ||
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 100
    ) {
      return res.status(400).json({
        success: false,
        message: "Page must be positive and limit must be between 1 and 100.",
      });
    }

    if (status && !["Active", "Inactive"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be Active or Inactive.",
      });
    }

    const filter = {};

    if (status) {
      filter.status = status;
    }

    if (search) {
      const safeSearch = escapeRegex(search);

      filter.$or = [
        { admissionNumber: { $regex: safeSearch, $options: "i" } },
        { firstName: { $regex: safeSearch, $options: "i" } },
        { lastName: { $regex: safeSearch, $options: "i" } },
      ];
    }

    const [students, total] = await Promise.all([
      Student.find(filter)
        .sort({ lastName: 1, firstName: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Student.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: students,
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
});

// POST /api/students
router.post(
  "/",
  requireRole("Administrator", "Principal"),
  async (req, res, next) => {
  try {
    const result = createStudentSchema.safeParse(req.body);

    if (!result.success) {
      return sendValidationError(res, result.error);
    }

    const payload = {
      ...result.data,
      admissionNumber: result.data.admissionNumber.toUpperCase(),
    };

    const student = await Student.create(payload);

    return res.status(201).json({
      success: true,
      message: "Student registered successfully.",
      data: student,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "That admission number is already registered.",
      });
    }

    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Student data could not be saved.",
      });
    }

    next(error);
  }
});

// GET /api/students/:id
router.get("/:id", requireRole("Administrator", "Principal", "Teacher","Accountant"), async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid student ID.",
      });
    }

    const student = await Student.findById(req.params.id).lean();

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found.",
      });
    }

    return res.status(200).json({ success: true, data: student });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/students/:id
router.patch("/:id", requireRole("Administrator", "Principal"), async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid student ID.",
      });
    }

    const result = updateStudentSchema.safeParse(req.body);

    if (!result.success) {
      return sendValidationError(res, result.error);
    }

    const student = await Student.findByIdAndUpdate(
      req.params.id,
      { $set: result.data },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Student updated successfully.",
      data: student,
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/students/:id/status
router.patch("/:id/status", requireRole("Administrator", "Principal"), async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid student ID.",
      });
    }

    const statusSchema = mongoose.Schema.Types.String;
    const status = req.body?.status;

    if (!["Active", "Inactive"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be Active or Inactive.",
      });
    }

    const student = await Student.findByIdAndUpdate(
      req.params.id,
      { $set: { status } },
      { new: true, runValidators: true }
    );

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: `Student marked ${status.toLowerCase()}.`,
      data: student,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
