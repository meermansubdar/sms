
import mongoose from "mongoose";

const feeComponentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Fee component name is required"],
      trim: true,
      maxlength: 100,
    },
    amount: {
      type: Number,
      required: [true, "Fee component amount is required"],
      min: [0, "Fee amount cannot be negative"],
    },
  },
  { _id: true }
);

const installmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Installment name is required"],
      trim: true,
      maxlength: 100,
    },
    amount: {
      type: Number,
      required: [true, "Installment amount is required"],
      min: [0, "Installment amount cannot be negative"],
    },
    dueDate: {
      type: Date,
      required: [true, "Installment due date is required"],
    },
  },
  { _id: true }
);

const feeStructureSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Fee structure name is required"],
      trim: true,
      maxlength: 150,
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
      index: true,
    },
    currency: {
      type: String,
      enum: ["INR"],
      default: "INR",
      required: true,
    },
    components: {
      type: [feeComponentSchema],
      required: true,
      validate: {
        validator(components) {
          return Array.isArray(components) && components.length > 0;
        },
        message: "At least one fee component is required",
      },
    },
    installments: {
      type: [installmentSchema],
      required: true,
      validate: {
        validator(installments) {
          return Array.isArray(installments) && installments.length > 0;
        },
        message: "At least one installment is required",
      },
    },
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
      required: true,
    },
    remarks: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
  },
  { timestamps: true }
);

// One named fee structure per class and academic year.
feeStructureSchema.index(
  { academicYearId: 1, classId: 1, name: 1 },
  { unique: true }
);

feeStructureSchema.pre("validate", function () {
  const componentTotal = (this.components || []).reduce(
    (total, component) => total + (Number(component.amount) || 0),
    0
  );

  const installmentTotal = (this.installments || []).reduce(
    (total, installment) => total + (Number(installment.amount) || 0),
    0
  );

  // Compare to two decimal places to avoid floating-point rounding issues.
  const toPaise = (amount) => Math.round(amount * 100);

  if (toPaise(componentTotal) !== toPaise(installmentTotal)) {
    this.invalidate(
      "installments",
      "The total of all installments must equal the total of all fee components."
    );
  }

  const dueDates = (this.installments || [])
    .map((installment) => installment.dueDate)
    .filter((date) => date instanceof Date && !Number.isNaN(date.getTime()))
    .map((date) => date.getTime());

  if (dueDates.length !== (this.installments || []).length) {
    this.invalidate("installments", "Every installment must have a valid due date.");
  } else {
    const sortedDates = [...dueDates].sort((a, b) => a - b);

    if (sortedDates.some((date, index) => index > 0 && date === sortedDates[index - 1])) {
      this.invalidate("installments", "Installment due dates must be different.");
    }
  }
});

const FeeStructure = mongoose.model("FeeStructure", feeStructureSchema);

export default FeeStructure;
