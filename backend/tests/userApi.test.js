import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";

import app from "../app.js";
import User from "../models/User.js";
import Student from "../models/Student.js";

import {
  connectTestDatabase,
  disconnectTestDatabase,
} from "./testSetup.js";

import {
  generateTestToken,
  createAuthHeader,
} from "./testUtils.js";

const testUsers = {};
const testStudents = {};

async function createAdditionalStudent(admissionNumber, status = "Active") {
  return await Student.create({
    admissionNumber,
    firstName: "Test",
    lastName: "Student",
    dateOfBirth: "2012-06-15",
    gender: "Male",
    status,
  });
}

before(async () => {
  await connectTestDatabase();

  // Create Administrator and Principal test accounts.
  for (const role of ["Administrator", "Principal"]) {
    const user = await User.create({
      name: `Test ${role}`,
      email: `user.api.${role.toLowerCase()}@example.com`,
      passwordHash: "test-password-hash",
      role,
      status: "Active",
    });

    const token = generateTestToken(user._id, role);

    testUsers[role] = {
      user,
      headers: createAuthHeader(token),
    };
  }

  // Create one Active Student.
  testStudents.active = await Student.create({
    admissionNumber: "API-TEST-001",
    firstName: "Ali",
    lastName: "Khan",
    dateOfBirth: "2012-05-15",
    gender: "Male",
    status: "Active",
  });

  // Create one Inactive Student.
  testStudents.inactive = await Student.create({
    admissionNumber: "API-TEST-002",
    firstName: "Sara",
    lastName: "Shaikh",
    dateOfBirth: "2012-08-20",
    gender: "Female",
    status: "Inactive",
  });
});

after(async () => {
  await User.deleteMany({
    email: /^user\.api\./,
  });

  await Student.deleteMany({
    admissionNumber: {
      $in: ["API-TEST-001", "API-TEST-002", "API-TEST-003","API-TEST-004",],
    },
  });

  await disconnectTestDatabase();
});

test("User API should require authentication", async () => {
  const response = await request(app)
    .post("/api/users")
    .send({});

  assert.equal(response.status, 401);
});

test("Administrator should be able to create a Student account linked to an Active Student", async () => {
  const response = await request(app)
    .post("/api/users")
    .set(testUsers.Administrator.headers)
    .send({
      name: "Ali Khan",
      email: "user.api.student@example.com",
      password: "Password123",
      role: "Student",
      studentId: testStudents.active._id.toString(),
    });

  assert.equal(response.status, 201);
  assert.equal(response.body.success, true);

  const createdUser = await User.findOne({
    email: "user.api.student@example.com",
  });

  assert.ok(createdUser);
  assert.equal(
    createdUser.studentId.toString(),
    testStudents.active._id.toString()
  );
});

test("Administrator should not be able to create a Student account without studentId", async () => {
  const response = await request(app)
    .post("/api/users")
    .set(testUsers.Administrator.headers)
    .send({
      name: "Test Student",
      email: "missing.student.id@example.com",
      password: "Password123",
      role: "Student",
    });

  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
});

test("Administrator should not be able to link an inactive Student", async () => {
  const response = await request(app)
    .post("/api/users")
    .set(testUsers.Administrator.headers)
    .send({
      name: "Sara Shaikh",
      email: "inactive.student@example.com",
      password: "Password123",
      role: "Student",
      studentId: testStudents.inactive._id.toString(),
    });

  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
});


test("Administrator should reject a nonexistent Student ID during account creation", async () => {
  const response = await request(app)
    .post("/api/users")
    .set(testUsers.Administrator.headers)
    .send({
      name: "Unknown Student",
      email: "user.api.nonexistent@example.com",
      password: "Password123",
      role: "Student",
      studentId: "507f1f77bcf86cd799439011",
    });

  assert.equal(response.status, 400);
});

test("Administrator should not link the same Student to multiple accounts", async () => {
  const response = await request(app)
    .post("/api/users")
    .set(testUsers.Administrator.headers)
    .send({
      name: "Duplicate Student",
      email: "user.api.duplicate@example.com",
      password: "Password123",
      role: "Student",
      studentId: testStudents.active._id.toString(),
    });

  assert.equal(response.status, 409);
});

test("Administrator should not assign studentId to a non-Student account", async () => {
  const response = await request(app)
    .post("/api/users")
    .set(testUsers.Administrator.headers)
    .send({
      name: "Test Teacher",
      email: "user.api.teacher.with.student@example.com",
      password: "Password123",
      role: "Teacher",
      studentId: testStudents.active._id.toString(),
    });

  assert.equal(response.status, 400);
});

test("Principal should be able to create a linked Student account", async () => {
  const student = await createAdditionalStudent("API-TEST-003");

  const response = await request(app)
    .post("/api/users")
    .set(testUsers.Principal.headers)
    .send({
      name: "Principal Test Student",
      email: "user.api.principal.student@example.com",
      password: "Password123",
      role: "Student",
      studentId: student._id.toString(),
    });

  assert.equal(response.status, 201);

  const createdUser = await User.findOne({
    email: "user.api.principal.student@example.com",
  });

  assert.equal(
    createdUser.studentId.toString(),
    student._id.toString()
  );
});

test("Updating a Student account should preserve its Student link", async () => {
  const studentUser = await User.findOne({
    email: "user.api.student@example.com",
  });

  const originalStudentId = studentUser.studentId.toString();

  const response = await request(app)
    .patch(`/api/users/${studentUser._id}`)
    .set(testUsers.Administrator.headers)
    .send({
      name: "Ali Khan Updated",
    });

  assert.equal(response.status, 200);

  const updatedUser = await User.findById(studentUser._id);

  assert.equal(
    updatedUser.studentId.toString(),
    originalStudentId
  );
});

test("Administrator should be able to convert a Teacher account into a linked Student account", async () => {
  const student = await createAdditionalStudent("API-TEST-004");

  const teacher = await User.create({
    name: "Teacher To Student",
    email: "user.api.teacher.convert@example.com",
    passwordHash: "test-password-hash",
    role: "Teacher",
    status: "Active",
  });

  const response = await request(app)
    .patch(`/api/users/${teacher._id}`)
    .set(testUsers.Administrator.headers)
    .send({
      role: "Student",
      studentId: student._id.toString(),
    });

  assert.equal(response.status, 200);

  const updatedUser = await User.findById(teacher._id);

  assert.equal(updatedUser.role, "Student");
  assert.equal(
    updatedUser.studentId.toString(),
    student._id.toString()
  );
});

test("Administrator should reject an inactive Student ID during account update", async () => {
  const teacher = await User.create({
    name: "Inactive Link Test",
    email: "user.api.inactive.link@example.com",
    passwordHash: "test-password-hash",
    role: "Teacher",
    status: "Active",
  });

  const response = await request(app)
    .patch(`/api/users/${teacher._id}`)
    .set(testUsers.Administrator.headers)
    .send({
      role: "Student",
      studentId: testStudents.inactive._id.toString(),
    });

  assert.equal(response.status, 400);
});

test("Administrator should reject a nonexistent Student ID during account update", async () => {
  const teacher = await User.create({
    name: "Nonexistent Link Test",
    email: "user.api.nonexistent.link@example.com",
    passwordHash: "test-password-hash",
    role: "Teacher",
    status: "Active",
  });

  const response = await request(app)
    .patch(`/api/users/${teacher._id}`)
    .set(testUsers.Administrator.headers)
    .send({
      role: "Student",
      studentId: "507f1f77bcf86cd799439011",
    });

  assert.equal(response.status, 400);
});

test("Changing a Student account to Teacher should remove its Student link", async () => {
  const studentUser = await User.findOne({
    email: "user.api.student@example.com",
  });

  const response = await request(app)
    .patch(`/api/users/${studentUser._id}`)
    .set(testUsers.Administrator.headers)
    .send({
      role: "Teacher",
    });

  assert.equal(response.status, 200);

  const updatedUser = await User.findById(studentUser._id);

  assert.equal(updatedUser.role, "Teacher");
  assert.equal(updatedUser.studentId, undefined);
});

test("Teacher should not be allowed to create User accounts", async () => {
  const teacher = await User.create({
    name: "API Test Teacher",
    email: "user.api.test.teacher@example.com",
    passwordHash: "test-password-hash",
    role: "Teacher",
    status: "Active",
  });

  const token = generateTestToken(teacher._id, "Teacher");
  const headers = createAuthHeader(token);

  const response = await request(app)
    .post("/api/users")
    .set(headers)
    .send({
      name: "Unauthorized Student",
      email: "user.api.unauthorized@example.com",
      password: "Password123",
      role: "Student",
      studentId: testStudents.active._id.toString(),
    });

  assert.equal(response.status, 403);
});
