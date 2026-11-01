import { Router } from "express";
import mongoose from "mongoose";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import FeeAssignment from "../models/FeeAssignment.js";
import FeePayment from "../models/FeePayment.js";
import AcademicYear from "../models/AcademicYear.js";

const router = Router();

router.use(requireAuth);

// Only Administrator and Principal can access the Fee Collection Dashboard.
router.use(requireRole("Administrator", "Principal"));

// GET /api/dashboard/fee-collection
router.get("/fee-collection", async (req, res) => {
      const { academicYearId } = req.query;
  try {
        if (!academicYearId || !mongoose.isValidObjectId(academicYearId)) {
            return res.status(400).json({
                success: false,
                message: "A valid Academic Year ID is required.",
            });
            }

            const academicYear = await AcademicYear.findById(academicYearId).lean();

            if (!academicYear) {
            return res.status(404).json({
                success: false,
                message: "Academic Year not found.",
            });
        }
        // Fetch active fee assignments.
        const assignments = await FeeAssignment.find({
            status: "Active",
            academicYearId: academicYear._id,
        }).lean();

    // Fetch completed payments only.
    const payments = await FeePayment.find({
        status: "Completed",
        feeAssignmentId: {
            $in: assignments.map((assignment) => assignment._id),
        },
    }).lean();

    // Calculate totals in paise to avoid decimal rounding issues.
    const toPaise = (amount) => Math.round(Number(amount) * 100);
    const fromPaise = (amount) => amount / 100;

    const totalAssignedPaise = assignments.reduce(
      (sum, assignment) => sum + toPaise(assignment.finalTotal),
      0
    );

    const totalConcessionsPaise = assignments.reduce(
      (sum, assignment) => sum + toPaise(assignment.concessionTotal),
      0
    );

        // Calculate monthly collections for the selected academic year.
    const monthlyCollections = [];

    const startDate = new Date(academicYear.startDate);
    const endDate = new Date(academicYear.endDate);

    const currentMonth = new Date(
      Date.UTC(
        startDate.getUTCFullYear(),
        startDate.getUTCMonth(),
        1
      )
    );

    while (currentMonth <= endDate) {
      const monthStart = new Date(currentMonth);

      const nextMonth = new Date(
        Date.UTC(
          currentMonth.getUTCFullYear(),
          currentMonth.getUTCMonth() + 1,
          1
        )
      );

      const monthEnd = new Date(nextMonth.getTime() - 1);

      const monthlyTotalPaise = payments
        .filter((payment) => {
          const paymentDate = new Date(payment.paymentDate);
          return paymentDate >= monthStart && paymentDate <= monthEnd;
        })
        .reduce(
          (sum, payment) => sum + toPaise(payment.amountPaid),
          0
        );

      monthlyCollections.push({
        month: currentMonth.toLocaleString("en-IN", {
          month: "short",
          timeZone: "UTC",
        }),
        year: currentMonth.getUTCFullYear(),
        totalCollected: fromPaise(monthlyTotalPaise),
      });

      currentMonth.setUTCMonth(currentMonth.getUTCMonth() + 1);
    }

    const totalCollectedPaise = payments.reduce(
      (sum, payment) => sum + toPaise(payment.amountPaid),
      0
    );

    const totalOutstandingPaise = Math.max(
      0,
      totalAssignedPaise - totalCollectedPaise
    );

    const collectionPercentage =
      totalAssignedPaise > 0
        ? Number(
            ((totalCollectedPaise / totalAssignedPaise) * 100).toFixed(2)
          )
        : 0;
    return res.status(200).json({
        success: true,
        message: "Fee Collection Dashboard data retrieved successfully.",
        data: {
            totalAssigned: fromPaise(totalAssignedPaise),
            totalCollected: fromPaise(totalCollectedPaise),
            totalOutstanding: fromPaise(totalOutstandingPaise),
            collectionPercentage,
            totalConcessions: fromPaise(totalConcessionsPaise),
            monthlyCollections,
        },
    });
  } catch (error) {
    console.error("Fee Collection Dashboard Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load the Fee Collection Dashboard.",
    });
  }
});

export default router;