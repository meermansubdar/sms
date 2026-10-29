
import { Router } from "express";
import mongoose from "mongoose";

import FeeStructure from "../models/FeeStructure.js";
import AcademicYear from "../models/AcademicYear.js";
import SchoolClass from "../models/SchoolClass.js";

import {
  createFeeStructureSchema,
  updateFeeStructureSchema,
  updateFeeStructureStatusSchema,
} from "../validators/feeStructureSchemas.js";

import {
  requireAuth,
  requireRole,
} from "../middleware/authMiddleware.js";

const router = Router();

router.use(requireAuth);

const managers = ["Administrator", "Principal"];
const viewers = ["Administrator", "Principal", "Teacher", "Accountant"];

function isValidId(id) {
  return mongoose.isValidObjectId(id);
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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

function normalizeInstallments(installments = []) {
  return installments.map((item) => ({
    ...item,
    dueDate: new Date(`${item.dueDate}T00:00:00.000Z`),
  }));
}

async function validateReferences(academicYearId, classId, res) {
  const [academicYear, schoolClass] = await Promise.all([
    AcademicYear.findById(academicYearId).lean(),
    SchoolClass.findById(classId).lean(),
  ]);

  if (!academicYear) {
    res.status(400).json({
      success: false,
      message: "The selected academic year does not exist.",
    });
    return false;
  }

  if (!schoolClass) {
    res.status(400).json({
      success: false,
      message: "The selected class does not exist.",
    });
    return false;
  }

  if (
    academicYear.status !== "Active" ||
    schoolClass.status !== "Active"
  ) {
    res.status(400).json({
      success: false,
      message: "Select an active academic year and active class.",
    });
    return false;
  }

  return true;
}

// GET /api/fee-structures?page=1&limit=20&search=annual&status=Active
// Optional filters: academicYearId, classId
router.get(
  "/",
  requireRole(...viewers),
  async (req, res, next) => {
    try {
      const page = Number(req.query.page ?? 1);
      const limit = Number(req.query.limit ?? 20);
      const search = String(req.query.search ?? "").trim();
      const status = String(req.query.status ?? "");
      const academicYearId = String(req.query.academicYearId ?? "");
      const classId = String(req.query.classId ?? "");

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

      if (
        (academicYearId && !isValidId(academicYearId)) ||
        (classId && !isValidId(classId))
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid academic year ID or class ID.",
        });
      }

      const filter = {};

      if (status) filter.status = status;
      if (academicYearId) filter.academicYearId = academicYearId;
      if (classId) filter.classId = classId;

      if (search) {
        filter.name = {
          $regex: escapeRegex(search),
          $options: "i",
        };
      }

      const [feeStructures, total] = await Promise.all([
        FeeStructure.find(filter)
          .populate("academicYearId")
          .populate("classId")
          .sort({ name: 1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        FeeStructure.countDocuments(filter),
      ]);

      return res.status(200).json({
        success: true,
        data: feeStructures,
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

// POST /api/fee-structures
router.post(
  "/",
  requireRole(...managers),
  async (req, res, next) => {
    try {
      const result = createFeeStructureSchema.safeParse(req.body);

      if (!result.success) {
        return sendValidationError(res, result.error);
      }

      const validReferences = await validateReferences(
        result.data.academicYearId,
        result.data.classId,
        res
      );

      if (!validReferences) return;

      const payload = {
        ...result.data,
        name: result.data.name.trim(),
        installments: normalizeInstallments(result.data.installments),
      };

      const feeStructure = await FeeStructure.create(payload);

      return res.status(201).json({
        success: true,
        message: "Fee structure created successfully.",
        data: feeStructure,
      });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message: "A fee structure with this name already exists for this class and academic year.",
        });
      }

      if (error.name === "ValidationError" || error.name === "CastError") {
        return res.status(400).json({
          success: false,
          message: "Fee structure data could not be saved.",
        });
      }

      next(error);
    }
  }
);

// GET /api/fee-structures/:id
router.get(
  "/:id",
  requireRole(...viewers),
  async (req, res, next) => {
    try {
      if (!isValidId(req.params.id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid fee structure ID.",
        });
      }

      const feeStructure = await FeeStructure.findById(req.params.id)
        .populate("academicYearId")
        .populate("classId")
        .lean();

      if (!feeStructure) {
        return res.status(404).json({
          success: false,
          message: "Fee structure not found.",
        });
      }

      return res.status(200).json({
        success: true,
        data: feeStructure,
      });
    } catch (error) {
      next(error);
    }
  }
);

// PATCH /api/fee-structures/:id
// Update the name, components, installments, or remarks.
router.patch(
  "/:id",
  requireRole(...managers),
  async (req, res, next) => {
    try {
      if (!isValidId(req.params.id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid fee structure ID.",
        });
      }

      const result = updateFeeStructureSchema.safeParse(req.body);

      if (!result.success) {
        return sendValidationError(res, result.error);
      }

      if (Object.keys(result.data).length === 0) {
        return res.status(400).json({
          success: false,
          message: "Provide at least one field to update.",
        });
      }

      const existing = await FeeStructure.findById(req.params.id);

      if (!existing) {
        return res.status(404).json({
          success: false,
          message: "Fee structure not found.",
        });
      }

      // Validate the complete resulting structure, not only the changed fields.
      const combined = {
        name: result.data.name ?? existing.name,
        academicYearId: String(existing.academicYearId),
        classId: String(existing.classId),
        currency: existing.currency,
        components: result.data.components ?? existing.components.map((item) => ({
          name: item.name,
          amount: item.amount,
        })),
        installments: result.data.installments ?? existing.installments.map((item) => ({
          name: item.name,
          amount: item.amount,
          dueDate: new Date(item.dueDate).toISOString().slice(0, 10),
        })),
        status: existing.status,
        remarks: result.data.remarks ?? existing.remarks,
      };

      const completeResult = createFeeStructureSchema.safeParse(combined);

      if (!completeResult.success) {
        return sendValidationError(res, completeResult.error);
      }

      existing.name = completeResult.data.name;
      existing.components = completeResult.data.components;
      existing.installments = normalizeInstallments(
        completeResult.data.installments
      );
      existing.remarks = completeResult.data.remarks;

      await existing.save();

      return res.status(200).json({
        success: true,
        message: "Fee structure updated successfully.",
        data: existing,
      });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message: "A fee structure with this name already exists for this class and academic year.",
        });
      }

      if (error.name === "ValidationError" || error.name === "CastError") {
        return res.status(400).json({
          success: false,
          message: "Fee structure data could not be saved.",
        });
      }

      next(error);
    }
  }
);

// PATCH /api/fee-structures/:id/status
router.patch(
  "/:id/status",
  requireRole(...managers),
  async (req, res, next) => {
    try {
      if (!isValidId(req.params.id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid fee structure ID.",
        });
      }

      const result = updateFeeStructureStatusSchema.safeParse(req.body);

      if (!result.success) {
        return sendValidationError(res, result.error);
      }

      const feeStructure = await FeeStructure.findByIdAndUpdate(
        req.params.id,
        { $set: { status: result.data.status } },
        { new: true, runValidators: true }
      );

      if (!feeStructure) {
        return res.status(404).json({
          success: false,
          message: "Fee structure not found.",
        });
      }

      return res.status(200).json({
        success: true,
        message: `Fee structure marked ${result.data.status.toLowerCase()}.`,
        data: feeStructure,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
