
import mongoose from "mongoose";

const sectionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      match: /^[A-Z]$/,
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SchoolClass",
      required: true,
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

// A section name must be unique within its class.
// For example, Class 6 can have Section A, and Class 7
// can also have Section A.
sectionSchema.index({ classId: 1, name: 1 }, { unique: true });

const Section = mongoose.model("Section", sectionSchema);

export default Section;
