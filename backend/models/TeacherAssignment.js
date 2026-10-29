
import mongoose from "mongoose";

const teacherAssignmentSchema = new mongoose.Schema(
  {
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Section",
      required: true,
    },

    academicYearId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AcademicYear",
      required: true,
    },

    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate active assignments for the same
// teacher, section, and academic year.
teacherAssignmentSchema.index(
  {
    teacherId: 1,
    sectionId: 1,
    academicYearId: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      status: "Active",
    },
  }
);

teacherAssignmentSchema.index({
  teacherId: 1,
  academicYearId: 1,
  status: 1,
});

const TeacherAssignment = mongoose.model(
  "TeacherAssignment",
  teacherAssignmentSchema
);

export default TeacherAssignment;
