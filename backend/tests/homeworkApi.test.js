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
import Student from "../models/Student.js";
import Enrollment from "../models/Enrollment.js";
import TeacherAssignment from "../models/TeacherAssignment.js";
import Homework from "../models/Homework.js";

import {
  connectTestDatabase,
  disconnectTestDatabase,
} from "./testSetup.js";

import {
  generateTestToken,
  createAuthHeader,
} from "./testUtils.js";

// User roles used for Homework API testing.
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

// Store test records created for Homework API testing.
const testData = {
  academicYear: null,
  schoolClass: null,
  section: null,
  sectionB: null,
  inactiveSection: null,
  subject: null,
  subject2: null,
  inactiveSubject: null,
  teacher2: null,
  inactiveTeacher: null,
  student: null,
  student2: null,
  enrollment: null,
  enrollment2: null,
  teacherAssignment: null,
  teacherAssignment2: null,
  teacherAssignment3: null,
  homework: null,
  homeworkByTeacher2: null
};

// Create an additional Teacher for Homework access testing.
const createSecondTeacher = async () => {
  const teacher = await User.create({
    name: "Homework Test Second Teacher",
    email: "homework.test.secondteacher@example.com",
    passwordHash: "test-password-hash",
    role: "Teacher",
    status: "Active"
  });

  testData.teacher2 = teacher;

  await User.deleteOne({
    email: "homework.test.inactiveteacher@example.com"
  });

  const inactiveTeacher = await User.create({
    name: "Homework Test Inactive Teacher",
    email: "homework.test.inactiveteacher@example.com",
    passwordHash: "test-password-hash",
    role: "Teacher",
    status: "Inactive"
  });


  testData.inactiveTeacher = inactiveTeacher;

  return teacher;
};

// Create Academic Years for Homework API testing.
const createAcademicYears = async () => {
  const academicYear = await AcademicYear.create({
    name: "2098-2099",
    startDate: new Date("2098-04-01"),
    endDate: new Date("2099-03-31"),
    status: "Active"
  });

  const inactiveAcademicYear = await AcademicYear.create({
    name: "2027-2028",
    startDate: new Date("2027-04-01"),
    endDate: new Date("2028-03-31"),
    status: "Inactive"
  });

  testData.academicYear = academicYear;
  testData.inactiveAcademicYear = inactiveAcademicYear;

  return {
    academicYear,
    inactiveAcademicYear
  };
};

// Create a School Class for Homework API testing.
const createSchoolClass = async () => {
  const schoolClass = await SchoolClass.create({
    name: "Class 7",
    gradeNumber: 7,
    status: "Active"
  });

  testData.schoolClass = schoolClass;

  return schoolClass;
};

// Create Sections for Homework API testing.
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

  const inactiveSection = await Section.create({
    name: "C",
    classId: testData.schoolClass._id,
    status: "Inactive"
  });

  testData.section = sectionA;
  testData.sectionB = sectionB;
  testData.inactiveSection = inactiveSection;

  return {
    sectionA,
    sectionB
  };
};

// Create Subjects for Homework API testing.
const createSubjects = async () => {
  const subject1 = await Subject.create({
    name: "Homework Mathematics",
    code: "HWMATH",
    status: "Active"
  });

  const subject2 = await Subject.create({
    name: "Homework Science",
    code: "HWSCI",
    status: "Active"
  });

  const inactiveSubject = await Subject.create({
    name: "Homework Inactive Subject",
    code: "HWINACT",
    status: "Inactive"
  });

  testData.subject = subject1;
  testData.subject2 = subject2;
  testData.inactiveSubject = inactiveSubject;

  return {
    subject1,
    subject2
  };
};

// Create Student records for Homework API testing.
const createStudents = async () => {
  const student1 = await Student.create({
    admissionNumber: "HW-STU-001",
    firstName: "Homework",
    lastName: "Student One",
    dateOfBirth: new Date("2012-05-10"),
    gender: "Male",
    status: "Active"
  });

  const student2 = await Student.create({
    admissionNumber: "HW-STU-002",
    firstName: "Homework",
    lastName: "Student Two",
    dateOfBirth: new Date("2012-08-15"),
    gender: "Female",
    status: "Active"
  });

  // Link the Student login account to the first Student record.
  await User.findByIdAndUpdate(
    testUsers.Student.user._id,
    { studentId: student1._id }
  );

  testData.student = student1;
  testData.student2 = student2;

  return {
    student1,
    student2
  };
};

// Create Enrollments for Homework API testing.
const createEnrollments = async () => {
  const enrollment1 = await Enrollment.create({
    studentId: testData.student._id,
    academicYearId: testData.academicYear._id,
    classId: testData.schoolClass._id,
    sectionId: testData.section._id,
    rollNumber: 1,
    enrollmentDate: new Date("2026-04-01"),
    status: "Active"
  });

  const enrollment2 = await Enrollment.create({
    studentId: testData.student2._id,
    academicYearId: testData.academicYear._id,
    classId: testData.schoolClass._id,
    sectionId: testData.sectionB._id,
    rollNumber: 2,
    enrollmentDate: new Date("2026-04-01"),
    status: "Active"
  });

  testData.enrollment = enrollment1;
  testData.enrollment2 = enrollment2;

  return {
    enrollment1,
    enrollment2
  };
};

// Create Teacher Assignments for Homework API testing.
const createTeacherAssignments = async () => {
  const teacher1 = testUsers.Teacher.user;
  const teacher2 = testData.teacher2;

  const assignments = await TeacherAssignment.insertMany([
    {
      teacherId: teacher1._id,
      subjectId: testData.subject._id,
      sectionId: testData.section._id,
      academicYearId: testData.academicYear._id,
      status: "Active"
    },
    {
      teacherId: teacher1._id,
      subjectId: testData.subject2._id,
      sectionId: testData.section._id,
      academicYearId: testData.academicYear._id,
      status: "Active"
    },
    {
      teacherId: teacher2._id,
      subjectId: testData.subject._id,
      sectionId: testData.sectionB._id,
      academicYearId: testData.academicYear._id,
      status: "Active"
    }
  ]);

  testData.teacherAssignment = assignments[0];
  testData.teacherAssignment2 = assignments[1];
  testData.teacherAssignment3 = assignments[2];

  return assignments;
};

// Create all required test records before running Homework API tests.
before(async () => {
  await createSecondTeacher();

  await createAcademicYears();

  await createSchoolClass();

  await createSections();

  await createSubjects();

  await createStudents();

  await createEnrollments();

  await createTeacherAssignments();
});

// Prepare valid Homework data for API requests.
const getValidHomeworkData = () => {
  const assignedDate = new Date();
  assignedDate.setHours(0, 0, 0, 0);

  const dueDate = new Date(assignedDate);
  dueDate.setDate(dueDate.getDate() + 7);

  return {
    academicYearId: testData.academicYear._id.toString(),
    sectionId: testData.section._id.toString(),
    subjectId: testData.subject._id.toString(),
    teacherId: testUsers.Teacher.user._id.toString(),
    title: "Chapter 1 Mathematics",
    description: "Complete exercises 1 to 10.",
    assignedDate: assignedDate.toISOString(),
    dueDate: dueDate.toISOString()
  };
};

// Homework API should require authentication.
test("Homework API should require authentication", async () => {
  const response = await request(app)
    .get("/api/homework");

  assert.equal(response.status, 401);
  assert.equal(response.body.success, false);
});

// Authorized roles should be able to view Homework records.
test("Administrator, Principal and Teacher should be able to view Homework records", async () => {
  const allowedRoles = [
    "Administrator",
    "Principal",
    "Teacher"
  ];

  for (const role of allowedRoles) {
    const response = await request(app)
      .get("/api/homework")
      .set(testUsers[role].headers);

    assert.equal(
      response.status,
      200,
      `${role} should be able to view Homework records.`
    );
  }
});

// Student, Parent and Accountant should not be able to access Homework yet
// until Student access is implemented and Parent linking is available.
test("Parent and Accountant should not be able to view Homework records", async () => {
  for (const role of ["Parent", "Accountant"]) {
    const response = await request(app)
      .get("/api/homework")
      .set(testUsers[role].headers);

    assert.equal(
      response.status,
      403,
      `${role} should not be able to view Homework records.`
    );
  }
});

// Administrator and Principal should be able to create Homework.
test("Administrator and Principal should be able to create Homework", async () => {
  const adminResponse = await request(app)
    .post("/api/homework")
    .set(testUsers.Administrator.headers)
    .send(getValidHomeworkData());

  assert.equal(adminResponse.status, 201);
  assert.equal(adminResponse.body.success, true);

  testData.homework = adminResponse.body.data;

  const principalResponse = await request(app)
    .post("/api/homework")
    .set(testUsers.Principal.headers)
    .send({
      ...getValidHomeworkData(),
      subjectId: testData.subject2._id.toString(),
      title: "Chapter 1 Science"
    });

  assert.equal(principalResponse.status, 201);
  assert.equal(principalResponse.body.success, true);
});

// Student, Parent and Accountant should not be able to create Homework.
test("Student, Parent and Accountant should not be able to create Homework", async () => {
  for (const role of ["Student", "Parent", "Accountant"]) {
    const response = await request(app)
      .post("/api/homework")
      .set(testUsers[role].headers)
      .send(getValidHomeworkData());

    assert.equal(
      response.status,
      403,
      `${role} should not be able to create Homework.`
    );
  }
});

// Teacher should be able to create Homework using their own active Teacher Assignment.
test("Teacher should be able to create Homework for their assigned Section and Subject", async () => {
  const response = await request(app)
    .post("/api/homework")
    .set(testUsers.Teacher.headers)
    .send({
      ...getValidHomeworkData(),
      title: "Teacher Assigned Mathematics Homework"
    });

  assert.equal(response.status, 201);
  assert.equal(response.body.success, true);
  testData.homeworkByTeacher1 = response.body.data;

  assert.equal(
    response.body.data.teacherId._id.toString(),
    testUsers.Teacher.user._id.toString()
  );
});

// Teacher should not control Homework status while creating Homework.
test("Teacher should not create Homework with an Inactive status", async () => {
  const response = await request(app)
    .post("/api/homework")
    .set(testUsers.Teacher.headers)
    .send({
      ...getValidHomeworkData(),
      title: "Teacher Inactive Status Attempt",
      status: "Inactive"
    });

  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
});

// Teacher should not create Homework using another Teacher's assignment.
test("Teacher should not create Homework for another Teacher's assignment", async () => {
  const response = await request(app)
    .post("/api/homework")
    .set(testUsers.Teacher.headers)
    .send({
      ...getValidHomeworkData(),
      sectionId: testData.sectionB._id.toString(),
      teacherId: testData.teacher2._id.toString(),
      title: "Unauthorized Homework"
    });

  assert.equal(response.status, 400);
});

// Teacher should not create Homework using another Teacher's assignment.
test("Teacher should not create Homework for another Teacher's assignment", async () => {
  const response = await request(app)
    .post("/api/homework")
    .set(testUsers.Teacher.headers)
    .send({
      ...getValidHomeworkData(),
      sectionId: testData.sectionB._id.toString(),
      teacherId: testData.teacher2._id.toString(),
      title: "Unauthorized Homework"
    });

  assert.equal(response.status, 400);
});

// Teacher 2 should be able to create Homework for their assigned Section and Subject.
test("Second Teacher should be able to create Homework for Section B Mathematics", async () => {
  const response = await request(app)
    .post("/api/homework")
    .set(testUsers.Teacher2?.headers ?? createAuthHeader(
      generateTestToken(testData.teacher2._id, "Teacher")
    ))
    .send({
      ...getValidHomeworkData(),
      sectionId: testData.sectionB._id.toString(),
      title: "Section B Mathematics Homework"
    });

  assert.equal(response.status, 201);
  assert.equal(response.body.success, true);

  testData.homeworkByTeacher2 = response.body.data;
});

// Transfer the Section B Mathematics assignment from Teacher 2 to Teacher 1.
test("Teacher Assignment should support transfer to another Teacher", async () => {
  await TeacherAssignment.findByIdAndUpdate(
    testData.teacherAssignment3._id,
    { status: "Inactive" }
  );

  const newAssignment = await TeacherAssignment.create({
    teacherId: testUsers.Teacher.user._id,
    subjectId: testData.subject._id,
    sectionId: testData.sectionB._id,
    academicYearId: testData.academicYear._id,
    status: "Active"
  });

  assert.equal(newAssignment.status, "Active");
  assert.equal(
    newAssignment.teacherId.toString(),
    testUsers.Teacher.user._id.toString()
  );
});

// Teacher should view Homework created by another Teacher for an assigned Section and Subject.
test("Teacher should view Homework created by another Teacher after assignment transfer", async () => {
  const response = await request(app)
    .get("/api/homework")
    .set(testUsers.Teacher.headers);

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);

  const transferredHomework = response.body.data.find(
    homework =>
      homework._id.toString() ===
      testData.homeworkByTeacher2._id.toString()
  );

  assert.ok(
    transferredHomework,
    "Teacher should be able to view homework created by another Teacher for an assigned Section and Subject."
  );
});

// Teacher should retain visibility of Homework created under a historical assignment.
test("Second Teacher should view previously created Homework after assignment becomes Inactive", async () => {
  const teacher2Token = generateTestToken(
    testData.teacher2._id,
    "Teacher"
  );

  const response = await request(app)
    .get("/api/homework")
    .set(createAuthHeader(teacher2Token));

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);

  const previousHomework = response.body.data.find(
    homework =>
      homework._id.toString() ===
      testData.homeworkByTeacher2._id.toString()
  );

  assert.ok(
    previousHomework,
    "Teacher should retain visibility of homework created under a historical assignment."
  );
});

// Teacher should not edit Homework created by another Teacher.
test("Teacher should not edit another Teacher's Homework", async () => {
  const response = await request(app)
    .put(`/api/homework/${testData.homeworkByTeacher2._id}`)
    .set(testUsers.Teacher.headers)
    .send({
      ...getValidHomeworkData(),
      sectionId: testData.sectionB._id.toString(),
      title: "Unauthorized Homework Update"
    });

  assert.equal(response.status, 403);
});

// Teacher should not delete Homework created by another Teacher.
test("Teacher should not delete another Teacher's Homework", async () => {
  const response = await request(app)
    .delete(`/api/homework/${testData.homeworkByTeacher2._id}`)
    .set(testUsers.Teacher.headers);

  assert.equal(response.status, 403);
});

// Administrator should soft-delete Homework without removing its record.
test("Administrator should soft-delete Homework", async () => {
  const createResponse = await request(app)
    .post("/api/homework")
    .set(testUsers.Administrator.headers)
    .send(getValidHomeworkData());

  assert.equal(createResponse.status, 201);

  const homeworkId = createResponse.body.data._id;

  const deleteResponse = await request(app)
    .delete(`/api/homework/${homeworkId}`)
    .set(testUsers.Administrator.headers);

  assert.equal(deleteResponse.status, 200);

  const deletedHomework = await Homework.findById(homeworkId);

  assert.ok(
    deletedHomework,
    "Soft-deleted Homework should remain in the database."
  );

  assert.equal(deletedHomework.status, "Inactive");
});

// Student should view Homework for their active Enrollment Section only.
test("Student should view all subjects' Homework for their active Section", async () => {
  const response = await request(app)
    .get("/api/homework")
    .set(testUsers.Student.headers);

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);

  assert.ok(
    response.body.data.length > 0,
    "Student should see Homework assigned to their Section."
  );

  assert.ok(
    response.body.data.every(
      homework =>
        homework.sectionId._id.toString() ===
        testData.section._id.toString()
    ),
    "Student should not see Homework belonging to another Section."
  );

  assert.ok(
    response.body.data.some(
      homework =>
        homework.subjectId._id.toString() ===
        testData.subject._id.toString()
    ),
    "Student should see Mathematics Homework."
  );

  assert.ok(
    response.body.data.some(
      homework =>
        homework.subjectId._id.toString() ===
        testData.subject2._id.toString()
    ),
    "Student should see Science Homework too."
  );
});

// Student should see Homework across all active Academic Year enrollments.
test("Student should view Homework from multiple active Academic Year enrollments", async () => {
  const secondAcademicYear = await AcademicYear.create({
    name: "2099-2100",
    startDate: new Date("2099-04-01"),
    endDate: new Date("2100-03-31"),
    status: "Active"
  });

  await Enrollment.create({
    studentId: testData.student._id,
    academicYearId: secondAcademicYear._id,
    classId: testData.schoolClass._id,
    sectionId: testData.sectionB._id,
    rollNumber: 1,
    enrollmentDate: new Date("2099-04-01"),
    status: "Active"
  });

  await TeacherAssignment.create({
    teacherId: testUsers.Teacher.user._id,
    subjectId: testData.subject._id,
    sectionId: testData.sectionB._id,
    academicYearId: secondAcademicYear._id,
    status: "Active"
  });

  const homeworkData = getValidHomeworkData();

  const createResponse = await request(app)
    .post("/api/homework")
    .set(testUsers.Administrator.headers)
    .send({
      ...homeworkData,
      academicYearId: secondAcademicYear._id.toString(),
      sectionId: testData.sectionB._id.toString(),
      title: "Second Academic Year Mathematics Homework"
    });

  assert.equal(createResponse.status, 201);

  const response = await request(app)
    .get("/api/homework")
    .set(testUsers.Student.headers);

  assert.equal(response.status, 200);

  assert.ok(
    response.body.data.some(
      homework =>
        homework.academicYearId._id.toString() ===
          secondAcademicYear._id.toString() &&
        homework.sectionId._id.toString() ===
          testData.sectionB._id.toString()
    ),
    "Student should see Homework from the second active Academic Year enrollment."
  );
});

// Student should not be able to create Homework.
test("Student should not be able to create Homework", async () => {
  const response = await request(app)
    .post("/api/homework")
    .set(testUsers.Student.headers)
    .send(getValidHomeworkData());

  assert.equal(response.status, 403);
  assert.equal(response.body.success, false);
});

// Student should not see Homework before its assigned date.
test("Student should not see future-dated Homework", async () => {
  const assignedDate = new Date();
  assignedDate.setDate(assignedDate.getDate() + 5);
  assignedDate.setHours(0, 0, 0, 0);

  const dueDate = new Date(assignedDate);
  dueDate.setDate(dueDate.getDate() + 7);

  const createResponse = await request(app)
    .post("/api/homework")
    .set(testUsers.Administrator.headers)
    .send({
      ...getValidHomeworkData(),
      assignedDate: assignedDate.toISOString(),
      dueDate: dueDate.toISOString(),
      title: "Future Mathematics Homework"
    });

  assert.equal(createResponse.status, 201);

  const studentResponse = await request(app)
    .get("/api/homework")
    .set(testUsers.Student.headers);

  assert.equal(studentResponse.status, 200);

  const futureHomework = studentResponse.body.data.find(
    homework =>
      homework._id.toString() ===
      createResponse.body.data._id.toString()
  );

  assert.equal(futureHomework, undefined);
});

// Student should not see Inactive Homework.
test("Student should not see Inactive Homework", async () => {
  const response = await request(app)
    .post("/api/homework")
    .set(testUsers.Administrator.headers)
    .send({
      ...getValidHomeworkData(),
      title: "Inactive Mathematics Homework",
      status: "Inactive"
    });

  assert.equal(response.status, 201);

  const studentResponse = await request(app)
    .get("/api/homework")
    .set(testUsers.Student.headers);

  assert.equal(studentResponse.status, 200);

  const inactiveHomework = studentResponse.body.data.find(
    homework =>
      homework._id.toString() ===
      response.body.data._id.toString()
  );

  assert.equal(inactiveHomework, undefined);
});

// Student should not access another Section's Homework by its ID.
test("Student should not access Homework from another Section", async () => {
  const response = await request(app)
    .get(`/api/homework/${testData.homeworkByTeacher2._id}`)
    .set(testUsers.Student.headers);

  assert.equal(response.status, 404);
});

// Parent and Accountant should not access individual Homework records.
test("Parent and Accountant should not access individual Homework records", async () => {
  for (const role of ["Parent", "Accountant"]) {
    const response = await request(app)
      .get(`/api/homework/${testData.homework._id}`)
      .set(testUsers[role].headers);

    assert.equal(
      response.status,
      403,
      `${role} should not access individual Homework records.`
    );
  }
});

// Administrator should be able to update Homework.
test("Administrator should be able to update Homework", async () => {
  const response = await request(app)
    .put(`/api/homework/${testData.homework._id}`)
    .set(testUsers.Administrator.headers)
    .send({
      ...getValidHomeworkData(),
      title: "Updated Mathematics Homework",
      description: "Complete exercises 1 to 15."
    });

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.data.title, "Updated Mathematics Homework");
  assert.equal(
    response.body.data.description,
    "Complete exercises 1 to 15."
  );
});

// Principal should be able to update Homework.
test("Principal should be able to update Homework", async () => {
  const response = await request(app)
    .put(`/api/homework/${testData.homework._id}`)
    .set(testUsers.Principal.headers)
    .send({
      ...getValidHomeworkData(),
      title: "Principal Updated Mathematics Homework",
      description: "Complete exercises 1 to 20."
    });

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(
    response.body.data.title,
    "Principal Updated Mathematics Homework"
  );
});

// Teacher should be able to update their own Homework.
test("Teacher should be able to update their own Homework", async () => {
  const response = await request(app)
    .put(`/api/homework/${testData.homeworkByTeacher1._id}`)
    .set(testUsers.Teacher.headers)
    .send({
      ...getValidHomeworkData(),
      title: "Teacher Updated Mathematics Homework",
      description: "Complete exercises 1 to 25."
    });

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(
    response.body.data.title,
    "Teacher Updated Mathematics Homework"
  );
});

// Teacher should not change the status of their own Homework.
test("Teacher should not change their Homework status", async () => {
  const response = await request(app)
    .put(`/api/homework/${testData.homeworkByTeacher1._id}`)
    .set(testUsers.Teacher.headers)
    .send({
      ...getValidHomeworkData(),
      title: "Teacher Status Change Attempt",
      status: "Inactive"
    });

  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
});

// Teacher should not create new Homework using an Inactive Teacher Assignment.
test("Teacher should not create Homework using an Inactive Teacher Assignment", async () => {
  const teacher2Token = generateTestToken(
    testData.teacher2._id,
    "Teacher"
  );

  const response = await request(app)
    .post("/api/homework")
    .set(createAuthHeader(teacher2Token))
    .send({
      ...getValidHomeworkData(),
      sectionId: testData.sectionB._id.toString(),
      teacherId: testData.teacher2._id.toString(),
      title: "New Homework Using Inactive Assignment"
    });

  assert.equal(response.status, 400);
});

// Homework due date should not be earlier than its assigned date.
test("Homework API should reject a due date earlier than the assigned date", async () => {
  const assignedDate = new Date("2026-11-15T00:00:00.000Z");
  const dueDate = new Date("2026-11-14T00:00:00.000Z");

  const response = await request(app)
    .post("/api/homework")
    .set(testUsers.Administrator.headers)
    .send({
      ...getValidHomeworkData(),
      assignedDate: assignedDate.toISOString(),
      dueDate: dueDate.toISOString(),
      title: "Invalid Date Homework"
    });

  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
});

// Homework API should reject invalid MongoDB IDs.
test("Homework API should reject invalid IDs", async () => {
  const response = await request(app)
    .post("/api/homework")
    .set(testUsers.Administrator.headers)
    .send({
      ...getValidHomeworkData(),
      sectionId: "invalid-section-id"
    });

  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
});

// Homework API should reject invalid IDs for all related records.
test("Homework API should reject invalid Academic Year, Section, Subject and Teacher IDs", async () => {
  const fields = [
    "academicYearId",
    "sectionId",
    "subjectId",
    "teacherId"
  ];

  for (const field of fields) {
    const response = await request(app)
      .post("/api/homework")
      .set(testUsers.Administrator.headers)
      .send({
        ...getValidHomeworkData(),
        [field]: "invalid-mongodb-id"
      });

    assert.equal(
      response.status,
      400,
      `Invalid ${field} should be rejected.`
    );

    assert.equal(response.body.success, false);
  }
});

// Homework should not be created for an Inactive Academic Year.
test("Homework API should reject an Inactive Academic Year", async () => {
  const response = await request(app)
    .post("/api/homework")
    .set(testUsers.Administrator.headers)
    .send({
      ...getValidHomeworkData(),
      academicYearId: testData.inactiveAcademicYear._id.toString(),
      title: "Inactive Academic Year Homework"
    });

  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
});

// Homework should not be created for an Inactive Section.
test("Homework API should reject an Inactive Section", async () => {
  const response = await request(app)
    .post("/api/homework")
    .set(testUsers.Administrator.headers)
    .send({
      ...getValidHomeworkData(),
      sectionId: testData.inactiveSection._id.toString(),
      title: "Inactive Section Homework"
    });

  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
});

// Homework should not be created for an Inactive Subject.
test("Homework API should reject an Inactive Subject", async () => {
  const response = await request(app)
    .post("/api/homework")
    .set(testUsers.Administrator.headers)
    .send({
      ...getValidHomeworkData(),
      subjectId: testData.inactiveSubject._id.toString(),
      title: "Inactive Subject Homework"
    });

  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
});

// Homework should not be created for an Inactive Teacher.
test("Homework API should reject an Inactive Teacher", async () => {
  const response = await request(app)
    .post("/api/homework")
    .set(testUsers.Administrator.headers)
    .send({
      ...getValidHomeworkData(),
      teacherId: testData.inactiveTeacher._id.toString(),
      title: "Inactive Teacher Homework"
    });

  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
});

// Teacher should not transfer ownership of their own Homework.
test("Teacher should not change the Teacher assigned to their Homework", async () => {
  const response = await request(app)
    .put(`/api/homework/${testData.homeworkByTeacher1._id}`)
    .set(testUsers.Teacher.headers)
    .send({
      ...getValidHomeworkData(),
      teacherId: testData.teacher2._id.toString(),
      title: "Attempted Homework Ownership Change"
    });

  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
});

// Teacher should not transfer ownership of their own Homework.
test("Teacher should not change the Teacher assigned to their Homework", async () => {
  const response = await request(app)
    .put(`/api/homework/${testData.homeworkByTeacher1._id}`)
    .set(testUsers.Teacher.headers)
    .send({
      ...getValidHomeworkData(),
      teacherId: testData.teacher2._id.toString(),
      title: "Attempted Homework Ownership Change"
    });

  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
});

// Homework API should reject missing required fields.
test("Homework API should reject missing required fields", async () => {
  const requiredFields = [
    "academicYearId",
    "sectionId",
    "subjectId",
    "teacherId",
    "title",
    "description",
    "assignedDate",
    "dueDate"
  ];

  for (const field of requiredFields) {
    const homeworkData = getValidHomeworkData();
    delete homeworkData[field];

    const response = await request(app)
      .post("/api/homework")
      .set(testUsers.Administrator.headers)
      .send(homeworkData);

    assert.equal(
      response.status,
      400,
      `Missing ${field} should be rejected.`
    );

    assert.equal(response.body.success, false);
  }
});

// Homework API should reject a title exceeding 150 characters.
test("Homework API should reject a title longer than 150 characters", async () => {
  const response = await request(app)
    .post("/api/homework")
    .set(testUsers.Administrator.headers)
    .send({
      ...getValidHomeworkData(),
      title: "A".repeat(151)
    });

  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
});

// Homework API should reject a description exceeding 2000 characters.
test("Homework API should reject a description longer than 2000 characters", async () => {
  const response = await request(app)
    .post("/api/homework")
    .set(testUsers.Administrator.headers)
    .send({
      ...getValidHomeworkData(),
      description: "A".repeat(2001)
    });

  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
});

// Homework API should reject an invalid status.
test("Homework API should reject an invalid status", async () => {
  const response = await request(app)
    .post("/api/homework")
    .set(testUsers.Administrator.headers)
    .send({
      ...getValidHomeworkData(),
      status: "Pending"
    });

  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
});

// Homework API should set status to Active when status is not provided.
test("Homework API should default Homework status to Active", async () => {
  const homeworkData = getValidHomeworkData();
  delete homeworkData.status;

  const response = await request(app)
    .post("/api/homework")
    .set(testUsers.Administrator.headers)
    .send({
      ...homeworkData,
      title: "Default Status Homework"
    });

  assert.equal(response.status, 201);
  assert.equal(response.body.success, true);
  assert.equal(response.body.data.status, "Active");
});

// Teacher should not create Homework without an Active Teacher Assignment.
test("Teacher should not create Homework for an unassigned Section and Subject", async () => {
  const response = await request(app)
    .post("/api/homework")
    .set(testUsers.Teacher.headers)
    .send({
      ...getValidHomeworkData(),
      sectionId: testData.sectionB._id.toString(),
      subjectId: testData.subject2._id.toString(),
      title: "Unassigned Subject Homework"
    });

  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
});

// Clean up all test records after Homework API testing.
after(async () => {
  await Homework.deleteMany({});
  await Enrollment.deleteMany({});
  await TeacherAssignment.deleteMany({});
  await Section.deleteMany({});
  await SchoolClass.deleteMany({});
  await Subject.deleteMany({});
  await Student.deleteMany({});
  await AcademicYear.deleteMany({});

  await User.deleteMany({
    email: {
      $in: [
        "homework.test.administrator@example.com",
        "homework.test.principal@example.com",
        "homework.test.teacher@example.com",
        "homework.test.student@example.com",
        "homework.test.parent@example.com",
        "homework.test.accountant@example.com",
        "homework.test.secondteacher@example.com",
        "homework.test.inactiveteacher@example.com"
      ]
    }
  });

  await disconnectTestDatabase();
});

// Create test users and authentication tokens.
before(async () => {
  await connectTestDatabase();

  for (const role of roles) {
    const user = await User.create({
      name: `Test ${role}`,
      email: `homework.test.${role.toLowerCase()}@example.com`,
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