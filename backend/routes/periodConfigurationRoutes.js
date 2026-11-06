import express from "express";
import mongoose from "mongoose";

import PeriodConfiguration from "../models/PeriodConfiguration.js";
import AcademicYear from "../models/AcademicYear.js";

import {
  createPeriodConfigurationSchema,
  updatePeriodConfigurationSchema
} from "../validators/periodConfigurationSchemas.js";

import {
  requireAuth,
  requireRole
} from "../middleware/authMiddleware.js";

const router = express.Router();

// All routes require authentication.
router.use(requireAuth);

// Roles allowed to view configurations.
const viewers = requireRole(
  "Administrator",
  "Principal",
  "Teacher",
  "Accountant"
);

// Roles allowed to create and manage configurations.
const managers = requireRole(
  "Administrator",
  "Principal"
);

// Validate request data using Zod.
const validateRequest = (schema, data, res) => {
  const result = schema.safeParse(data);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: "Validation failed.",
      errors: result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message
      }))
    });
  }

  return result.data;
};

// Check MongoDB duplicate key errors.
const isDuplicateKeyError = (error) => error.code === 11000;
const validateAcademicYear = async (academicYearId) => {
  if (!mongoose.Types.ObjectId.isValid(academicYearId)) {
    return {
      valid: false,
      message: "Invalid Academic Year ID."
    };
  }

  const academicYear = await AcademicYear.findById(academicYearId);

  if (!academicYear) {
    return {
      valid: false,
      message: "Academic Year not found."
    };
  }

  if (academicYear.status !== "Active") {
    return {
      valid: false,
      message: "Selected Academic Year is inactive."
    };
  }

  return {
    valid: true,
    academicYear
  };
};

// GET all Period Configurations
router.get("/", viewers, async (req, res, next) => {
  try {
    const { academicYearId, status } = req.query;

    const filter = {};

    if (academicYearId) {
      if (!mongoose.Types.ObjectId.isValid(academicYearId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid Academic Year ID."
        });
      }

      filter.academicYearId = academicYearId;
    }

    if (status) {
      if (!["Active", "Inactive"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid status."
        });
      }

      filter.status = status;
    }

    const configurations = await PeriodConfiguration.find(filter)
      .populate("academicYearId", "name startDate endDate status")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: configurations.length,
      data: configurations
    });
  } catch (error) {
    next(error);
  }
});

// POST create a Period Configuration
router.post("/", managers, async (req, res, next) => {
  try {
    const validatedData = validateRequest(
      createPeriodConfigurationSchema,
      req.body,
      res
    );

    if (res.headersSent) return;

    // Verify Academic Year
    const yearValidation = await validateAcademicYear(
      validatedData.academicYearId
    );

    if (!yearValidation.valid) {
      return res.status(400).json({
        success: false,
        message: yearValidation.message
      });
    }

    // Create configuration
    const configuration = await PeriodConfiguration.create(
      validatedData
    );

    // Return configuration with Academic Year details
    const populatedConfiguration = await PeriodConfiguration.findById(
      configuration._id
    ).populate("academicYearId", "name startDate endDate status");

    return res.status(201).json({
      success: true,
      message: "Period Configuration created successfully.",
      data: populatedConfiguration
    });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return res.status(409).json({
        success: false,
        message: "A Period Configuration already exists for this Academic Year."
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    next(error);
  }
});

// GET a single Period Configuration
router.get("/:id", viewers, async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Period Configuration ID."
      });
    }

    const configuration = await PeriodConfiguration.findById(id)
      .populate("academicYearId", "name startDate endDate status");

    if (!configuration) {
      return res.status(404).json({
        success: false,
        message: "Period Configuration not found."
      });
    }

    return res.status(200).json({
      success: true,
      data: configuration
    });
  } catch (error) {
    next(error);
  }
});

// PATCH update a Period Configuration
router.patch("/:id", managers, async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Period Configuration ID."
      });
    }

    const validatedData = validateRequest(
      updatePeriodConfigurationSchema,
      req.body,
      res
    );

    if (res.headersSent) return;

    const configuration = await PeriodConfiguration.findById(id);

    if (!configuration) {
      return res.status(404).json({
        success: false,
        message: "Period Configuration not found."
      });
    }

    // Check Academic Year before activating or changing its schedule.
    const changesSchedule = [
      "workingDays",
      "weekdayPeriods",
      "saturdayPeriods"
    ].some((field) =>
      Object.prototype.hasOwnProperty.call(validatedData, field)
    );

    const activating = validatedData.status === "Active";

    if (changesSchedule || activating) {
      const yearValidation = await validateAcademicYear(
        configuration.academicYearId.toString()
      );

      if (!yearValidation.valid) {
        return res.status(400).json({
          success: false,
          message: yearValidation.message
        });
      }
    }

    Object.assign(configuration, validatedData);

    await configuration.save();

    const updatedConfiguration = await PeriodConfiguration.findById(id)
      .populate("academicYearId", "name startDate endDate status");

    return res.status(200).json({
      success: true,
      message: "Period Configuration updated successfully.",
      data: updatedConfiguration
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    if (isDuplicateKeyError(error)) {
      return res.status(409).json({
        success: false,
        message: "A Period Configuration already exists for this Academic Year."
      });
    }

    next(error);
  }
});

export default router;