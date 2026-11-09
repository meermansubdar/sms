
import test from "node:test";
import assert from "node:assert/strict";
import {
  createUserSchema,
  updateUserSchema,
} from "../validators/userSchemas.js";

const validUser = {
  name: "Ali Khan",
  email: "ali@example.com",
  password: "Password123",
  role: "Student",
};

test("Student account creation should require studentId", () => {
  const result = createUserSchema.safeParse(validUser);
  assert.equal(result.success, false);
});

test("Student account creation should accept a valid studentId", () => {
  const result = createUserSchema.safeParse({
    ...validUser,
    studentId: "507f1f77bcf86cd799439011",
  });

  assert.equal(result.success, true);
});

test("Non-Student account creation should reject studentId", () => {
  const result = createUserSchema.safeParse({
    ...validUser,
    role: "Teacher",
    studentId: "507f1f77bcf86cd799439011",
  });

  assert.equal(result.success, false);
});

test("Non-Student account creation should not require studentId", () => {
  const result = createUserSchema.safeParse({
    ...validUser,
    role: "Teacher",
  });

  assert.equal(result.success, true);
});

test("Student account creation should reject an invalid studentId", () => {
  const result = createUserSchema.safeParse({
    ...validUser,
    studentId: "invalid-id",
  });

  assert.equal(result.success, false);
});

test("User update should accept a valid studentId", () => {
  const result = updateUserSchema.safeParse({
    studentId: "507f1f77bcf86cd799439011",
  });

  assert.equal(result.success, true);
});

test("User update should reject an invalid studentId", () => {
  const result = updateUserSchema.safeParse({
    studentId: "invalid-id",
  });

  assert.equal(result.success, false);
});

test("User update should reject an empty update", () => {
  const result = updateUserSchema.safeParse({});
  assert.equal(result.success, false);
});
