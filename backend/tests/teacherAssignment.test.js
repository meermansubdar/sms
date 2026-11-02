import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import TeacherAssignment from "../models/TeacherAssignment.js";

test("TeacherAssignment model should be created successfully", async () => {
  const assignment = new TeacherAssignment({
    teacherId: new mongoose.Types.ObjectId(),
    subjectId: new mongoose.Types.ObjectId(),
    sectionId: new mongoose.Types.ObjectId(),
    academicYearId: new mongoose.Types.ObjectId(),
  });

  const error = await assignment.validate().catch((err) => err);

  assert.equal(error, undefined);
});

test("TeacherAssignment should default status to Active", async () => {
  const assignment = new TeacherAssignment({
    teacherId: new mongoose.Types.ObjectId(),
    subjectId: new mongoose.Types.ObjectId(),
    sectionId: new mongoose.Types.ObjectId(),
    academicYearId: new mongoose.Types.ObjectId(),
  });

  assert.equal(assignment.status, "Active");
});

test("TeacherAssignment should reject missing teacherId", async () => {
  const assignment = new TeacherAssignment({
    subjectId: new mongoose.Types.ObjectId(),
    sectionId: new mongoose.Types.ObjectId(),
    academicYearId: new mongoose.Types.ObjectId(),
  });

  const error = await assignment.validate().catch((err) => err);

  assert.ok(error);
  assert.ok(error.errors.teacherId);
});

test("TeacherAssignment should reject missing subjectId", async () => {
  const assignment = new TeacherAssignment({
    teacherId: new mongoose.Types.ObjectId(),
    sectionId: new mongoose.Types.ObjectId(),
    academicYearId: new mongoose.Types.ObjectId(),
  });

  const error = await assignment.validate().catch((err) => err);

  assert.ok(error);
  assert.ok(error.errors.subjectId);
});

test("TeacherAssignment should reject invalid status", async () => {
  const assignment = new TeacherAssignment({
    teacherId: new mongoose.Types.ObjectId(),
    subjectId: new mongoose.Types.ObjectId(),
    sectionId: new mongoose.Types.ObjectId(),
    academicYearId: new mongoose.Types.ObjectId(),
    status: "Pending",
  });



  const error = await assignment.validate().catch((err) => err);

  assert.ok(error);
  assert.ok(error.errors.status);
});

test("TeacherAssignment should have a unique index for subject, section and academic year", () => {
    const indexes = TeacherAssignment.schema.indexes();

    const uniqueIndex = indexes.find(
        ([fields, options]) =>
        fields.subjectId === 1 &&
        fields.sectionId === 1 &&
        fields.academicYearId === 1 &&
        options.unique === true
    );

      assert.ok(uniqueIndex, "Expected unique subject assignment index was not found.");

    assert.deepEqual(uniqueIndex[0], {
        subjectId: 1,
        sectionId: 1,
        academicYearId: 1,
    });

    assert.deepEqual(uniqueIndex[1].partialFilterExpression, {
        status: "Active",
    });
});

test("TeacherAssignment should reject missing sectionId", async () => {
  const assignment = new TeacherAssignment({
    teacherId: new mongoose.Types.ObjectId(),
    subjectId: new mongoose.Types.ObjectId(),
    academicYearId: new mongoose.Types.ObjectId(),
  });

  const error = await assignment.validate().catch((err) => err);

  assert.ok(error);
  assert.ok(error.errors.sectionId);
});

test("TeacherAssignment should reject missing academicYearId", async () => {
  const assignment = new TeacherAssignment({
    teacherId: new mongoose.Types.ObjectId(),
    subjectId: new mongoose.Types.ObjectId(),
    sectionId: new mongoose.Types.ObjectId(),
  });

  const error = await assignment.validate().catch((err) => err);

  assert.ok(error);
  assert.ok(error.errors.academicYearId);
});