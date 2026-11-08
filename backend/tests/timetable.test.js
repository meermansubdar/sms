import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";

import Timetable from "../models/Timetable.js";

const createValidTimetable = () =>
  new Timetable({
    academicYearId: new mongoose.Types.ObjectId(),
    sectionId: new mongoose.Types.ObjectId(),
    day: "Monday",
    periodNumber: 1,
    subjectId: new mongoose.Types.ObjectId(),
    teacherId: new mongoose.Types.ObjectId(),
  });

test("Valid timetable entry should pass validation", async () => {
  const timetable = createValidTimetable();

  const error = await timetable.validate().catch((err) => err);

  assert.equal(error, undefined);
});

test("Room number should be optional", async () => {
  const timetable = createValidTimetable();

  assert.equal(timetable.roomNumber, "");

  const error = await timetable.validate().catch((err) => err);

  assert.equal(error, undefined);
});

test("Room number should be accepted when provided", async () => {
  const timetable = createValidTimetable();
  timetable.roomNumber = "Science Lab 1";

  const error = await timetable.validate().catch((err) => err);

  assert.equal(error, undefined);
});

test("Timetable should reject missing Academic Year ID", async () => {
  const timetable = createValidTimetable();
  timetable.academicYearId = undefined;

  const error = await timetable.validate().catch((err) => err);

  assert.ok(error);
  assert.ok(error.errors.academicYearId);
});

test("Timetable should reject missing Section ID", async () => {
  const timetable = createValidTimetable();
  timetable.sectionId = undefined;

  const error = await timetable.validate().catch((err) => err);

  assert.ok(error);
  assert.ok(error.errors.sectionId);
});

test("Timetable should reject missing Subject ID", async () => {
  const timetable = createValidTimetable();
  timetable.subjectId = undefined;

  const error = await timetable.validate().catch((err) => err);

  assert.ok(error);
  assert.ok(error.errors.subjectId);
});

test("Timetable should reject missing Teacher ID", async () => {
  const timetable = createValidTimetable();
  timetable.teacherId = undefined;

  const error = await timetable.validate().catch((err) => err);

  assert.ok(error);
  assert.ok(error.errors.teacherId);
});

test("Timetable should reject invalid day", async () => {
  const timetable = createValidTimetable();
  timetable.day = "Sunday";

  const error = await timetable.validate().catch((err) => err);

  assert.ok(error);
  assert.ok(error.errors.day);
});

test("Timetable should reject period number less than 1", async () => {
  const timetable = createValidTimetable();
  timetable.periodNumber = 0;

  const error = await timetable.validate().catch((err) => err);

  assert.ok(error);
  assert.ok(error.errors.periodNumber);
});

test("Timetable should reject decimal period number", async () => {
  const timetable = createValidTimetable();
  timetable.periodNumber = 1.5;

  const error = await timetable.validate().catch((err) => err);

  assert.ok(error);
  assert.ok(error.errors.periodNumber);
});

test("Timetable should reject room number longer than 30 characters", async () => {
  const timetable = createValidTimetable();
  timetable.roomNumber = "A".repeat(31);

  const error = await timetable.validate().catch((err) => err);

  assert.ok(error);
  assert.ok(error.errors.roomNumber);
});

test("Timetable should trim room number", async () => {
  const timetable = createValidTimetable();
  timetable.roomNumber = "  Science Lab  ";

  await timetable.validate();

  assert.equal(timetable.roomNumber, "Science Lab");
});

test("Timetable should define a unique section-day-period index", () => {
  const indexes = Timetable.schema.indexes();

  const uniqueIndex = indexes.find(
    ([fields, options]) =>
      fields.academicYearId === 1 &&
      fields.sectionId === 1 &&
      fields.day === 1 &&
      fields.periodNumber === 1 &&
      options.unique === true
  );

  assert.ok(uniqueIndex);
});


test("Timetable should reject missing Day", async () => {
  const timetable = createValidTimetable();
  timetable.day = undefined;

  const error = await timetable.validate().catch((err) => err);

  assert.ok(error);
  assert.ok(error.errors.day);
});

test("Timetable should reject invalid Academic Year ID format", async () => {
  const timetable = createValidTimetable();
  timetable.academicYearId = "invalid-id";

  const error = await timetable.validate().catch((err) => err);

  assert.ok(error);
  assert.ok(error.errors.academicYearId);
});

test("Timetable should reject invalid Section ID format", async () => {
  const timetable = createValidTimetable();
  timetable.sectionId = "invalid-id";

  const error = await timetable.validate().catch((err) => err);

  assert.ok(error);
  assert.ok(error.errors.sectionId);
});

test("Timetable should reject invalid Subject ID format", async () => {
  const timetable = createValidTimetable();
  timetable.subjectId = "invalid-id";

  const error = await timetable.validate().catch((err) => err);

  assert.ok(error);
  assert.ok(error.errors.subjectId);
});

test("Timetable should reject invalid Teacher ID format", async () => {
  const timetable = createValidTimetable();
  timetable.teacherId = "invalid-id";

  const error = await timetable.validate().catch((err) => err);

  assert.ok(error);
  assert.ok(error.errors.teacherId);
});

test("Timetable should accept an empty room number", async () => {
  const timetable = createValidTimetable();
  timetable.roomNumber = "";

  const error = await timetable.validate().catch((err) => err);

  assert.equal(error, undefined);
  assert.equal(timetable.roomNumber, "");
});

test("Timetable should define a teacher timetable search index", () => {
  const indexes = Timetable.schema.indexes();

  const teacherIndex = indexes.find(
    ([fields]) =>
      fields.academicYearId === 1 &&
      fields.teacherId === 1 &&
      fields.day === 1 &&
      fields.periodNumber === 1
  );

  assert.ok(teacherIndex);
});

test("Timetable should define a room timetable search index", () => {
  const indexes = Timetable.schema.indexes();

  const roomIndex = indexes.find(
    ([fields]) =>
      fields.academicYearId === 1 &&
      fields.roomNumber === 1 &&
      fields.day === 1 &&
      fields.periodNumber === 1
  );

  assert.ok(roomIndex);
});

test("Timetable should not store a separate Class ID", async () => {
  const timetable = new Timetable({
    academicYearId: new mongoose.Types.ObjectId(),
    sectionId: new mongoose.Types.ObjectId(),
    classId: new mongoose.Types.ObjectId(),
    day: "Monday",
    periodNumber: 1,
    subjectId: new mongoose.Types.ObjectId(),
    teacherId: new mongoose.Types.ObjectId(),
  });

  assert.equal(timetable.classId, undefined);

  await timetable.validate();
});
