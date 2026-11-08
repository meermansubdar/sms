import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import mongoose from "mongoose";

import app from "../app.js";

import User from "../models/User.js";
import AcademicYear from "../models/AcademicYear.js";
import SchoolClass from "../models/SchoolClass.js";
import Section from "../models/Section.js";
import Subject from "../models/Subject.js";
import TeacherAssignment from "../models/TeacherAssignment.js";
import PeriodConfiguration from "../models/PeriodConfiguration.js";
import Timetable from "../models/Timetable.js";

import {
  connectTestDatabase,
  disconnectTestDatabase,
} from "./testSetup.js";

import {
  generateTestToken,
  createAuthHeader,
} from "./testUtils.js";

// User roles used for Timetable API testing.
const roles = [
  "Administrator",
  "Principal",
  "Teacher",
  "Student",
  "Parent",
  "Accountant"
];

// Store test users and their authentication tokens.
const testUsers = {};

// Store test records created for Timetable API testing.
const testData = {
  academicYear: null,
  schoolClass: null,
  section: null,
  sectionB: null,
  subject: null,
  subject2: null,
  teacher2: null,
  inactiveAcademicYear: null,
  inactiveSection: null,
  inactiveSubject: null,
  inactiveTeacher: null,
  periodConfiguration: null,
  timetableEntry: null
};

// Valid Period Configuration used during testing.
const validPeriodSchedule = {
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
      name: "Short Break",
      startTime: "09:30",
      endTime: "09:45",
      type: "Break"
    }
  ],

  saturdayPeriods: [
    {
      periodNumber: 1,
      name: "Saturday Period 1",
      startTime: "08:00",
      endTime: "08:45",
      type: "Teaching"
    },
    {
      periodNumber: 2,
      name: "Saturday Period 2",
      startTime: "08:45",
      endTime: "09:30",
      type: "Teaching"
    }
  ]
};

// Create test users and authentication tokens.
before(async () => {
  await connectTestDatabase();

  for (const role of roles) {
    const user = await User.create({
      name: `Test ${role}`,
      email: `test.${role.toLowerCase()}@example.com`,
      passwordHash: "test-password-hash",
      role,
      status: "Active"
    });

    const token = generateTestToken(user._id, role);

    testUsers[role] = {
      user,
      token,
      headers: createAuthHeader(token)
    };
  }
});

// Create an additional Teacher for clash and access testing.
const createSecondTeacher = async () => {
  const teacher = await User.create({
    name: "Test Second Teacher",
    email: "test.secondteacher@example.com",
    passwordHash: "test-password-hash",
    role: "Teacher",
    status: "Active"
  });

  testData.teacher2 = teacher;

  return teacher;
};

// Create Academic Years for Timetable API testing.
const createAcademicYears = async () => {
  const academicYear = await AcademicYear.create({
    name: "2098-2099",
    startDate: new Date("2098-04-01"),
    endDate: new Date("2099-03-31"),
    status: "Active"
  });

  const inactiveAcademicYear = await AcademicYear.create({
    name: "2099-2100",
    startDate: new Date("2099-04-01"),
    endDate: new Date("2100-03-31"),
    status: "Inactive"
  });

  testData.academicYear = academicYear;
  testData.inactiveAcademicYear = inactiveAcademicYear;

  return {
    academicYear,
    inactiveAcademicYear
  };
};

// Create a School Class for Timetable API testing.
const createSchoolClass = async () => {
  const schoolClass = await SchoolClass.create({
    name: "Class 7",
    gradeNumber: 7,
    status: "Active"
  });

  testData.schoolClass = schoolClass;

  return schoolClass;
};

// Create Sections for Timetable API testing.
const createSections = async () => {
  const sectionA = await Section.create({
    name: "A",
    classId: testData.schoolClass._id,
    status: "Active"
  });

  const sectionB = await Section.create({
    name: "B",
    classId: testData.schoolClass._id,
    status: "Active"
  });

  testData.sectionB = sectionB;

  const inactiveSection = await Section.create({
    name: "C",
    classId: testData.schoolClass._id,
    status: "Inactive"
  });

  testData.section = sectionA;
  testData.inactiveSection = inactiveSection;

  return {
    sectionA,
    sectionB,
    inactiveSection
  };
};

// Create Subjects for Timetable API testing.
const createSubjects = async () => {
  const subject1 = await Subject.create({
    name: "Mathematics",
    code: "MATH",
    status: "Active"
  });

  const subject2 = await Subject.create({
    name: "Science",
    code: "SCI",
    status: "Active"
  });

  testData.subject2 = subject2;

  const inactiveSubject = await Subject.create({
    name: "History",
    code: "HIST",
    status: "Inactive"
  });

  testData.subject = subject1;
  testData.inactiveSubject = inactiveSubject;

  return {
    subject1,
    subject2,
    inactiveSubject
  };
};

// Create Teacher Assignments for Timetable API testing.
const createTeacherAssignments = async (sectionA, sectionB, subject1, subject2) => {
  const teacher1 = testUsers.Teacher.user;
  const teacher2 = testData.teacher2;

  const assignments = await TeacherAssignment.insertMany([
    {
      teacherId: teacher1._id,
      subjectId: subject1._id,
      sectionId: sectionA._id,
      academicYearId: testData.academicYear._id,
      status: "Active"
    },
    {
      teacherId: teacher1._id,
      subjectId: subject2._id,
      sectionId: sectionB._id,
      academicYearId: testData.academicYear._id,
      status: "Active"
    },
    {
      teacherId: teacher2._id,
      subjectId: subject1._id,
      sectionId: sectionB._id,
      academicYearId: testData.academicYear._id,
      status: "Active"
    }
  ]);

  return assignments;
};

// Create an active Period Configuration for testing.
const createPeriodConfiguration = async () => {
  const configuration = await PeriodConfiguration.create({
    academicYearId: testData.academicYear._id,
    ...validPeriodSchedule,
    status: "Active"
  });

  testData.periodConfiguration = configuration;

  return configuration;
};

// Create all required test records before running API tests.
before(async () => {
  await createSecondTeacher();

  await createAcademicYears();

  await createSchoolClass();

  const { sectionA, sectionB } = await createSections();

  const { subject1, subject2 } = await createSubjects();

  await createTeacherAssignments(
    sectionA,
    sectionB,
    subject1,
    subject2
  );

  await createPeriodConfiguration();
});

// Clean up all test records after API testing.
after(async () => {
  await Timetable.deleteMany({});
  await TeacherAssignment.deleteMany({});
  await PeriodConfiguration.deleteMany({});
  await Section.deleteMany({});
  await SchoolClass.deleteMany({});
  await Subject.deleteMany({});
  await AcademicYear.deleteMany({});

  await User.deleteMany({
    email: {
      $in: [
        "test.administrator@example.com",
        "test.principal@example.com",
        "test.teacher@example.com",
        "test.student@example.com",
        "test.parent@example.com",
        "test.accountant@example.com",
        "test.secondteacher@example.com"
      ]
    }
  });

  await disconnectTestDatabase();
});

// Prepare valid Timetable data for API requests.
const getValidTimetableData = () => ({
  academicYearId: testData.academicYear._id.toString(),
  sectionId: testData.section._id.toString(),
  day: "Monday",
  periodNumber: 1,
  subjectId: testData.subject._id.toString(),
  teacherId: testUsers.Teacher.user._id.toString(),
  roomNumber: "Room 101"
});

// Timetable API should require authentication.
test("Timetable API should require authentication", async () => {
  const response = await request(app)
    .get("/api/timetables");

  assert.equal(response.status, 401);
  assert.equal(response.body.success, false);
});

// Only authorized roles should be able to view Timetable records.
test("Authorized roles should be able to view Timetable records", async () => {
  const allowedRoles = [
    "Administrator",
    "Principal",
    "Teacher",
    "Accountant"
  ];

  for (const role of allowedRoles) {
    const response = await request(app)
      .get("/api/timetables")
      .set(testUsers[role].headers);

    assert.equal(
      response.status,
      200,
      `${role} should be able to view Timetable records.`
    );
  }
});

// Student and Parent should not be able to view Timetable records.
test("Student and Parent should not be able to view Timetable records", async () => {
  for (const role of ["Student", "Parent"]) {
    const response = await request(app)
      .get("/api/timetables")
      .set(testUsers[role].headers);

    assert.equal(
      response.status,
      403,
      `${role} should not be able to view Timetable records.`
    );
  }
});

// Administrator should be able to create a Timetable entry.
test("Administrator should be able to create a Timetable entry", async () => {
  const response = await request(app)
    .post("/api/timetables")
    .set(testUsers.Administrator.headers)
    .send(getValidTimetableData());

  assert.equal(response.status, 201);
  assert.equal(response.body.success, true);

  testData.timetableEntry = response.body.data;

  assert.ok(testData.timetableEntry);
});


// Helper to create additional Timetable entries through the API.
const createTimetableEntry = async (overrides = {}) => {
  const response = await request(app)
    .post("/api/timetables")
    .set(testUsers.Administrator.headers)
    .send({
      ...getValidTimetableData(),
      ...overrides
    });

  assert.equal(
    response.status,
    201,
    `Timetable creation failed: ${response.body.message}`
  );

  return response.body.data;
};


// --------------------------------------------------
// 1. CREATE PERMISSIONS
// --------------------------------------------------

test("Only Administrator and Principal should be able to create Timetable entries", async () => {
  const allowedResponse = await request(app)
    .post("/api/timetables")
    .set(testUsers.Principal.headers)
    .send({
      ...getValidTimetableData(),
      day: "Wednesday",
      periodNumber: 1,
      roomNumber: "Room 103"
    });

  assert.equal(allowedResponse.status, 201);

  for (const role of ["Teacher", "Accountant", "Student", "Parent"]) {
    const response = await request(app)
      .post("/api/timetables")
      .set(testUsers[role].headers)
      .send(getValidTimetableData());

    assert.equal(
      response.status,
      403,
      `${role} should not be able to create Timetable entries.`
    );
  }
});


// --------------------------------------------------
// 2. LIST AND FILTER TIMETABLE ENTRIES
// --------------------------------------------------

test("Timetable entries should be retrievable with filters", async () => {
  const teacher2Entry = await createTimetableEntry({
    sectionId: testData.sectionB._id.toString(),
    subjectId: testData.subject._id.toString(),
    teacherId: testData.teacher2._id.toString(),
    day: "Thursday",
    periodNumber: 1,
    roomNumber: "Room 202"
  });

  testData.teacher2TimetableEntry = teacher2Entry;

  const allResponse = await request(app)
    .get("/api/timetables")
    .set(testUsers.Administrator.headers);

  assert.equal(allResponse.status, 200);
  assert.ok(Array.isArray(allResponse.body.data));
  assert.ok(allResponse.body.count >= 2);

  const yearResponse = await request(app)
    .get(`/api/timetables?academicYearId=${testData.academicYear._id}`)
    .set(testUsers.Administrator.headers);

  assert.equal(yearResponse.status, 200);
  assert.ok(yearResponse.body.count >= 2);

  const sectionResponse = await request(app)
    .get(`/api/timetables?sectionId=${testData.section._id}`)
    .set(testUsers.Administrator.headers);

  assert.equal(sectionResponse.status, 200);
  assert.ok(sectionResponse.body.count >= 2);

  const teacherResponse = await request(app)
    .get(`/api/timetables?teacherId=${testData.teacher2._id}`)
    .set(testUsers.Administrator.headers);

  assert.equal(teacherResponse.status, 200);

  assert.ok(
    teacherResponse.body.data.every(
      (entry) =>
        entry.teacherId._id.toString() ===
        testData.teacher2._id.toString()
    )
  );

  const dayResponse = await request(app)
    .get("/api/timetables?day=Thursday")
    .set(testUsers.Administrator.headers);

  assert.equal(dayResponse.status, 200);

  assert.ok(
    dayResponse.body.data.every(
      (entry) => entry.day === "Thursday"
    )
  );
});


// --------------------------------------------------
// 3. TEACHER OWNERSHIP RESTRICTIONS
// --------------------------------------------------

test("Teacher should only see their own Timetable entries", async () => {
  const response = await request(app)
    .get(`/api/timetables?teacherId=${testData.teacher2._id}`)
    .set(testUsers.Teacher.headers);

  assert.equal(response.status, 200);

  assert.ok(
    response.body.data.every(
      (entry) =>
        entry.teacherId._id.toString() ===
        testUsers.Teacher.user._id.toString()
    )
  );
});


// --------------------------------------------------
// 4. SINGLE TIMETABLE ENTRY RETRIEVAL
// --------------------------------------------------

test("Administrator should retrieve a single Timetable entry", async () => {
  const response = await request(app)
    .get(`/api/timetables/${testData.timetableEntry._id}`)
    .set(testUsers.Administrator.headers);

  assert.equal(response.status, 200);
  assert.ok(response.body.data);
});

test("Teacher should retrieve their own Timetable entry", async () => {
  const response = await request(app)
    .get(`/api/timetables/${testData.timetableEntry._id}`)
    .set(testUsers.Teacher.headers);

  assert.equal(response.status, 200);
  assert.ok(response.body.data);
});

test("Teacher should not retrieve another Teacher's Timetable entry", async () => {
  const response = await request(app)
    .get(`/api/timetables/${testData.timetableEntry._id}`)
    .set(createAuthHeader(
      generateTestToken(testData.teacher2._id, "Teacher")
    ));

  assert.equal(response.status, 200);
  assert.equal(response.body.data, null);
});

test("Invalid Timetable ID should be rejected", async () => {
  const response = await request(app)
    .get("/api/timetables/invalid-id")
    .set(testUsers.Administrator.headers);

  assert.equal(response.status, 400);
});

test("Non-existent Timetable ID should return null data", async () => {
  const response = await request(app)
    .get(`/api/timetables/${new mongoose.Types.ObjectId()}`)
    .set(testUsers.Administrator.headers);

  // Current route behaviour: HTTP 200 with null data.
  assert.equal(response.status, 200);
  assert.equal(response.body.data, null);
});


// --------------------------------------------------
// 5. INVALID FILTERS
// --------------------------------------------------

test("Invalid Timetable filters should be rejected", async () => {
  const invalidFilters = [
    "academicYearId=invalid",
    "sectionId=invalid",
    "teacherId=invalid",
    "day=Sunday"
  ];

  for (const filter of invalidFilters) {
    const response = await request(app)
      .get(`/api/timetables?${filter}`)
      .set(testUsers.Administrator.headers);

    assert.equal(
      response.status,
      400,
      `Filter ${filter} should be rejected.`
    );
  }
});


// --------------------------------------------------
// 6. BASIC REQUEST VALIDATION
// --------------------------------------------------

test("Invalid Timetable request data should be rejected", async () => {
  const invalidRequests = [
    {
      ...getValidTimetableData(),
      academicYearId: "invalid"
    },
    {
      ...getValidTimetableData(),
      sectionId: "invalid"
    },
    {
      ...getValidTimetableData(),
      subjectId: "invalid"
    },
    {
      ...getValidTimetableData(),
      teacherId: "invalid"
    },
    {
      ...getValidTimetableData(),
      day: "Sunday"
    },
    {
      ...getValidTimetableData(),
      periodNumber: 0
    },
    {
      ...getValidTimetableData(),
      periodNumber: 1.5
    },
    {
      ...getValidTimetableData(),
      roomNumber: "R".repeat(31)
    },
    {
      ...getValidTimetableData(),
      roomNumber: 123
    }
  ];

  for (const invalidData of invalidRequests) {
    const response = await request(app)
      .post("/api/timetables")
      .set(testUsers.Administrator.headers)
      .send(invalidData);

    assert.equal(response.status, 400);
  }
});


// --------------------------------------------------
// 7. INACTIVE ACADEMIC YEAR VALIDATION
// --------------------------------------------------

test("Inactive Academic Year should not be accepted", async () => {
  const response = await request(app)
    .post("/api/timetables")
    .set(testUsers.Administrator.headers)
    .send({
      ...getValidTimetableData(),
      academicYearId: testData.inactiveAcademicYear._id.toString()
    });

  assert.equal(response.status, 400);

  assert.equal(
    response.body.message,
    "The selected Academic Year is not active."
  );
});


// --------------------------------------------------
// 8. INACTIVE SECTION VALIDATION
// --------------------------------------------------

test("Inactive Section should not be accepted", async () => {
  const response = await request(app)
    .post("/api/timetables")
    .set(testUsers.Administrator.headers)
    .send({
      ...getValidTimetableData(),
      sectionId: testData.inactiveSection._id.toString()
    });

  assert.equal(response.status, 400);

  assert.equal(
    response.body.message,
    "The selected Section is not active."
  );
});


// --------------------------------------------------
// 9. INACTIVE SUBJECT VALIDATION
// --------------------------------------------------

test("Inactive Subject should not be accepted", async () => {
  const response = await request(app)
    .post("/api/timetables")
    .set(testUsers.Administrator.headers)
    .send({
      ...getValidTimetableData(),
      subjectId: testData.inactiveSubject._id.toString()
    });

  assert.equal(response.status, 400);

  assert.equal(
    response.body.message,
    "The selected Subject is not active."
  );
});


// --------------------------------------------------
// 10. INACTIVE TEACHER VALIDATION
// --------------------------------------------------

test("Inactive Teacher should not be accepted", async () => {
  const inactiveTeacher = await User.create({
    name: "Inactive Test Teacher",
    email: "test.inactiveteacher@example.com",
    passwordHash: "test-password-hash",
    role: "Teacher",
    status: "Inactive"
  });

  try {
    const response = await request(app)
      .post("/api/timetables")
      .set(testUsers.Administrator.headers)
      .send({
        ...getValidTimetableData(),
        teacherId: inactiveTeacher._id.toString()
      });

    assert.equal(response.status, 400);

    assert.equal(
      response.body.message,
      "The selected user is not an active Teacher."
    );
  } finally {
    await User.deleteOne({ _id: inactiveTeacher._id });
  }
});


// --------------------------------------------------
// 11. TEACHER ASSIGNMENT VALIDATION
// --------------------------------------------------

test("Valid active records without a matching Teacher Assignment should be rejected", async () => {
  const response = await request(app)
    .post("/api/timetables")
    .set(testUsers.Administrator.headers)
    .send({
      ...getValidTimetableData(),
      sectionId: testData.section._id.toString(),
      subjectId: testData.subject._id.toString(),
      teacherId: testData.teacher2._id.toString()
    });

  assert.equal(response.status, 400);

  assert.equal(
    response.body.message,
    "No active Teacher Assignment exists for the selected teacher, subject, section, and Academic Year."
  );
});


// --------------------------------------------------
// 12. PERIOD CONFIGURATION VALIDATION
// --------------------------------------------------

test("Timetable entry should be rejected without an active Period Configuration", async () => {
  await PeriodConfiguration.findByIdAndUpdate(
    testData.periodConfiguration._id,
    { status: "Inactive" }
  );

  try {
    const response = await request(app)
      .post("/api/timetables")
      .set(testUsers.Administrator.headers)
      .send(getValidTimetableData());

    assert.equal(response.status, 400);

    assert.equal(
      response.body.message,
      "No active Period Configuration exists for this Academic Year."
    );
  } finally {
    await PeriodConfiguration.findByIdAndUpdate(
      testData.periodConfiguration._id,
      { status: "Active" }
    );
  }
});

test("Non-working day should be rejected", async () => {
  await PeriodConfiguration.findByIdAndUpdate(
    testData.periodConfiguration._id,
    {
      workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
    }
  );

  try {
    const response = await request(app)
      .post("/api/timetables")
      .set(testUsers.Administrator.headers)
      .send({
        ...getValidTimetableData(),
        day: "Saturday",
        periodNumber: 1
      });

    assert.equal(response.status, 400);
    assert.equal(
      response.body.message,
      "Saturday is not configured as a working day."
    );
  } finally {
    await PeriodConfiguration.findByIdAndUpdate(
      testData.periodConfiguration._id,
      { workingDays: validPeriodSchedule.workingDays }
    );
  }
});

test("Unconfigured period number should be rejected", async () => {
  const response = await request(app)
    .post("/api/timetables")
    .set(testUsers.Administrator.headers)
    .send({
      ...getValidTimetableData(),
      periodNumber: 4
    });

  assert.equal(response.status, 400);

  assert.equal(
    response.body.message,
    "Period 4 is not configured for Monday."
  );
});

test("Break period should not accept a subject", async () => {
  const response = await request(app)
    .post("/api/timetables")
    .set(testUsers.Administrator.headers)
    .send({
      ...getValidTimetableData(),
      periodNumber: 3
    });

  assert.equal(response.status, 400);

  assert.equal(
    response.body.message,
    "Period 3 is a Break period and cannot be assigned a subject."
  );
});


// --------------------------------------------------
// 13. SECTION-DAY-PERIOD DUPLICATE VALIDATION
// --------------------------------------------------

test("Duplicate Section-Day-Period entry should be rejected", async () => {
  const response = await request(app)
    .post("/api/timetables")
    .set(testUsers.Administrator.headers)
    .send(getValidTimetableData());

  assert.equal(response.status, 409);

  assert.equal(
    response.body.message,
    "A timetable entry already exists for this Section, Day, and Period."
  );
});


// --------------------------------------------------
// 14. TEACHER CLASH VALIDATION
// --------------------------------------------------


test("Teacher should not be assigned to two Sections during the same period", async () => {
  const response = await request(app)
    .post("/api/timetables")
    .set(testUsers.Administrator.headers)
    .send({
      ...getValidTimetableData(),
      sectionId: testData.sectionB._id.toString(),
      subjectId: testData.subject2._id.toString(),
      teacherId: testUsers.Teacher.user._id.toString(),
      day: "Monday",
      periodNumber: 1,
      roomNumber: ""
    });

  assert.equal(response.status, 409);

  assert.equal(
    response.body.message,
    "The selected Teacher is already assigned to another Section during this period."
  );
});



// --------------------------------------------------
// 15. ROOM CLASH VALIDATION
// --------------------------------------------------


test("Same Room should not be allocated to two Sections during the same period", async () => {
  const response = await request(app)
    .post("/api/timetables")
    .set(testUsers.Administrator.headers)
    .send({
      ...getValidTimetableData(),
      sectionId: testData.sectionB._id.toString(),
      subjectId: testData.subject._id.toString(),
      teacherId: testData.teacher2._id.toString(),
      day: "Monday",
      periodNumber: 1,
      roomNumber: "Room 101"
    });

  assert.equal(response.status, 409);

  assert.equal(
    response.body.message,
    "The selected Room is already allocated to another Section during this period."
  );
});



// --------------------------------------------------
// 16. UPDATE PERMISSIONS AND VALIDATION
// --------------------------------------------------

test("Only Administrator and Principal should update Timetable entries", async () => {
  for (const role of ["Teacher", "Accountant", "Student", "Parent"]) {
    const response = await request(app)
      .put(`/api/timetables/${testData.timetableEntry._id}`)
      .set(testUsers[role].headers)
      .send(getValidTimetableData());

    assert.equal(
      response.status,
      403,
      `${role} should not update Timetable entries.`
    );
  }
});

test("Invalid Timetable ID should be rejected during update", async () => {
  const response = await request(app)
    .put("/api/timetables/invalid-id")
    .set(testUsers.Administrator.headers)
    .send(getValidTimetableData());

  assert.equal(response.status, 400);
});

test("Non-existent Timetable entry should return 404 during update", async () => {
  const response = await request(app)
    .put(`/api/timetables/${new mongoose.Types.ObjectId()}`)
    .set(testUsers.Administrator.headers)
    .send(getValidTimetableData());

  assert.equal(response.status, 404);
});

test("Invalid update data should be rejected", async () => {
  const response = await request(app)
    .put(`/api/timetables/${testData.timetableEntry._id}`)
    .set(testUsers.Administrator.headers)
    .send({
      ...getValidTimetableData(),
      day: "Sunday"
    });

  assert.equal(response.status, 400);
});


// --------------------------------------------------
// 17. UPDATE TEACHER CLASH VALIDATION
// --------------------------------------------------


test("Update should reject a Teacher timetable clash", async () => {
  const entry = await createTimetableEntry({
    sectionId: testData.sectionB._id.toString(),
    subjectId: testData.subject._id.toString(),
    teacherId: testData.teacher2._id.toString(),
    day: "Tuesday",
    periodNumber: 1,
    roomNumber: ""
  });

  try {
    const response = await request(app)
      .put(`/api/timetables/${entry._id}`)
      .set(testUsers.Administrator.headers)
      .send({
        ...getValidTimetableData(),
        sectionId: testData.sectionB._id.toString(),
        subjectId: testData.subject2._id.toString(),
        teacherId: testUsers.Teacher.user._id.toString(),
        day: "Monday",
        periodNumber: 1,
        roomNumber: ""
      });

    assert.equal(response.status, 409);

    assert.equal(
      response.body.message,
      "The selected Teacher is already assigned to another Section during this period."
    );
  } finally {
    await Timetable.deleteOne({ _id: entry._id });
  }
});



// --------------------------------------------------
// 18. UPDATE ROOM CLASH VALIDATION
// --------------------------------------------------

test("Update should reject a Room clash", async () => {
  const sectionAEntry = await createTimetableEntry({
    sectionId: testData.section._id.toString(),
    subjectId: testData.subject._id.toString(),
    teacherId: testUsers.Teacher.user._id.toString(),
    day: "Monday",
    periodNumber: 2,
    roomNumber: "Room 101"
  });

  const sectionBEntry = await createTimetableEntry({
    sectionId: testData.teacher2TimetableEntry.sectionId._id.toString(),
    subjectId: testData.teacher2TimetableEntry.subjectId._id.toString(),
    teacherId: testData.teacher2._id.toString(),
    day: "Monday",
    periodNumber: 2,
    roomNumber: "Room 202"
  });

  try {
    const response = await request(app)
      .put(`/api/timetables/${sectionBEntry._id}`)
      .set(testUsers.Administrator.headers)
      .send({
        ...getValidTimetableData(),
        sectionId: testData.teacher2TimetableEntry.sectionId._id.toString(),
        subjectId: testData.teacher2TimetableEntry.subjectId._id.toString(),
        teacherId: testData.teacher2._id.toString(),
        day: "Monday",
        periodNumber: 2,
        roomNumber: "Room 101"
      });

    assert.equal(response.status, 409);

    assert.equal(
      response.body.message,
      "The selected Room is already allocated to another Section during this period."
    );
  } finally {
    await Timetable.deleteMany({
      _id: {
        $in: [sectionAEntry._id, sectionBEntry._id]
      }
    });
  }
});


// --------------------------------------------------
// 19. SUCCESSFUL TIMETABLE UPDATE
// --------------------------------------------------

test("Administrator should successfully update a Timetable entry", async () => {
  const response = await request(app)
    .put(`/api/timetables/${testData.timetableEntry._id}`)
    .set(testUsers.Administrator.headers)
    .send({
      ...getValidTimetableData(),
      day: "Tuesday",
      periodNumber: 2,
      roomNumber: "Room 102"
    });

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);

  assert.equal(response.body.data.day, "Tuesday");
  assert.equal(response.body.data.periodNumber, 2);
  assert.equal(response.body.data.roomNumber, "Room 102");
});


// --------------------------------------------------
// 20. DELETE PERMISSIONS
// --------------------------------------------------

test("Only Administrator and Principal should delete Timetable entries", async () => {
  const entry = await createTimetableEntry({
    day: "Friday",
    periodNumber: 1,
    roomNumber: "Room 303"
  });

  for (const role of ["Teacher", "Accountant", "Student", "Parent"]) {
    const response = await request(app)
      .delete(`/api/timetables/${entry._id}`)
      .set(testUsers[role].headers);

    assert.equal(
      response.status,
      403,
      `${role} should not delete Timetable entries.`
    );
  }

  const deleteResponse = await request(app)
    .delete(`/api/timetables/${entry._id}`)
    .set(testUsers.Administrator.headers);

  assert.equal(deleteResponse.status, 200);
  assert.equal(deleteResponse.body.success, true);
});


// --------------------------------------------------
// 21. DELETE VALIDATION
// --------------------------------------------------

test("Invalid Timetable ID should be rejected during deletion", async () => {
  const response = await request(app)
    .delete("/api/timetables/invalid-id")
    .set(testUsers.Administrator.headers);

  assert.equal(response.status, 400);
});

test("Non-existent Timetable entry should return 404 during deletion", async () => {
  const response = await request(app)
    .delete(`/api/timetables/${new mongoose.Types.ObjectId()}`)
    .set(testUsers.Administrator.headers);

  assert.equal(response.status, 404);
});
