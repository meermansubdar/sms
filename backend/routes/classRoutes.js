
import express from "express";
import mongoose from "mongoose";
import SchoolClass from "../models/SchoolClass.js";
import {
  createClassSchema,
  updateClassSchema
} from "../validators/classSchemas.js";
import {
  requireAuth,
  requireRole
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(requireAuth);

const canManageClasses = requireRole("Administrator", "Principal");
const canViewClasses = requireRole(
  "Administrator",
  "Principal",
  "Teacher",
  "Accountant"
);

function validateRequest(schema, data) {
  const result = schema.safeParse(data);

  if (!result.success) {
    return {
      success: false,
      errors: result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message
      }))
    };
  }

  return { success: true, data: result.data };
}

function isDuplicateKeyError(error) {
  return error?.code === 11000;
}

// GET /api/classes
router.get("/", canViewClasses, async (req, res, next) => {
  try {
    const {
      search = "",
      status = "",
      page = "1",
      limit = "10"
    } = req.query;

    const pageNumber = Number.parseInt(page, 10);
    const pageSize = Number.parseInt(limit, 10);

    if (
      !Number.isInteger(pageNumber) ||
      pageNumber < 1 ||
      !Number.isInteger(pageSize) ||
      pageSize < 1 ||
      pageSize > 100
    ) {
      return res.status(400).json({
        message: "Page must be at least 1 and limit must be between 1 and 100."
      });
    }

    if (status && !["Active", "Inactive"].includes(status)) {
      return res.status(400).json({
        message: "Status must be Active or Inactive."
      });
    }

    const filter = {};

    if (search.trim()) {
      const escapedSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.name = { $regex: escapedSearch, $options: "i" };
    }

    if (status) {
      filter.status = status;
    }

    const [classes, total] = await Promise.all([
      SchoolClass.find(filter)
        .sort({ gradeNumber: 1 })
        .skip((pageNumber - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      SchoolClass.countDocuments(filter)
    ]);

    return res.json({
      data: classes,
      pagination: {
        page: pageNumber,
        limit: pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/classes
router.post("/", canManageClasses, async (req, res, next) => {
  try {
    const validation = validateRequest(createClassSchema, req.body);

    if (!validation.success) {
      return res.status(400).json({
        message: "Validation failed.",
        errors: validation.errors
      });
    }

    const schoolClass = await SchoolClass.create(validation.data);

    return res.status(201).json({
      message: "Class created successfully.",
      data: schoolClass
    });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return res.status(409).json({
        message: "A class with this name or grade number already exists."
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: "Class validation failed.",
        errors: Object.values(error.errors).map((item) => ({
          field: item.path,
          message: item.message
        }))
      });
    }

    next(error);
  }
});

// GET /api/classes/:id
router.get("/:id", canViewClasses, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid class ID."
      });
    }

    const schoolClass = await SchoolClass.findById(req.params.id);

    if (!schoolClass) {
      return res.status(404).json({
        message: "Class not found."
      });
    }

    return res.json({ data: schoolClass });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/classes/:id
router.patch("/:id", canManageClasses, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid class ID."
      });
    }

    const validation = validateRequest(updateClassSchema, req.body);

    if (!validation.success) {
      return res.status(400).json({
        message: "Validation failed.",
        errors: validation.errors
      });
    }

    const schoolClass = await SchoolClass.findById(req.params.id);

    if (!schoolClass) {
      return res.status(404).json({
        message: "Class not found."
      });
    }

    const updates = validation.data;
    const proposedName = updates.name ?? schoolClass.name;
    const proposedGrade = updates.gradeNumber ?? schoolClass.gradeNumber;

    if (proposedName !== `Class ${proposedGrade}`) {
      return res.status(400).json({
        message: "Class name must match the grade number."
      });
    }

    Object.assign(schoolClass, updates);
    await schoolClass.save();

    return res.json({
      message: "Class updated successfully.",
      data: schoolClass
    });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return res.status(409).json({
        message: "A class with this name or grade number already exists."
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: "Class validation failed.",
        errors: Object.values(error.errors).map((item) => ({
          field: item.path,
          message: item.message
        }))
      });
    }

    next(error);
  }
});

// PATCH /api/classes/:id/status
router.patch("/:id/status", canManageClasses, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid class ID."
      });
    }

    const status = req.body?.status;

    if (!["Active", "Inactive"].includes(status)) {
      return res.status(400).json({
        message: "Status must be Active or Inactive."
      });
    }

    const schoolClass = await SchoolClass.findById(req.params.id);

    if (!schoolClass) {
      return res.status(404).json({
        message: "Class not found."
      });
    }

    schoolClass.status = status;
    await schoolClass.save();

    return res.json({
      message: `Class ${status.toLowerCase()} successfully.`,
      data: schoolClass
    });
  } catch (error) {
    next(error);
  }
});

export default router;
