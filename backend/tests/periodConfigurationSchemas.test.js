import test from "node:test";
import assert from "node:assert/strict";

import {
  createPeriodConfigurationSchema,
  updatePeriodConfigurationSchema
} from "../validators/periodConfigurationSchemas.js";

const validConfiguration = () => ({
  academicYearId: "507f1f77bcf86cd799439011",

  workingDays: [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday"
  ],

  weekdayPeriods: [
    {
      periodNumber: 1,
      name: "Period 1",
      startTime: "08:00",
      endTime: "08:45",
      type: "Teaching"
    },
    {
      periodNumber: 2,
      name: "Period 2",
      startTime: "08:45",
      endTime: "09:30",
      type: "Teaching"
    },
    {
      periodNumber: 3,
      name: "Lunch Break",
      startTime: "09:30",
      endTime: "09:45",
      type: "Break"
    }
  ],

  saturdayPeriods: [
    {
      periodNumber: 1,
      name: "Period 1",
      startTime: "08:00",
      endTime: "08:45",
      type: "Teaching"
    }
  ]
});

test("Valid period configuration should pass", () => {
  const result = createPeriodConfigurationSchema.safeParse(
    validConfiguration()
  );

  assert.equal(result.success, true);
});

test("Invalid Academic Year ID should fail", () => {
  const data = validConfiguration();
  data.academicYearId = "123";

  const result = createPeriodConfigurationSchema.safeParse(data);

  assert.equal(result.success, false);
});

test("Missing working days should fail", () => {
  const data = validConfiguration();
  data.workingDays = [];

  const result = createPeriodConfigurationSchema.safeParse(data);

  assert.equal(result.success, false);
});

test("Invalid working day should fail", () => {
  const data = validConfiguration();
  data.workingDays.push("Sunday");

  const result = createPeriodConfigurationSchema.safeParse(data);

  assert.equal(result.success, false);
});

test("Duplicate working days should fail", () => {
  const data = validConfiguration();
  data.workingDays.push("Monday");

  const result = createPeriodConfigurationSchema.safeParse(data);

  assert.equal(result.success, false);
});

test("Invalid time format should fail", () => {
  const data = validConfiguration();
  data.weekdayPeriods[0].startTime = "08 AM";

  const result = createPeriodConfigurationSchema.safeParse(data);

  assert.equal(result.success, false);
});

test("End time earlier than start time should fail", () => {
  const data = validConfiguration();
  data.weekdayPeriods[0].startTime = "10:00";
  data.weekdayPeriods[0].endTime = "09:00";

  const result = createPeriodConfigurationSchema.safeParse(data);

  assert.equal(result.success, false);
});

test("Overlapping periods should fail", () => {
  const data = validConfiguration();
  data.weekdayPeriods[1].startTime = "08:30";

  const result = createPeriodConfigurationSchema.safeParse(data);

  assert.equal(result.success, false);
});

test("Duplicate period numbers should fail", () => {
  const data = validConfiguration();
  data.weekdayPeriods[1].periodNumber = 1;

  const result = createPeriodConfigurationSchema.safeParse(data);

  assert.equal(result.success, false);
});

test("Empty period schedule should fail", () => {
  const data = validConfiguration();
  data.weekdayPeriods = [];

  const result = createPeriodConfigurationSchema.safeParse(data);

  assert.equal(result.success, false);
});

test("Empty update request should fail", () => {
  const result = updatePeriodConfigurationSchema.safeParse({});

  assert.equal(result.success, false);
});

test("Valid partial update should pass", () => {
  const result = updatePeriodConfigurationSchema.safeParse({
    status: "Inactive"
  });

  assert.equal(result.success, true);
});

test("Updating Academic Year ID should fail", () => {
  const result = updatePeriodConfigurationSchema.safeParse({
    academicYearId: "507f1f77bcf86cd799439011"
  });

  assert.equal(result.success, false);
});