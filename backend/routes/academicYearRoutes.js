
import express from "express";
import mongoose from "mongoose";
import AcademicYear from "../models/AcademicYear.js";
import {
  createAcademicYearSchema,
  updateAcademicYearSchema
} from "../validators/academicYearSchemas.js";
import {
  requireAuth,
  requireRole
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(requireAuth);

const canManageAcademicYears = requireRole("Administrator", "Principal");

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

// GET /api/academic-years
// Administrator, Principal, Teacher and Accountant can view.
router.get(
  "/",
  requireRole("Administrator", "Principal", "Teacher", "Accountant"),
  async (req, res, next) => {
    try {
      const { search = "", status = "", page = "1", limit = "10" } = req.query;

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
        filter.name = { $regex: search.trim(), $options: "i" };
      }

      if (status) {
        filter.status = status;
      }

      const [academicYears, total] = await Promise.all([
        AcademicYear.find(filter)
          .sort({ startDate: -1, name: 1 })
          .skip((pageNumber - 1) * pageSize)
          .limit(pageSize)
          .lean(),
        AcademicYear.countDocuments(filter)
      ]);

      return res.json({
        data: academicYears,
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
  }
);

// POST /api/academic-years
// Only Administrator and Principal can create.
router.post("/", canManageAcademicYears, async (req, res, next) => {
  try {
    const validation = validateRequest(createAcademicYearSchema, req.body);

    if (!validation.success) {
      return res.status(400).json({
        message: "Validation failed.",
        errors: validation.errors
      });
    }

    const { name, startDate, endDate } = validation.data;

    const academicYear = await AcademicYear.create({
      name,
      startDate,
      endDate
    });

    return res.status(201).json({
      message: "Academic year created successfully.",
      data: academicYear
    });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return res.status(409).json({
        message: "An academic year with this name already exists."
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: "Academic year validation failed.",
        errors: Object.values(error.errors).map((item) => ({
          field: item.path,
          message: item.message
        }))
      });
    }

    next(error);
  }
});

// GET /api/academic-years/:id
router.get(
  "/:id",
  requireRole("Administrator", "Principal", "Teacher", "Accountant"),
  async (req, res, next) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({
          message: "Invalid academic year ID."
        });
      }

      const academicYear = await AcademicYear.findById(req.params.id);

      if (!academicYear) {
        return res.status(404).json({
          message: "Academic year not found."
        });
      }

      return res.json({ data: academicYear });
    } catch (error) {
      next(error);
    }
  }
);

// PATCH /api/academic-years/:id
// Only Administrator and Principal can edit.
router.patch("/:id", canManageAcademicYears, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid academic year ID."
      });
    }

    const validation = validateRequest(updateAcademicYearSchema, req.body);

    if (!validation.success) {
      return res.status(400).json({
        message: "Validation failed.",
        errors: validation.errors
      });
    }

    const academicYear = await AcademicYear.findById(req.params.id);

    if (!academicYear) {
      return res.status(404).json({
        message: "Academic year not found."
      });
    }

    const updates = validation.data;

    // Validate the complete record, including fields omitted from PATCH.
    const proposedName = updates.name ?? academicYear.name;
    const proposedStartDate = updates.startDate
      ? new Date(`${updates.startDate}T00:00:00.000Z`)
      : academicYear.startDate;
    const proposedEndDate = updates.endDate
      ? new Date(`${updates.endDate}T00:00:00.000Z`)
      : academicYear.endDate;

    if (proposedEndDate <= proposedStartDate) {
      return res.status(400).json({
        message: "End date must be later than start date."
      });
    }

    const expectedName =
      `${proposedStartDate.getUTCFullYear()}-${proposedEndDate.getUTCFullYear()}`;

    if (proposedName !== expectedName) {
      return res.status(400).json({
        message: "Name must match the years in the start and end dates."
      });
    }

    Object.assign(academicYear, updates);
    await academicYear.save();

    return res.json({
      message: "Academic year updated successfully.",
      data: academicYear
    });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return res.status(409).json({
        message: "An academic year with this name already exists."
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: "Academic year validation failed.",
        errors: Object.values(error.errors).map((item) => ({
          field: item.path,
          message: item.message
        }))
      });
    }

    next(error);
  }
});

// PATCH /api/academic-years/:id/status
// Deactivate/reactivate without deleting historical records.
router.patch(
  "/:id/status",
  canManageAcademicYears,
  async (req, res, next) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({
          message: "Invalid academic year ID."
        });
      }

      const status = req.body?.status;

      if (!["Active", "Inactive"].includes(status)) {
        return res.status(400).json({
          message: "Status must be Active or Inactive."
        });
      }

      const academicYear = await AcademicYear.findById(req.params.id);

      if (!academicYear) {
        return res.status(404).json({
          message: "Academic year not found."
        });
      }

      academicYear.status = status;
      await academicYear.save();

      return res.json({
        message: `Academic year ${status.toLowerCase()} successfully.`,
        data: academicYear
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
