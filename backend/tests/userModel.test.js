
import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import User from "../models/User.js";

test("User should accept a valid Student reference", async () => {
  const studentId = new mongoose.Types.ObjectId();

  const user = new User({
    name: "Ali Khan",
    email: "ali@example.com",
    passwordHash: "test-password-hash",
    role: "Student",
    studentId,
  });

  await user.validate();

  assert.equal(user.studentId.toString(), studentId.toString());
});

test("User should allow studentId to be omitted for existing records", async () => {
  const user = new User({
    name: "Test Teacher",
    email: "teacher@example.com",
    passwordHash: "test-password-hash",
    role: "Teacher",
  });

  await user.validate();

  assert.equal(user.studentId, undefined);
});

test("studentId should reference the Student model", () => {
  const studentIdPath = User.schema.path("studentId");

  assert.ok(studentIdPath);
  assert.equal(studentIdPath.options.ref, "Student");
  assert.equal(studentIdPath.instance, "ObjectId");
});

test("studentId should have a unique sparse index", () => {
  const indexes = User.schema.indexes();

  const studentIndex = indexes.find(
    ([fields]) => fields.studentId === 1
  );

  assert.ok(studentIndex, "Student ID index should exist");
  assert.equal(studentIndex[1].unique, true);
  assert.equal(studentIndex[1].sparse, true);
});
