
import mongoose from "mongoose";

const studentSchema = new mongoose.Schema(
  {
    admissionNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      minlength: 2,
      maxlength: 30,
      index: true,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 60,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 60,
    },
    dateOfBirth: {
      type: Date,
      required: true,
    },
    gender: {
      type: String,
      enum: ["Male", "Female", "Other", "Prefer not to say"],
      required: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 254,
      default: undefined,
    },
    phone: {
      type: String,
      trim: true,
      maxlength: 20,
      default: undefined,
    },
    address: {
      type: String,
      trim: true,
      maxlength: 500,
      default: undefined,
    },
    emergencyContactName: {
      type: String,
      trim: true,
      maxlength: 120,
      default: undefined,
    },
    emergencyContactPhone: {
      type: String,
      trim: true,
      maxlength: 20,
      default: undefined,
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
    versionKey: false,
    toJSON: {
      transform(_doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

studentSchema.index({ lastName: 1, firstName: 1 });

const Student = mongoose.model("Student", studentSchema);

export default Student;
