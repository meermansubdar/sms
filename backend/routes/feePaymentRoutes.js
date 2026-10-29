
import { Router } from "express";
import mongoose from "mongoose";
import { randomUUID } from "node:crypto";
import Enrollment from "../models/Enrollment.js";

import FeePayment from "../models/FeePayment.js";
import FeeAssignment from "../models/FeeAssignment.js";
import TeacherAssignment from "../models/TeacherAssignment.js";
import {
  createFeePaymentSchema,
  cancelFeePaymentSchema,
} from "../validators/feePaymentSchemas.js";
import {
  acquireFeePaymentLock,
  releaseFeePaymentLock,
} from "../utils/feePaymentLock.js";
import {
  requireAuth,
  requireRole,
} from "../middleware/authMiddleware.js";

const router = Router();
const safePaymentFields =
  "receiptNumber feeAssignmentId enrollmentId studentId installmentId installmentName amountPaid paymentDate paymentMethod transactionReference remarks status receivedBy cancelledAt cancelledBy cancellationReason createdAt updatedAt";

router.use(requireAuth);

const managers = ["Administrator", "Principal"];
const paymentStaff = ["Administrator", "Principal", "Accountant"];
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
      message: "A duplicate payment or receipt number was detected.",
    });
  }

  if (error?.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: "The payment could not be saved.",
      errors: Object.values(error.errors).map((item) => ({
        field: item.path,
        message: item.message,
      })),
    });
  }

  return null;
}

function newReceiptNumber() {
  const date = new Date();
  const datePart = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("");

  return `SCH-${datePart}-${randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`;
}

// GET /api/fee-payments
// List payment history.
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
        "feeAssignmentId",
        "enrollmentId",
        "studentId",
        "installmentId",
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
        if (!["Completed", "Cancelled"].includes(req.query.status)) {
          return res.status(400).json({
            success: false,
            message: "Status must be Completed or Cancelled.",
          });
        }
        filter.status = req.query.status;
      }

      const skip = (page - 1) * limit;

        if (req.user.role === "Teacher") {
            const teacherAssignments = await TeacherAssignment.find({
                teacherId: req.user.id,
                status: "Active",
            })
                .select("sectionId academicYearId")
                .lean();

            const enrollmentConditions = teacherAssignments.map((assignment) => ({
                sectionId: assignment.sectionId,
                academicYearId: assignment.academicYearId,
            }));

            const enrollments = enrollmentConditions.length
                ? await Enrollment.find({
                    $or: enrollmentConditions,
                })
                    .select("_id")
                    .lean()
                : [];

            const allowedEnrollmentIds = enrollments.map((enrollment) =>
                enrollment._id.toString()
            );

            if (filter.enrollmentId) {
                if (!allowedEnrollmentIds.includes(filter.enrollmentId)) {
                return res.status(200).json({
                    success: true,
                    message: "Fee payments retrieved successfully.",
                    data: [],
                    pagination: {
                    page,
                    limit,
                    total: 0,
                    totalPages: 0,
                    },
                });
                }
            } else {
                filter.enrollmentId = { $in: allowedEnrollmentIds };
            }
        }

      
        const [payments, total] = await Promise.all([
        FeePayment.find(filter)
            .select(
            "receiptNumber feeAssignmentId enrollmentId studentId installmentId installmentName amountPaid paymentDate paymentMethod transactionReference remarks status receivedBy cancelledAt cancelledBy cancellationReason createdAt updatedAt"
            )
            .populate("studentId", "firstName lastName admissionNumber")
            .populate("enrollmentId", "academicYearId classId sectionId status")
            .populate("feeAssignmentId", "academicYearId classId currency finalTotal status")
            .populate("receivedBy", "name role")
            .populate("cancelledBy", "name role")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        FeePayment.countDocuments(filter),
        ]);


      return res.status(200).json({
        success: true,
        message: "Fee payments retrieved successfully.",
        data: payments,
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

// GET /api/fee-payments/outstanding/:assignmentId
// Show the remaining amount for every installment.
router.get(
  "/outstanding/:assignmentId",
  requireRole(...viewers),
  async (req, res, next) => {
    try {
      const { assignmentId } = req.params;

      if (!isValidId(assignmentId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid fee assignment ID.",
        });
      }

      const assignment = await FeeAssignment.findById(assignmentId).lean();

      if (!assignment) {
        return res.status(404).json({
          success: false,
          message: "Fee assignment not found.",
        });
      }

      if (req.user.role === "Teacher") {
        const enrollment = await Enrollment.findById(
            assignment.enrollmentId
        )
            .select("sectionId academicYearId")
            .lean();

        if (!enrollment) {
            return res.status(404).json({
            success: false,
            message: "Enrollment not found.",
            });
        }

        const teacherAssignment = await TeacherAssignment.findOne({
            teacherId: req.user.id,
            sectionId: enrollment.sectionId,
            academicYearId: enrollment.academicYearId,
            status: "Active",
        }).lean();

        if (!teacherAssignment) {
            return res.status(403).json({
            success: false,
            message: "You do not have permission to view this fee balance.",
            });
        }
      }

      const payments = await FeePayment.find({
        feeAssignmentId: assignment._id,
        status: "Completed",
      }).lean();

      const installments = assignment.installments.map((installment) => {
        const paidPaise = payments
          .filter(
            (payment) =>
              String(payment.installmentId) === String(installment._id)
          )
          .reduce((sum, payment) => sum + toPaise(payment.amountPaid), 0);

        const duePaise = toPaise(installment.amountDue);

        return {
          installmentId: installment._id,
          name: installment.name,
          dueDate: installment.dueDate,
          amountDue: fromPaise(duePaise),
          amountPaid: fromPaise(paidPaise),
          outstandingAmount: fromPaise(Math.max(0, duePaise - paidPaise)),
        };
      });

      return res.status(200).json({
        success: true,
        message: "Installment balances retrieved successfully.",
        data: {
          feeAssignmentId: assignment._id,
          currency: assignment.currency,
          installments,
          totalOutstanding: fromPaise(
            installments.reduce(
              (sum, item) => sum + toPaise(item.outstandingAmount),
              0
            )
          ),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/fee-payments
// Collect a payment against an assigned installment.
router.post(
  "/",
  requireRole(...paymentStaff),
  async (req, res, next) => {
    let lock = null;
    let assignmentId = null;

    try {
      const result = createFeePaymentSchema.safeParse(req.body);

      if (!result.success) {
        return sendValidationError(res, result.error);
      }

      const {
        feeAssignmentId,
        installmentId,
        amountPaid,
        paymentDate,
        paymentMethod,
        transactionReference,
        remarks,
      } = result.data;

      assignmentId = feeAssignmentId;

      lock = await acquireFeePaymentLock(assignmentId);

      if (!lock) {
        const assignmentExists = await FeeAssignment.exists({
          _id: assignmentId,
        });

        if (!assignmentExists) {
          return res.status(404).json({
            success: false,
            message: "Fee assignment not found.",
          });
        }

        return res.status(409).json({
          success: false,
          message:
            "This fee assignment is being processed by another request or is inactive. Please retry shortly.",
        });
      }

      const assignment = lock.assignment;

      if (assignment.status !== "Active") {
        return res.status(400).json({
          success: false,
          message: "Payments can only be collected for active fee assignments.",
        });
      }

      const installment = assignment.installments.id(installmentId);

      if (!installment) {
        return res.status(404).json({
          success: false,
          message: "The selected installment was not found.",
        });
      }

      const existingPayments = await FeePayment.find({
        feeAssignmentId: assignment._id,
        installmentId: installment._id,
        status: "Completed",
      }).lean();

      const paidPaise = existingPayments.reduce(
        (sum, payment) => sum + toPaise(payment.amountPaid),
        0
      );

      const duePaise = toPaise(installment.amountDue);
      const paymentPaise = toPaise(amountPaid);
      const outstandingPaise = duePaise - paidPaise;

      if (paymentPaise > outstandingPaise) {
        return res.status(400).json({
          success: false,
          message: "Payment exceeds the installment's outstanding balance.",
          data: {
            amountDue: fromPaise(duePaise),
            amountAlreadyPaid: fromPaise(paidPaise),
            outstandingAmount: fromPaise(Math.max(0, outstandingPaise)),
          },
        });
      }

      const payment = await FeePayment.create({
        receiptNumber: newReceiptNumber(),
        feeAssignmentId: assignment._id,
        enrollmentId: assignment.enrollmentId,
        studentId: assignment.studentId,
        installmentId: installment._id,
        installmentName: installment.name,
        amountPaid: fromPaise(paymentPaise),
        paymentDate: paymentDate ?? new Date(),
        paymentMethod,
        transactionReference,
        remarks,
        status: "Completed",
        receivedBy: req.user.id,
      });

      const safePayment = await FeePayment.findById(payment._id)
      .select(safePaymentFields)
      .populate("studentId", "firstName lastName admissionNumber")
      .populate("enrollmentId", "academicYearId classId sectionId status")
      .populate("feeAssignmentId", "academicYearId classId currency finalTotal status")
      .populate("receivedBy", "name role")
      .populate("cancelledBy", "name role")
      .lean();
    return res.status(201).json({
        success: true,
        message: "Fee payment recorded successfully.",
        data: safePayment,
    });
    } catch (error) {
      const handled = handleDatabaseError(res, error);
      if (handled) return handled;
      next(error);
    } finally {
      if (lock && assignmentId) {
        try {
          await releaseFeePaymentLock(assignmentId, lock.lockToken);
        } catch (releaseError) {
          console.error(
            "Failed to release fee payment lock:",
            releaseError.message
          );
        }
      }
    }
  }
);

// GET /api/fee-payments/:id
// Retrieve a payment and its receipt details.
router.get(
  "/:id",
  requireRole(...viewers),
  async (req, res, next) => {
    try {
      if (!isValidId(req.params.id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid payment ID.",
        });
      }

      
        const payment = await FeePayment.findById(req.params.id)
        .select(
            "receiptNumber feeAssignmentId enrollmentId studentId installmentId installmentName amountPaid paymentDate paymentMethod transactionReference remarks status receivedBy cancelledAt cancelledBy cancellationReason createdAt updatedAt"
        )
        .populate("studentId", "firstName lastName admissionNumber")
        .populate("enrollmentId", "academicYearId classId sectionId status")
        .populate("feeAssignmentId", "academicYearId classId currency finalTotal status")
        .populate("receivedBy", "name role")
        .populate("cancelledBy", "name role");


      if (!payment) {
        return res.status(404).json({
          success: false,
          message: "Fee payment not found.",
        });
      }

      if (req.user.role === "Teacher") {
        const enrollment = await Enrollment.findById(payment.enrollmentId)
            .select("sectionId academicYearId")
            .lean();

        if (!enrollment) {
            return res.status(404).json({
            success: false,
            message: "Fee payment not found.",
            });
        }

        const teacherAssignment = await TeacherAssignment.findOne({
            teacherId: req.user.id,
            sectionId: enrollment.sectionId,
            academicYearId: enrollment.academicYearId,
            status: "Active",
        }).lean();

        if (!teacherAssignment) {
            return res.status(403).json({
            success: false,
            message: "You do not have permission to view this fee payment.",
            });
        }
       }

      return res.status(200).json({
        success: true,
        message: "Fee payment retrieved successfully.",
        data: payment,
      });
    } catch (error) {
      next(error);
    }
  }
);

// PATCH /api/fee-payments/:id/cancel
// Cancel a payment without deleting its receipt history.
router.patch(
  "/:id/cancel",
  requireRole(...managers),
  async (req, res, next) => {
    try {
      if (!isValidId(req.params.id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid payment ID.",
        });
      }

      const result = cancelFeePaymentSchema.safeParse(req.body);

      if (!result.success) {
        return sendValidationError(res, result.error);
      }

      const payment = await FeePayment.findById(req.params.id);

      if (!payment) {
        return res.status(404).json({
          success: false,
          message: "Fee payment not found.",
        });
      }

      if (payment.status === "Cancelled") {
        return res.status(400).json({
          success: false,
          message: "This payment is already cancelled.",
        });
      }

      const lock = await acquireFeePaymentLock(payment.feeAssignmentId);

      if (!lock) {
        return res.status(409).json({
          success: false,
          message:
            "The fee assignment is being processed or is inactive. Please retry shortly.",
        });
      }

      try {
        const updatedPayment = await FeePayment.findOneAndUpdate(
          {
            _id: payment._id,
            status: "Completed",
          },
          {
            $set: {
              status: "Cancelled",
              cancelledAt: new Date(),
              cancelledBy: req.user.id,
              cancellationReason: result.data.cancellationReason,
            },
          },
          { new: true, runValidators: true }
        );

        if (!updatedPayment) {
          return res.status(409).json({
            success: false,
            message: "The payment was changed by another request.",
          });
        }

        const safePayment = await FeePayment.findById(updatedPayment._id)
        .select(safePaymentFields)
        .populate("studentId", "firstName lastName admissionNumber")
        .populate("enrollmentId", "academicYearId classId sectionId status")
        .populate("feeAssignmentId", "academicYearId classId currency finalTotal status")
        .populate("receivedBy", "name role")
        .populate("cancelledBy", "name role")
        .lean();

    return res.status(200).json({
        success: true,
        message: "Payment cancelled. Its receipt history has been retained.",
        data: safePayment,
    });
      } finally {
        await releaseFeePaymentLock(
          payment.feeAssignmentId,
          lock.lockToken
        );
      }
    } catch (error) {
      const handled = handleDatabaseError(res, error);
      if (handled) return handled;
      next(error);
    }
  }
);

export default router;
