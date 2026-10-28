
import mongoose from "mongoose";

const schoolClassSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true
    },
    gradeNumber: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
      unique: true
    },
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
      required: true
    }
  },
  { timestamps: true }
);

schoolClassSchema.pre("validate", function () {
  if (
    this.name &&
    Number.isInteger(this.gradeNumber) &&
    this.name !== `Class ${this.gradeNumber}`
  ) {
    this.invalidate(
      "name",
      "Class name must match the grade number, for example Class 1."
    );
  }
});

const SchoolClass = mongoose.model("SchoolClass", schoolClassSchema);

export default SchoolClass;
