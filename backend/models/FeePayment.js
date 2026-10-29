
import mongoose from "mongoose";

const feePaymentSchema = new mongoose.Schema(
  {
    receiptNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    feeAssignmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FeeAssignment",
      required: true,
      index: true,
    },

    enrollmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Enrollment",
      required: true,
      index: true,
    },

    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true,
    },

    installmentId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    installmentName: {
      type: String,
      required: true,
      trim: true,
    },

    amountPaid: {
      type: Number,
      required: true,
      min: [0.01, "Payment amount must be greater than zero."],
    },

    paymentDate: {
      type: Date,
      required: true,
      default: Date.now,
    },

    paymentMethod: {
      type: String,
      required: true,
      enum: ["Cash", "UPI", "Bank Transfer", "Cheque", "Card"],
    },

    transactionReference: {
      type: String,
      trim: true,
      maxlength: 100,
      default: "",
    },

    remarks: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },

    status: {
      type: String,
      enum: ["Completed", "Cancelled"],
      default: "Completed",
      required: true,
    },

    receivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    cancelledAt: {
      type: Date,
      default: null,
    },

    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    cancellationReason: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

feePaymentSchema.index({
  feeAssignmentId: 1,
  installmentId: 1,
  status: 1,
});

const FeePayment = mongoose.model("FeePayment", feePaymentSchema);

export default FeePayment;
