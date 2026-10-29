
import mongoose from "mongoose";

const assignedComponentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    originalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    concessionAmount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    finalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: true }
);

const assignedInstallmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    originalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    concessionAmount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    amountDue: {
      type: Number,
      required: true,
      min: 0,
    },
    dueDate: {
      type: Date,
      required: true,
    },
  },
  { _id: true }
);

const feeAssignmentSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true,
    },

    enrollmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Enrollment",
      required: true,
      index: true,
    },

    feeStructureId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FeeStructure",
      required: true,
    },

    academicYearId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AcademicYear",
      required: true,
      index: true,
    },

    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SchoolClass",
      required: true,
    },

    currency: {
      type: String,
      enum: ["INR"],
      default: "INR",
      required: true,
    },

    components: {
      type: [assignedComponentSchema],
      required: true,
      validate: {
        validator(value) {
          return Array.isArray(value) && value.length > 0;
        },
        message: "At least one assigned fee component is required.",
      },
    },

    installments: {
      type: [assignedInstallmentSchema],
      required: true,
      validate: {
        validator(value) {
          return Array.isArray(value) && value.length > 0;
        },
        message: "At least one assigned installment is required.",
      },
    },

    originalTotal: {
      type: Number,
      required: true,
      min: 0,
    },

    concessionType: {
      type: String,
      enum: ["None", "Fixed", "Percentage"],
      default: "None",
      required: true,
    },

    concessionValue: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    concessionTotal: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    finalTotal: {
      type: Number,
      required: true,
      min: 0,
    },

    status: {
      type: String,
      enum: ["Active", "Cancelled"],
      default: "Active",
      required: true,
    },

    paymentLock: {
        token: {
            type: String,
            default: null,
        },
        expiresAt: {
            type: Date,
            default: null,
        },
    },
    remarks: {
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

// A student can have only one active fee assignment
// for a particular enrollment.
feeAssignmentSchema.index(
  { enrollmentId: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "Active" },
  }
);

feeAssignmentSchema.index({
  academicYearId: 1,
  classId: 1,
  status: 1,
});

const FeeAssignment = mongoose.model(
  "FeeAssignment",
  feeAssignmentSchema
);

export default FeeAssignment;
