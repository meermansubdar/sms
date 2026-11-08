
import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";

import Homework from "../models/Homework.js";

const createValidHomework = () =>
  new Homework({
    academicYearId: new mongoose.Types.ObjectId(),
    sectionId: new mongoose.Types.ObjectId(),
    subjectId: new mongoose.Types.ObjectId(),
    teacherId: new mongoose.Types.ObjectId(),
    title: "Complete Mathematics Exercise 1",
    description: "Complete questions 1 to 10.",
    assignedDate: new Date("2026-11-08T00:00:00.000Z"),
    dueDate: new Date("2026-11-12T00:00:00.000Z"),
  });

test("Valid homework should pass validation", async () => {
  const homework = createValidHomework();

  const error = await homework.validate().catch((err) => err);

  assert.equal(error, undefined);
});

test("Homework should default to Active status", () => {
  const homework = createValidHomework();

  assert.equal(homework.status, "Active");
});

test("Homework should reject missing Academic Year ID", async () => {
  const homework = createValidHomework();
  homework.academicYearId = undefined;

  const error = await homework.validate().catch((err) => err);

  assert.ok(error);
  assert.ok(error.errors.academicYearId);
});

test("Homework should reject missing Section ID", async () => {
  const homework = createValidHomework();
  homework.sectionId = undefined;

  const error = await homework.validate().catch((err) => err);

  assert.ok(error);
  assert.ok(error.errors.sectionId);
});

test("Homework should reject missing Subject ID", async () => {
  const homework = createValidHomework();
  homework.subjectId = undefined;

  const error = await homework.validate().catch((err) => err);

  assert.ok(error);
  assert.ok(error.errors.subjectId);
});

test("Homework should reject missing Teacher ID", async () => {
  const homework = createValidHomework();
  homework.teacherId = undefined;

  const error = await homework.validate().catch((err) => err);

  assert.ok(error);
  assert.ok(error.errors.teacherId);
});

test("Homework should reject missing title", async () => {
  const homework = createValidHomework();
  homework.title = "";

  const error = await homework.validate().catch((err) => err);

  assert.ok(error);
  assert.ok(error.errors.title);
});

test("Homework should reject missing description", async () => {
  const homework = createValidHomework();
  homework.description = "";

  const error = await homework.validate().catch((err) => err);

  assert.ok(error);
  assert.ok(error.errors.description);
});

test("Homework should reject missing assigned date", async () => {
  const homework = createValidHomework();
  homework.assignedDate = undefined;

  const error = await homework.validate().catch((err) => err);

  assert.ok(error);
  assert.ok(error.errors.assignedDate);
});

test("Homework should reject missing due date", async () => {
  const homework = createValidHomework();
  homework.dueDate = undefined;

  const error = await homework.validate().catch((err) => err);

  assert.ok(error);
  assert.ok(error.errors.dueDate);
});

test("Homework should reject due date earlier than assigned date", async () => {
  const homework = createValidHomework();
  homework.assignedDate = new Date("2026-11-12T00:00:00.000Z");
  homework.dueDate = new Date("2026-11-10T00:00:00.000Z");

  const error = await homework.validate().catch((err) => err);

  assert.ok(error);
  assert.ok(error.errors.dueDate);
});

test("Homework should allow a future assigned date", async () => {
  const homework = createValidHomework();
  homework.assignedDate = new Date("2027-01-10T00:00:00.000Z");
  homework.dueDate = new Date("2027-01-15T00:00:00.000Z");

  const error = await homework.validate().catch((err) => err);

  assert.equal(error, undefined);
});

test("Homework should reject invalid status", async () => {
  const homework = createValidHomework();
  homework.status = "Pending";

  const error = await homework.validate().catch((err) => err);

  assert.ok(error);
  assert.ok(error.errors.status);
});

test("Homework should reject title longer than 150 characters", async () => {
  const homework = createValidHomework();
  homework.title = "A".repeat(151);

  const error = await homework.validate().catch((err) => err);

  assert.ok(error);
  assert.ok(error.errors.title);
});

test("Homework should reject description longer than 2000 characters", async () => {
  const homework = createValidHomework();
  homework.description = "A".repeat(2001);

  const error = await homework.validate().catch((err) => err);

  assert.ok(error);
  assert.ok(error.errors.description);
});

test("Homework should trim title and description", async () => {
  const homework = createValidHomework();
  homework.title = "  Mathematics Homework  ";
  homework.description = "  Complete Exercise 1.  ";

  await homework.validate();

  assert.equal(homework.title, "Mathematics Homework");
  assert.equal(homework.description, "Complete Exercise 1.");
});

test("Homework should reject invalid Academic Year ID format", async () => {
  const homework = createValidHomework();
  homework.academicYearId = "invalid-id";

  const error = await homework.validate().catch((err) => err);

  assert.ok(error);
  assert.ok(error.errors.academicYearId);
});

test("Homework should reject invalid Section ID format", async () => {
  const homework = createValidHomework();
  homework.sectionId = "invalid-id";

  const error = await homework.validate().catch((err) => err);

  assert.ok(error);
  assert.ok(error.errors.sectionId);
});

test("Homework should reject invalid Subject ID format", async () => {
  const homework = createValidHomework();
  homework.subjectId = "invalid-id";

  const error = await homework.validate().catch((err) => err);

  assert.ok(error);
  assert.ok(error.errors.subjectId);
});

test("Homework should reject invalid Teacher ID format", async () => {
  const homework = createValidHomework();
  homework.teacherId = "invalid-id";

  const error = await homework.validate().catch((err) => err);

  assert.ok(error);
  assert.ok(error.errors.teacherId);
});

test("Homework should not store a separate Class ID", async () => {
  const homework = new Homework({
    academicYearId: new mongoose.Types.ObjectId(),
    sectionId: new mongoose.Types.ObjectId(),
    classId: new mongoose.Types.ObjectId(),
    subjectId: new mongoose.Types.ObjectId(),
    teacherId: new mongoose.Types.ObjectId(),
    title: "Mathematics Homework",
    description: "Complete Exercise 1.",
    assignedDate: new Date("2026-11-08T00:00:00.000Z"),
    dueDate: new Date("2026-11-12T00:00:00.000Z"),
  });

  assert.equal(homework.classId, undefined);

  await homework.validate();
});
