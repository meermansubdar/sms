
import mongoose from "mongoose";

const homeworkSchema = new mongoose.Schema(
  {
    academicYearId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AcademicYear",
      required: true,
    },

    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Section",
      required: true,
    },

    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },

    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 150,
    },

    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 2000,
    },

    assignedDate: {
      type: Date,
      required: true,
    },

    dueDate: {
      type: Date,
      required: true,
      validate: {
        validator(value) {
          return (
            !this.assignedDate ||
            !value ||
            value >= this.assignedDate
          );
        },
        message: "Due date cannot be earlier than assigned date.",
      },
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

// Improve student homework searches by academic year,
// section, status and assigned date.
homeworkSchema.index({
  academicYearId: 1,
  sectionId: 1,
  status: 1,
  assignedDate: 1,
});

// Improve teacher homework searches.
homeworkSchema.index({
  teacherId: 1,
  academicYearId: 1,
  status: 1,
});

const Homework = mongoose.model("Homework", homeworkSchema);

export default Homework;
