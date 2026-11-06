import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import mongoose from "mongoose";

import app from "../app.js";
import User from "../models/User.js";

import {
  connectTestDatabase,
  disconnectTestDatabase,
} from "./testSetup.js";

import {
  generateTestToken,
  createAuthHeader,
} from "./testUtils.js";

import AcademicYear from "../models/AcademicYear.js";
import PeriodConfiguration from "../models/PeriodConfiguration.js";

const roles = [
  "Administrator",
  "Principal",
  "Teacher",
  "Student",
  "Parent",
  "Accountant",
];

const testUsers = {};
const testAcademicYears = {};
const inactiveTestAcademicYear = {};
const validPeriodSchedule = {
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
      name: "Short Break",
      startTime: "09:30",
      endTime: "09:45",
      type: "Break",
    },
  ],

  saturdayPeriods: [
    {
      periodNumber: 1,
      name: "Saturday Period 1",
      startTime: "08:00",
      endTime: "08:45",
      type: "Teaching",
    },
    {
      periodNumber: 2,
      name: "Saturday Period 2",
      startTime: "08:45",
      endTime: "09:30",
      type: "Teaching",
    },
  ],
};

before(async () => {
  await connectTestDatabase();

  for (const role of roles) {
    const user = await User.create({
      name: `Test ${role}`,
      email: `test.${role.toLowerCase()}@example.com`,
      passwordHash: "test-password-hash",
      role,
      status: "Active",
    });

    const token = generateTestToken(user._id, role);

    testUsers[role] = {
      user,
      token,
      headers: createAuthHeader(token),
    };
  }
  
  testAcademicYears.Administrator = await AcademicYear.create({
    name: "2098-2099",
    startDate: "2098-04-01",
    endDate: "2099-03-31",
    status: "Active",
  });

  testAcademicYears.Principal = await AcademicYear.create({
    name: "2099-2100",
    startDate: "2099-04-01",
    endDate: "2100-03-31",
    status: "Active",
  });

  inactiveTestAcademicYear.record = await AcademicYear.create({
    name: "2100-2101",
    startDate: "2100-04-01",
    endDate: "2101-03-31",
    status: "Inactive",
  });

});

after(async () => {

    await PeriodConfiguration.deleteMany({
        academicYearId: {
            $in: Object.values(testAcademicYears).map((year) => year._id),
        },
    });

    await PeriodConfiguration.deleteMany({
        academicYearId: inactiveTestAcademicYear.record._id,
    });

    await AcademicYear.deleteOne({
        _id: inactiveTestAcademicYear.record._id,
    });

    await AcademicYear.deleteMany({
        _id: {
            $in: Object.values(testAcademicYears).map((year) => year._id),
        },
    });

  await User.deleteMany({
    email: {
      $in: roles.map(
        (role) => `test.${role.toLowerCase()}@example.com`
      ),
    },
  });

  await disconnectTestDatabase();
});

test("Period Configuration API should require authentication", async () => {
  const response = await request(app)
    .get("/api/period-configurations");

  assert.equal(response.status, 401);
  assert.equal(response.body.success, false);
});

test("Administrator should be able to view Period Configurations", async () => {
  const response = await request(app)
    .get("/api/period-configurations")
    .set(testUsers.Administrator.headers);

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
});

test("Principal should be able to view Period Configurations", async () => {
  const response = await request(app)
    .get("/api/period-configurations")
    .set(testUsers.Principal.headers);

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
});

test("Teacher should be able to view Period Configurations", async () => {
  const response = await request(app)
    .get("/api/period-configurations")
    .set(testUsers.Teacher.headers);

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
});

test("Accountant should be able to view Period Configurations", async () => {
  const response = await request(app)
    .get("/api/period-configurations")
    .set(testUsers.Accountant.headers);

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
});

test("Student should not be able to view Period Configurations", async () => {
  const response = await request(app)
    .get("/api/period-configurations")
    .set(testUsers.Student.headers);

  assert.equal(response.status, 403);
});

test("Parent should not be able to view Period Configurations", async () => {
  const response = await request(app)
    .get("/api/period-configurations")
    .set(testUsers.Parent.headers);

  assert.equal(response.status, 403);
});

test("Administrator should be able to create Period Configuration", async () => {
  const response = await request(app)
    .post("/api/period-configurations")
    .set(testUsers.Administrator.headers)
    .send({
      academicYearId: testAcademicYears.Administrator._id.toString(),
      ...validPeriodSchedule,
    });

  assert.equal(response.status, 201);
  assert.equal(response.body.success, true);
  assert.equal(
    response.body.data.academicYearId.name,
    "2098-2099"
  );
});

test("Principal should be able to create Period Configuration", async () => {
  const response = await request(app)
    .post("/api/period-configurations")
    .set(testUsers.Principal.headers)
    .send({
      academicYearId: testAcademicYears.Principal._id.toString(),
      ...validPeriodSchedule,
    });

  assert.equal(response.status, 201);
  assert.equal(response.body.success, true);
  assert.equal(
    response.body.data.academicYearId.name,
    "2099-2100"
  );
});

test("Teacher should not be able to create Period Configuration", async () => {
  const response = await request(app)
    .post("/api/period-configurations")
    .set(testUsers.Teacher.headers)
    .send({
      academicYearId: testAcademicYears.Administrator._id.toString(),
      ...validPeriodSchedule,
    });

  assert.equal(response.status, 403);
});

test("Accountant should not be able to create Period Configuration", async () => {
  const response = await request(app)
    .post("/api/period-configurations")
    .set(testUsers.Accountant.headers)
    .send({
      academicYearId: testAcademicYears.Administrator._id.toString(),
      ...validPeriodSchedule,
    });

  assert.equal(response.status, 403);
});

test("Student should not be able to create Period Configuration", async () => {
  const response = await request(app)
    .post("/api/period-configurations")
    .set(testUsers.Student.headers)
    .send({
      academicYearId: testAcademicYears.Administrator._id.toString(),
      ...validPeriodSchedule,
    });

  assert.equal(response.status, 403);
});

test("Parent should not be able to create Period Configuration", async () => {
  const response = await request(app)
    .post("/api/period-configurations")
    .set(testUsers.Parent.headers)
    .send({
      academicYearId: testAcademicYears.Administrator._id.toString(),
      ...validPeriodSchedule,
    });

  assert.equal(response.status, 403);
});

test("Should not allow duplicate Period Configuration for the same Academic Year", async () => {
  const response = await request(app)
    .post("/api/period-configurations")
    .set(testUsers.Administrator.headers)
    .send({
      academicYearId: testAcademicYears.Administrator._id.toString(),
      ...validPeriodSchedule,
    });

  assert.equal(response.status, 409);
  assert.equal(response.body.success, false);
  assert.equal(
    response.body.message,
    "A Period Configuration already exists for this Academic Year."
  );
});

test("Should reject an invalid Academic Year ID", async () => {
  const response = await request(app)
    .post("/api/period-configurations")
    .set(testUsers.Administrator.headers)
    .send({
      academicYearId: "invalid-id",
      ...validPeriodSchedule,
    });

  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
});

test("Should reject a non-existent Academic Year ID", async () => {
  const nonExistentId = new (await import("mongoose")).default.Types.ObjectId();

  const response = await request(app)
    .post("/api/period-configurations")
    .set(testUsers.Administrator.headers)
    .send({
      academicYearId: nonExistentId.toString(),
      ...validPeriodSchedule,
    });

  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
  assert.equal(response.body.message, "Academic Year not found.");
});

test("Should not allow Period Configuration for an inactive Academic Year", async () => {
  const response = await request(app)
    .post("/api/period-configurations")
    .set(testUsers.Administrator.headers)
    .send({
      academicYearId: inactiveTestAcademicYear.record._id.toString(),
      ...validPeriodSchedule,
    });

  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
  assert.equal(
    response.body.message,
    "Selected Academic Year is inactive."
  );
});

test("Should reject duplicate period numbers in weekday schedule", async () => {
  const response = await request(app)
    .post("/api/period-configurations")
    .set(testUsers.Administrator.headers)
    .send({
      academicYearId: testAcademicYears.Administrator._id.toString(),
      ...validPeriodSchedule,
      weekdayPeriods: [
        {
          periodNumber: 1,
          name: "Period 1",
          startTime: "08:00",
          endTime: "08:45",
          type: "Teaching",
        },
        {
          periodNumber: 1,
          name: "Period 2",
          startTime: "08:45",
          endTime: "09:30",
          type: "Teaching",
        },
      ],
    });

  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
  assert.ok(
    response.body.errors.some((error) =>
      error.message.includes("Period numbers must be unique")
    )
  );
});

test("Should reject an invalid time format in weekday schedule", async () => {
  const response = await request(app)
    .post("/api/period-configurations")
    .set(testUsers.Administrator.headers)
    .send({
      academicYearId: testAcademicYears.Administrator._id.toString(),
      ...validPeriodSchedule,
      weekdayPeriods: [
        {
          periodNumber: 1,
          name: "Period 1",
          startTime: "8:00 AM",
          endTime: "08:45",
          type: "Teaching",
        },
      ],
    });

  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
  assert.ok(
    response.body.errors.some((error) =>
      error.message.includes("Use HH:MM format.")
    )
  );
});

test("Should reject a period when end time is earlier than start time", async () => {
  const response = await request(app)
    .post("/api/period-configurations")
    .set(testUsers.Administrator.headers)
    .send({
      academicYearId: testAcademicYears.Administrator._id.toString(),
      ...validPeriodSchedule,
      weekdayPeriods: [
        {
          periodNumber: 1,
          name: "Period 1",
          startTime: "09:00",
          endTime: "08:00",
          type: "Teaching",
        },
      ],
    });

  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
  assert.ok(
    response.body.errors.some((error) =>
      error.message.includes(
        "Period end time must be later than start time."
      )
    )
  );
});

test("Should reject overlapping periods in weekday schedule", async () => {
  const response = await request(app)
    .post("/api/period-configurations")
    .set(testUsers.Administrator.headers)
    .send({
      academicYearId: testAcademicYears.Administrator._id.toString(),
      ...validPeriodSchedule,
      weekdayPeriods: [
        {
          periodNumber: 1,
          name: "Period 1",
          startTime: "08:00",
          endTime: "09:00",
          type: "Teaching",
        },
        {
          periodNumber: 2,
          name: "Period 2",
          startTime: "08:45",
          endTime: "09:30",
          type: "Teaching",
        },
      ],
    });

  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
  assert.ok(
    response.body.errors.some((error) =>
      error.message.includes("Periods must not overlap.")
    )
  );
});

test("Should reject an empty weekday schedule", async () => {
  const response = await request(app)
    .post("/api/period-configurations")
    .set(testUsers.Administrator.headers)
    .send({
      academicYearId: testAcademicYears.Administrator._id.toString(),
      ...validPeriodSchedule,
      weekdayPeriods: [],
    });

  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
  assert.ok(
    response.body.errors.some((error) =>
      error.message.includes("At least one weekday period is required.")
    )
  );
});

test("Should reject an empty Saturday schedule", async () => {
  const response = await request(app)
    .post("/api/period-configurations")
    .set(testUsers.Administrator.headers)
    .send({
      academicYearId: testAcademicYears.Administrator._id.toString(),
      ...validPeriodSchedule,
      saturdayPeriods: [],
    });

  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
  assert.ok(
    response.body.errors.some((error) =>
      error.message.includes("At least one Saturday period is required.")
    )
  );
});

test("Should reject an invalid working day", async () => {
  const response = await request(app)
    .post("/api/period-configurations")
    .set(testUsers.Administrator.headers)
    .send({
      academicYearId: testAcademicYears.Administrator._id.toString(),
      ...validPeriodSchedule,
      workingDays: [
        "Monday",
        "Tuesday",
        "Sunday",
      ],
    });

  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
});

test("Should reject duplicate working days", async () => {
  const response = await request(app)
    .post("/api/period-configurations")
    .set(testUsers.Administrator.headers)
    .send({
      academicYearId: testAcademicYears.Administrator._id.toString(),
      ...validPeriodSchedule,
      workingDays: [
        "Monday",
        "Tuesday",
        "Monday",
      ],
    });

  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
  assert.ok(
    response.body.errors.some((error) =>
      error.message.includes("Working days must not contain duplicates.")
    )
  );
});

test("Should retrieve a Period Configuration by ID", async () => {
  const createdConfiguration = await PeriodConfiguration.findOne({
    academicYearId: testAcademicYears.Administrator._id,
  });

  assert.ok(createdConfiguration);

  const response = await request(app)
    .get(`/api/period-configurations/${createdConfiguration._id}`)
    .set(testUsers.Administrator.headers);

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(
    response.body.data.academicYearId.name,
    "2098-2099"
  );
});

test("Should reject an invalid Period Configuration ID", async () => {
  const response = await request(app)
    .get("/api/period-configurations/invalid-id")
    .set(testUsers.Administrator.headers);

  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
  assert.equal(
    response.body.message,
    "Invalid Period Configuration ID."
  );
});

test("Should return 404 for a non-existent Period Configuration ID", async () => {
  const mongoose = await import("mongoose");
  const nonExistentId = new mongoose.default.Types.ObjectId();

  const response = await request(app)
    .get(`/api/period-configurations/${nonExistentId}`)
    .set(testUsers.Administrator.headers);

  assert.equal(response.status, 404);
  assert.equal(response.body.success, false);
  assert.equal(
    response.body.message,
    "Period Configuration not found."
  );
});

test("Should filter Period Configurations by Academic Year ID", async () => {
  const response = await request(app)
    .get(
      `/api/period-configurations?academicYearId=${testAcademicYears.Administrator._id}`
    )
    .set(testUsers.Administrator.headers);

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.data.length, 1);

  assert.equal(
    response.body.data[0].academicYearId.name,
    "2098-2099"
  );
});

test("Should reject an invalid Academic Year ID in list filter", async () => {
  const response = await request(app)
    .get("/api/period-configurations?academicYearId=invalid-id")
    .set(testUsers.Administrator.headers);

  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
  assert.equal(
    response.body.message,
    "Invalid Academic Year ID."
  );
});

test("Should filter Period Configurations by status", async () => {
  const response = await request(app)
    .get("/api/period-configurations?status=Active")
    .set(testUsers.Administrator.headers);

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);

  assert.ok(
    response.body.data.every(
      (configuration) => configuration.status === "Active"
    )
  );
});

test("Should reject an invalid status in list filter", async () => {
  const response = await request(app)
    .get("/api/period-configurations?status=Pending")
    .set(testUsers.Administrator.headers);

  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
  assert.equal(
    response.body.message,
    "Invalid status."
  );
});

test("Administrator should be able to update Period Configuration", async () => {
  const configuration = await PeriodConfiguration.findOne({
    academicYearId: testAcademicYears.Administrator._id,
  });

  assert.ok(configuration, "Test Period Configuration should exist.");

  const updatedSchedule = {
    weekdayPeriods: [
      {
        periodNumber: 1,
        name: "Updated Period 1",
        startTime: "08:00",
        endTime: "08:40",
        type: "Teaching",
      },
      {
        periodNumber: 2,
        name: "Updated Period 2",
        startTime: "08:40",
        endTime: "09:20",
        type: "Teaching",
      },
    ],
  };

  const response = await request(app)
    .patch(`/api/period-configurations/${configuration._id}`)
    .set(testUsers.Administrator.headers)
    .send(updatedSchedule);

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);

  assert.equal(
    response.body.message,
    "Period Configuration updated successfully."
  );

  assert.equal(
    response.body.data.weekdayPeriods[0].name,
    "Updated Period 1"
  );

  assert.equal(
    response.body.data.weekdayPeriods[0].endTime,
    "08:40"
  );

  assert.equal(
    response.body.data.academicYearId.name,
    "2098-2099"
  );
});

test("Principal should be able to update Period Configuration", async () => {
  const configuration = await PeriodConfiguration.findOne({
    academicYearId: testAcademicYears.Principal._id,
  });

  assert.ok(configuration, "Test Period Configuration should exist.");

  const updatedSchedule = {
    saturdayPeriods: [
      {
        periodNumber: 1,
        name: "Updated Saturday Period 1",
        startTime: "08:00",
        endTime: "08:40",
        type: "Teaching",
      },
      {
        periodNumber: 2,
        name: "Updated Saturday Period 2",
        startTime: "08:40",
        endTime: "09:20",
        type: "Teaching",
      },
    ],
  };

  const response = await request(app)
    .patch(`/api/period-configurations/${configuration._id}`)
    .set(testUsers.Principal.headers)
    .send(updatedSchedule);

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);

  assert.equal(
    response.body.data.saturdayPeriods[0].name,
    "Updated Saturday Period 1"
  );

  assert.equal(
    response.body.data.academicYearId.name,
    "2099-2100"
  );
});

test("Teacher should not be able to update Period Configuration", async () => {
  const configuration = await PeriodConfiguration.findOne({
    academicYearId: testAcademicYears.Administrator._id,
  });

  assert.ok(configuration, "Test Period Configuration should exist.");

  const response = await request(app)
    .patch(`/api/period-configurations/${configuration._id}`)
    .set(testUsers.Teacher.headers)
    .send({
      status: "Inactive",
    });

  assert.equal(response.status, 403);
  assert.equal(response.body.success, false);
});

test("Accountant should not be able to update Period Configuration", async () => {
  const configuration = await PeriodConfiguration.findOne({
    academicYearId: testAcademicYears.Administrator._id,
  });

  assert.ok(configuration, "Test Period Configuration should exist.");

  const response = await request(app)
    .patch(`/api/period-configurations/${configuration._id}`)
    .set(testUsers.Accountant.headers)
    .send({
      status: "Inactive",
    });

  assert.equal(response.status, 403);
  assert.equal(response.body.success, false);
});

test("Student should not be able to update Period Configuration", async () => {
  const configuration = await PeriodConfiguration.findOne({
    academicYearId: testAcademicYears.Administrator._id,
  });

  assert.ok(configuration, "Test Period Configuration should exist.");

  const response = await request(app)
    .patch(`/api/period-configurations/${configuration._id}`)
    .set(testUsers.Student.headers)
    .send({
      status: "Inactive",
    });

  assert.equal(response.status, 403);
  assert.equal(response.body.success, false);
});

// 38. Parent should not be able to update Period Configuration
test("Parent should not be able to update Period Configuration", async () => {
  const configuration = await PeriodConfiguration.findOne({
    academicYearId: testAcademicYears.Administrator._id,
  });

  assert.ok(configuration);

  const response = await request(app)
    .patch(`/api/period-configurations/${configuration._id}`)
    .set(testUsers.Parent.headers)
    .send({ status: "Inactive" });

  assert.equal(response.status, 403);
  assert.equal(response.body.success, false);
});


// 39. Reject invalid Period Configuration ID during update
test("Should reject an invalid Period Configuration ID during update", async () => {
  const response = await request(app)
    .patch("/api/period-configurations/invalid-id")
    .set(testUsers.Administrator.headers)
    .send({ status: "Inactive" });

  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
});


// 40. Return 404 when updating a non-existent configuration
test("Should return 404 when updating a non-existent Period Configuration", async () => {
  const nonExistentId = new mongoose.Types.ObjectId();

  const response = await request(app)
    .patch(`/api/period-configurations/${nonExistentId}`)
    .set(testUsers.Administrator.headers)
    .send({ status: "Inactive" });

  assert.equal(response.status, 404);
  assert.equal(response.body.success, false);
});


// 41. Reject an empty update request
test("Should reject an empty Period Configuration update", async () => {
  const configuration = await PeriodConfiguration.findOne({
    academicYearId: testAcademicYears.Administrator._id,
  });

  assert.ok(configuration);

  const response = await request(app)
    .patch(`/api/period-configurations/${configuration._id}`)
    .set(testUsers.Administrator.headers)
    .send({});

  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
});


// 42. Reject invalid schedule data during update
test("Should reject an invalid schedule during Period Configuration update", async () => {
  const configuration = await PeriodConfiguration.findOne({
    academicYearId: testAcademicYears.Administrator._id,
  });

  assert.ok(configuration);

  const response = await request(app)
    .patch(`/api/period-configurations/${configuration._id}`)
    .set(testUsers.Administrator.headers)
    .send({
      weekdayPeriods: [],
    });

  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
});


// 43. Administrator should be able to deactivate Period Configuration
test("Administrator should be able to deactivate Period Configuration", async () => {
  const configuration = await PeriodConfiguration.findOne({
    academicYearId: testAcademicYears.Administrator._id,
  });

  assert.ok(configuration);

  const response = await request(app)
    .patch(`/api/period-configurations/${configuration._id}`)
    .set(testUsers.Administrator.headers)
    .send({ status: "Inactive" });

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.data.status, "Inactive");
});


// 44. Administrator should be able to reactivate Period Configuration
test("Administrator should be able to reactivate Period Configuration", async () => {
  const configuration = await PeriodConfiguration.findOne({
    academicYearId: testAcademicYears.Administrator._id,
  });

  assert.ok(configuration);

  const response = await request(app)
    .patch(`/api/period-configurations/${configuration._id}`)
    .set(testUsers.Administrator.headers)
    .send({ status: "Active" });

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.data.status, "Active");
});


// 45. Do not allow schedule changes for an inactive Academic Year
test("Should not allow schedule changes when Academic Year is inactive", async () => {
  const configuration = await PeriodConfiguration.create({
    academicYearId: inactiveTestAcademicYear.record._id,
    ...validPeriodSchedule,
  });

  const response = await request(app)
    .patch(`/api/period-configurations/${configuration._id}`)
    .set(testUsers.Administrator.headers)
    .send({
      weekdayPeriods: [
        {
          periodNumber: 1,
          name: "Changed Period",
          startTime: "08:00",
          endTime: "08:45",
          type: "Teaching",
        },
      ],
    });

  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
});


// 46. Allow deactivation when Academic Year is inactive
test("Should allow deactivation of Period Configuration for an inactive Academic Year", async () => {
  const configuration = await PeriodConfiguration.findOne({
    academicYearId: inactiveTestAcademicYear.record._id,
  });

  assert.ok(configuration);

  const response = await request(app)
    .patch(`/api/period-configurations/${configuration._id}`)
    .set(testUsers.Administrator.headers)
    .send({ status: "Inactive" });

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.data.status, "Inactive");
});