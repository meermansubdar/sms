
import mongoose from "mongoose";

const academicYearSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      match: [/^\d{4}-\d{4}$/, "Use the format YYYY-YYYY."],
      unique: true
    },

    startDate: {
      type: Date,
      required: true
    },

    endDate: {
      type: Date,
      required: true
    },

    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
      required: true
    }
  },
  {
    timestamps: true
  }
);

academicYearSchema.pre("validate", function () {
  const startYear = this.startDate?.getUTCFullYear();
  const endYear = this.endDate?.getUTCFullYear();

  if (this.name && startYear && endYear) {
    const expectedName = `${startYear}-${endYear}`;

    if (this.name !== expectedName) {
      this.invalidate(
        "name",
        "The academic year name must match its start and end years."
      );
    }
  }

  if (
    this.startDate &&
    this.endDate &&
    this.endDate <= this.startDate
  ) {
    this.invalidate(
      "endDate",
      "The end date must be later than the start date."
    );
  }
});

const AcademicYear = mongoose.model(
  "AcademicYear",
  academicYearSchema
);

export default AcademicYear;
