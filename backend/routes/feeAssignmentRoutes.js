
import { Router } from "express";
import mongoose from "mongoose";
import FeeAssignment from "../models/FeeAssignment.js";
import Enrollment from "../models/Enrollment.js";
import FeeStructure from "../models/FeeStructure.js";
import {
  createFeeAssignmentSchema,
  updateFeeAssignmentStatusSchema,
} from "../validators/feeAssignmentSchemas.js";
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

function toPaise(amount) {
  return Math.round(Number(amount) * 100);
}

function fromPaise(amount) {
  return amount / 100;
}

// Distribute a concession proportionally without losing paise
// because of rounding. The returned amounts are integer paise.
function distributeConcession(items, totalDiscountPaise, getAmount) {
  const amounts = items.map((item) => toPaise(getAmount(item)));
  const totalPaise = amounts.reduce((sum, amount) => sum + amount, 0);

  if (totalPaise === 0 || totalDiscountPaise === 0) {
    return amounts.map(() => 0);
  }

  const shares = amounts.map((amount, index) => {
    const exactShare = (amount * totalDiscountPaise) / totalPaise;
    return {
      index,
      amount: Math.floor(exactShare),
      remainder: exactShare - Math.floor(exactShare),
    };
  });

  let remaining =
    totalDiscountPaise -
    shares.reduce((sum, share) => sum + share.amount, 0);

  shares
    .slice()
    .sort((a, b) => b.remainder - a.remainder)
    .forEach((share) => {
      if (remaining > 0) {
        shares[share.index].amount += 1;
        remaining -= 1;
      }
    });

  return shares.map((share) => share.amount);
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

function handleDatabaseError(res, error) {
  if (error?.code === 11000) {
    return res.status(409).json({
      success: false,
      message: "An active fee assignment already exists for this enrollment.",
    });
  }

  if (error?.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: "The fee assignment could not be saved.",
      errors: Object.values(error.errors).map((item) => ({
        field: item.path,
        message: item.message,
      })),
    });
  }

  return null;
}

// GET /api/fee-assignments
// List and filter assignments.
router.get(
  "/",
  requireRole(...viewers),
  async (req, res, next) => {
    try {
      const page = Number.parseInt(req.query.page ?? "1", 10);
      const limit = Number.parseInt(req.query.limit ?? "10", 10);

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

      const filter = {};

      for (const field of [
        "studentId",
        "enrollmentId",
        "academicYearId",
        "classId",
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
        if (!["Active", "Cancelled"].includes(req.query.status)) {
          return res.status(400).json({
            success: false,
            message: "Status must be Active or Cancelled.",
          });
        }
        filter.status = req.query.status;
      }

      const skip = (page - 1) * limit;

      const [assignments, total] = await Promise.all([
        FeeAssignment.find(filter)
          .populate("studentId")
          .populate("enrollmentId")
          .populate("feeStructureId")
          .populate("academicYearId")
          .populate("classId")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        FeeAssignment.countDocuments(filter),
      ]);

      return res.status(200).json({
        success: true,
        message: "Fee assignments retrieved successfully.",
        data: assignments,
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

// POST /api/fee-assignments
// Assign a fee structure to an active student enrollment.
router.post(
  "/",
  requireRole(...managers),
  async (req, res, next) => {
    try {
      const result = createFeeAssignmentSchema.safeParse(req.body);

      if (!result.success) {
        return sendValidationError(res, result.error);
      }

      const {
        enrollmentId,
        feeStructureId,
        concessionType,
        concessionValue,
        remarks,
      } = result.data;

      const [enrollment, feeStructure] = await Promise.all([
        Enrollment.findById(enrollmentId).lean(),
        FeeStructure.findById(feeStructureId).lean(),
      ]);

      if (!enrollment) {
        return res.status(404).json({
          success: false,
          message: "The selected enrollment was not found.",
        });
      }

      if (enrollment.status !== "Active") {
        return res.status(400).json({
          success: false,
          message: "Fees can only be assigned to an active enrollment.",
        });
      }

      if (!feeStructure) {
        return res.status(404).json({
          success: false,
          message: "The selected fee structure was not found.",
        });
      }

      if (feeStructure.status !== "Active") {
        return res.status(400).json({
          success: false,
          message: "The selected fee structure is inactive.",
        });
      }

      if (
        String(enrollment.academicYearId) !==
          String(feeStructure.academicYearId) ||
        String(enrollment.classId) !== String(feeStructure.classId)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "The fee structure must match the enrollment's academic year and class.",
        });
      }

      const originalTotalPaise = feeStructure.components.reduce(
        (sum, component) => sum + toPaise(component.amount),
        0
      );

      const installmentTotalPaise = feeStructure.installments.reduce(
        (sum, installment) => sum + toPaise(installment.amount),
        0
      );

      if (originalTotalPaise !== installmentTotalPaise) {
        return res.status(400).json({
          success: false,
          message:
            "The fee structure component and installment totals do not match.",
        });
      }

      let concessionTotalPaise = 0;

      if (concessionType === "Fixed") {
        concessionTotalPaise = toPaise(concessionValue);

        if (concessionTotalPaise > originalTotalPaise) {
          return res.status(400).json({
            success: false,
            message: "The concession cannot exceed the total fee.",
          });
        }
      } else if (concessionType === "Percentage") {
        concessionTotalPaise = Math.round(
          (originalTotalPaise * concessionValue) / 100
        );
      }

      const componentDiscounts = distributeConcession(
        feeStructure.components,
        concessionTotalPaise,
        (item) => item.amount
      );

      const installmentDiscounts = distributeConcession(
        feeStructure.installments,
        concessionTotalPaise,
        (item) => item.amount
      );

      const components = feeStructure.components.map((component, index) => {
        const originalAmountPaise = toPaise(component.amount);
        const concessionAmountPaise = componentDiscounts[index];

        return {
          name: component.name,
          originalAmount: fromPaise(originalAmountPaise),
          concessionAmount: fromPaise(concessionAmountPaise),
          finalAmount: fromPaise(
            originalAmountPaise - concessionAmountPaise
          ),
        };
      });

      const installments = feeStructure.installments.map(
        (installment, index) => {
          const originalAmountPaise = toPaise(installment.amount);
          const concessionAmountPaise = installmentDiscounts[index];

          return {
            name: installment.name,
            originalAmount: fromPaise(originalAmountPaise),
            concessionAmount: fromPaise(concessionAmountPaise),
            amountDue: fromPaise(
              originalAmountPaise - concessionAmountPaise
            ),
            dueDate: installment.dueDate,
          };
        }
      );

      const assignment = await FeeAssignment.create({
        studentId: enrollment.studentId,
        enrollmentId: enrollment._id,
        feeStructureId: feeStructure._id,
        academicYearId: enrollment.academicYearId,
        classId: enrollment.classId,
        currency: "INR",
        components,
        installments,
        originalTotal: fromPaise(originalTotalPaise),
        concessionType,
        concessionValue,
        concessionTotal: fromPaise(concessionTotalPaise),
        finalTotal: fromPaise(
          originalTotalPaise - concessionTotalPaise
        ),
        status: "Active",
        remarks,
      });

      return res.status(201).json({
        success: true,
        message: "Student fee assignment created successfully.",
        data: assignment,
      });
    } catch (error) {
      const handled = handleDatabaseError(res, error);
      if (handled) return handled;
      next(error);
    }
  }
);

// GET /api/fee-assignments/:id
// Retrieve one assignment.
router.get(
  "/:id",
  requireRole(...viewers),
  async (req, res, next) => {
    try {
      if (!isValidId(req.params.id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid fee assignment ID.",
        });
      }

      const assignment = await FeeAssignment.findById(req.params.id)
        .populate("studentId")
        .populate("enrollmentId")
        .populate("feeStructureId")
        .populate("academicYearId")
        .populate("classId");

      if (!assignment) {
        return res.status(404).json({
          success: false,
          message: "Fee assignment not found.",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Fee assignment retrieved successfully.",
        data: assignment,
      });
    } catch (error) {
      next(error);
    }
  }
);

// PATCH /api/fee-assignments/:id/status
// Cancel an assignment. Historical data is retained.
router.patch(
  "/:id/status",
  requireRole(...managers),
  async (req, res, next) => {
    try {
      if (!isValidId(req.params.id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid fee assignment ID.",
        });
      }

      const result = updateFeeAssignmentStatusSchema.safeParse(req.body);

      if (!result.success) {
        return sendValidationError(res, result.error);
      }

      if (result.data.status !== "Cancelled") {
        return res.status(400).json({
          success: false,
          message:
            "Only cancellation is supported by this endpoint. Create a new assignment if needed.",
        });
      }

      const assignment = await FeeAssignment.findById(req.params.id);

      if (!assignment) {
        return res.status(404).json({
          success: false,
          message: "Fee assignment not found.",
        });
      }

      if (assignment.status === "Cancelled") {
        return res.status(400).json({
          success: false,
          message: "This fee assignment is already cancelled.",
        });
      }

      assignment.status = "Cancelled";
      await assignment.save();

      return res.status(200).json({
        success: true,
        message: "Fee assignment cancelled successfully.",
        data: assignment,
      });
    } catch (error) {
      const handled = handleDatabaseError(res, error);
      if (handled) return handled;
      next(error);
    }
  }
);

export default router;
