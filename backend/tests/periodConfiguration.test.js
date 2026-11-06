
import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import PeriodConfiguration from "../models/PeriodConfiguration.js";


const createValidConfiguration = () =>
  new PeriodConfiguration({
    academicYearId: new mongoose.Types.ObjectId(),

    workingDays: [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ],

    weekdayPeriods: [
      {
        periodNumber: 1,
        name: "Period 1",
        startTime: "08:00",
        endTime: "08:45",
        type: "Teaching",
      },
      {
        periodNumber: 2,
        name: "Period 2",
        startTime: "08:45",
        endTime: "09:30",
        type: "Teaching",
      },
      {
        periodNumber: 3,
        name: "Lunch Break",
        startTime: "09:30",
        endTime: "09:45",
        type: "Break",
      },
    ],

    saturdayPeriods: [
      {
        periodNumber: 1,
        name: "Period 1",
        startTime: "08:00",
        endTime: "08:45",
        type: "Teaching",
      },
    ],
  });

test("PeriodConfiguration model should be created successfully", async () => {
  const configuration = createValidConfiguration();

  const error = await configuration.validate().catch((err) => err);

  assert.equal(error, undefined);
});

test("PeriodConfiguration should default status to Active", () => {
  const configuration = createValidConfiguration();

  assert.equal(configuration.status, "Active");
});

test("PeriodConfiguration should reject missing academicYearId", async () => {
  const configuration = createValidConfiguration();
  configuration.academicYearId = undefined;

  const error = await configuration.validate().catch((err) => err);

  assert.ok(error);
  assert.ok(error.errors.academicYearId);
});

test("PeriodConfiguration should reject invalid time format", async () => {
  const configuration = createValidConfiguration();
  configuration.weekdayPeriods[0].startTime = "07 AM";

  const error = await configuration.validate().catch((err) => err);

  assert.ok(error);
  assert.ok(error.errors["weekdayPeriods.0.startTime"]);
});

test("PeriodConfiguration should reject end time earlier than start time", async () => {
  const configuration = createValidConfiguration();
  configuration.weekdayPeriods[0].startTime = "10:00";
  configuration.weekdayPeriods[0].endTime = "09:00";

  const error = await configuration.validate().catch((err) => err);

  assert.ok(error);
  assert.ok(error.errors.weekdayPeriods);
});

test("PeriodConfiguration should reject overlapping periods", async () => {
  const configuration = createValidConfiguration();
  configuration.weekdayPeriods[1].startTime = "08:30";

  const error = await configuration.validate().catch((err) => err);

  assert.ok(error);
  assert.ok(error.errors.weekdayPeriods);
});

test("PeriodConfiguration should reject duplicate period numbers", async () => {
  const configuration = createValidConfiguration();
  configuration.weekdayPeriods[1].periodNumber = 1;

  const error = await configuration.validate().catch((err) => err);

  assert.ok(error);
  assert.ok(error.errors.weekdayPeriods);
});

test("PeriodConfiguration should reject invalid working days", async () => {
  const configuration = createValidConfiguration();
  configuration.workingDays.push("Sunday");

  const error = await configuration.validate().catch((err) => err);

  assert.ok(error);
  assert.ok(error.errors["workingDays.6"]);
});

test("PeriodConfiguration should allow different weekday and Saturday schedules", async () => {
  const configuration = createValidConfiguration();

  assert.equal(configuration.weekdayPeriods.length, 3);
  assert.equal(configuration.saturdayPeriods.length, 1);

  const error = await configuration.validate().catch((err) => err);

  assert.equal(error, undefined);
});
