
import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/User.js";

const testAccounts = [
  {
    name: "Temporary Test Accountant",
    role: "Accountant",
    emailKey: "TEST_ACCOUNTANT_EMAIL",
    passwordKey: "TEST_ACCOUNTANT_PASSWORD"
  },
  {
    name: "Temporary Test Student",
    role: "Student",
    emailKey: "TEST_STUDENT_EMAIL",
    passwordKey: "TEST_STUDENT_PASSWORD"
  },
  {
    name: "Temporary Test Parent",
    role: "Parent",
    emailKey: "TEST_PARENT_EMAIL",
    passwordKey: "TEST_PARENT_PASSWORD"
  }
];

async function seedRbacTestUsers() {
  await mongoose.connect(process.env.MONGODB_URI);

  for (const account of testAccounts) {
    const email = process.env[account.emailKey]
      ?.trim()
      .toLowerCase();

    const password = process.env[account.passwordKey];

    if (!email || !password || password.length < 12) {
      throw new Error(
        `Configure ${account.emailKey} and ${account.passwordKey} in .env with a password of at least 12 characters.`
      );
    }

    const existing = await User.findOne({ email });

    if (existing) {
      if (existing.role !== account.role) {
        throw new Error(
          `The configured email for ${account.role} already belongs to a different role.`
        );
      }

      console.log(
        `${account.role} test account already exists. No changes made.`
      );

      continue;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await User.create({
      name: account.name,
      email,
      passwordHash,
      role: account.role,
      status: "Active"
    });

    console.log(`${account.role} test account created.`);
  }
}

seedRbacTestUsers()
  .catch((error) => {
    console.error("Test-account setup failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
