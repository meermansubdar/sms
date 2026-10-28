
import mongoose from "mongoose";

const enrollmentSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },

    academicYearId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AcademicYear",
      required: true,
    },

    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SchoolClass",
      required: true,
    },

    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Section",
      required: true,
    },

    rollNumber: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: "Roll number must be a whole number.",
      },
    },

    enrollmentDate: {
      type: Date,
      required: true,
      default: Date.now,
    },

    status: {
      type: String,
      enum: ["Active", "Transferred", "Completed", "Cancelled"],
      default: "Active",
      required: true,
    },

    transferDate: {
      type: Date,
      default: null,
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

// A student can have only one Active enrollment
// in a particular academic year.
enrollmentSchema.index(
  { studentId: 1, academicYearId: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "Active" },
  }
);

// Prevent duplicate enrollment of the same student
// in the same class and section during the same year.
enrollmentSchema.index(
  {
    studentId: 1,
    academicYearId: 1,
    classId: 1,
    sectionId: 1,
  },
  { unique: true }
);

// Roll numbers must be unique within an academic year,
// class, and section.
enrollmentSchema.index(
  {
    academicYearId: 1,
    classId: 1,
    sectionId: 1,
    rollNumber: 1,
  },
  { unique: true }
);

const Enrollment = mongoose.model("Enrollment", enrollmentSchema);

export default Enrollment;
