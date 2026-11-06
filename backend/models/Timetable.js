import mongoose from "mongoose";

const timetableSchema = new mongoose.Schema(
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

    day: {
      type: String,
      enum: [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ],
      required: true,
    },

    periodNumber: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: "Period number must be a whole number.",
      },
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

    roomNumber: {
      type: String,
      trim: true,
      maxlength: 30,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// Prevent two subjects from being scheduled
// for the same section, day and period.
timetableSchema.index(
  {
    academicYearId: 1,
    sectionId: 1,
    day: 1,
    periodNumber: 1,
  },
  {
    unique: true,
  }
);

// Improve teacher timetable clash searches.
timetableSchema.index({
  academicYearId: 1,
  teacherId: 1,
  day: 1,
  periodNumber: 1,
});

// Improve room clash searches.
timetableSchema.index({
  academicYearId: 1,
  roomNumber: 1,
  day: 1,
  periodNumber: 1,
});

const Timetable = mongoose.model("Timetable", timetableSchema);

export default Timetable;