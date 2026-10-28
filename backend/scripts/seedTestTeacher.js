
import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/User.js";

async function seedTestTeacher() {
  const email = process.env.TEST_TEACHER_EMAIL?.trim().toLowerCase();
  const password = process.env.TEST_TEACHER_PASSWORD;

  if (!email || !password || password.length < 12) {
    throw new Error(
      "Set TEST_TEACHER_EMAIL and a password of at least 12 characters in .env."
    );
  }

  await mongoose.connect(process.env.MONGODB_URI);

  const existing = await User.findOne({ email });

  if (existing) {
    if (existing.role !== "Teacher") {
      throw new Error(
        "The test email already belongs to a non-Teacher account."
      );
    }

    console.log("Teacher test account already exists. No changes made.");
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await User.create({
    name: "Temporary Test Teacher",
    email,
    passwordHash,
    role: "Teacher",
    status: "Active"
  });

  console.log("Teacher test account created successfully.");
}

seedTestTeacher()
  .catch((error) => {
    console.error("Teacher setup failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
