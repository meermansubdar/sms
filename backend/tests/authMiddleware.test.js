
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import request from "supertest";

import User from "../models/User.js";
import Student from "../models/Student.js";

import { requireAuth } from "../middleware/authMiddleware.js";

import {
  connectTestDatabase,
  disconnectTestDatabase
} from "./testSetup.js";

import {
  generateTestToken
} from "./testUtils.js";

const testUsers = {};
let testStudent;

const app = express();

app.get("/test-auth", requireAuth, (req, res) => {
  res.status(200).json({
    success: true,
    user: req.user
  });
});

before(async () => {
  await connectTestDatabase();

  testStudent = await Student.create({
    admissionNumber: "AUTH-TEST-001",
    firstName: "Auth",
    lastName: "Student",
    dateOfBirth: "2012-06-15",
    gender: "Male"
  });

  testUsers.student = await User.create({
    name: "Auth Student",
    email: "auth.student.test@example.com",
    passwordHash: "test-password-hash",
    role: "Student",
    studentId: testStudent._id
  });

  testUsers.teacher = await User.create({
    name: "Auth Teacher",
    email: "auth.teacher.test@example.com",
    passwordHash: "test-password-hash",
    role: "Teacher"
  });
});

after(async () => {
  await User.deleteMany({
    email: {
      $in: [
        "auth.student.test@example.com",
        "auth.teacher.test@example.com"
      ]
    }
  });

  await Student.deleteMany({
    admissionNumber: "AUTH-TEST-001"
  });

  await disconnectTestDatabase();
});

test("Student authentication should return the linked studentId", async () => {
  const token = generateTestToken(
    testUsers.student._id,
    "Student"
  );

  const response = await request(app)
    .get("/test-auth")
    .set("Authorization", `Bearer ${token}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.user.role, "Student");
  assert.equal(
    response.body.user.studentId,
    testStudent._id.toString()
  );
});

test("Non-Student authentication should not return studentId", async () => {
  const token = generateTestToken(
    testUsers.teacher._id,
    "Teacher"
  );

  const response = await request(app)
    .get("/test-auth")
    .set("Authorization", `Bearer ${token}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.user.role, "Teacher");
  assert.equal(
    Object.hasOwn(response.body.user, "studentId"),
    false
  );
});

test("Authentication should reject requests without a token", async () => {
  const response = await request(app)
    .get("/test-auth");

  assert.equal(response.status, 401);
});
