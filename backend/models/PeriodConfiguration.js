
import mongoose from "mongoose";

const periodSchema = new mongoose.Schema(
  {
    periodNumber: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: "Period number must be a whole number.",
      },
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    startTime: {
      type: String,
      required: true,
      match: [/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM format."],
    },

    endTime: {
      type: String,
      required: true,
      match: [/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM format."],
    },

    type: {
      type: String,
      enum: ["Teaching", "Break"],
      default: "Teaching",
      required: true,
    },
  },
  { _id: true }
);

const periodConfigurationSchema = new mongoose.Schema(
  {
    academicYearId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AcademicYear",
      required: true,
      unique: true,
    },

    workingDays: {
      type: [String],
      enum: [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ],
      default: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      required: true,
    },

    weekdayPeriods: {
      type: [periodSchema],
      required: true,
      validate: {
        validator: (periods) => periods.length > 0,
        message: "At least one weekday period is required.",
      },
    },

    saturdayPeriods: {
      type: [periodSchema],
      required: true,
      validate: {
        validator: (periods) => periods.length > 0,
        message: "At least one Saturday period is required.",
      },
    },

    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
      required: true,
    },
  },
  { timestamps: true }
);

periodConfigurationSchema.pre("validate", function () {
  const validatePeriods = (periods, fieldName) => {
    const periodNumbers = periods.map((period) => period.periodNumber);

    if (new Set(periodNumbers).size !== periodNumbers.length) {
      this.invalidate(
        fieldName,
        "Period numbers must be unique within a schedule."
      );
    }

    const sortedPeriods = [...periods].sort(
      (a, b) => a.periodNumber - b.periodNumber
    );

    for (let i = 0; i < sortedPeriods.length; i++) {
      const current = sortedPeriods[i];

      if (current.startTime >= current.endTime) {
        this.invalidate(
          fieldName,
          "Period end time must be later than start time."
        );
      }

      if (i > 0 && sortedPeriods[i - 1].endTime > current.startTime) {
        this.invalidate(
          fieldName,
          "Periods must not overlap."
        );
      }
    }
  };

  validatePeriods(this.weekdayPeriods, "weekdayPeriods");
  validatePeriods(this.saturdayPeriods, "saturdayPeriods");
});

const PeriodConfiguration = mongoose.model(
  "PeriodConfiguration",
  periodConfigurationSchema
);

export default PeriodConfiguration;
