import express from "express";
import mongoose from "mongoose";

import Homework from "../models/Homework.js";
import AcademicYear from "../models/AcademicYear.js";
import Section from "../models/Section.js";
import Subject from "../models/Subject.js";
import User from "../models/User.js";
import TeacherAssignment from "../models/TeacherAssignment.js";
import Enrollment from "../models/Enrollment.js";

import {
  requireAuth,
  requireRole
} from "../middleware/authMiddleware.js";

const router = express.Router();

// All Homework routes require authentication.
router.use(requireAuth);

// Roles allowed to view Homework.
const viewers = requireRole(
  "Administrator",
  "Principal",
  "Teacher",
  "Student"
);

// Roles allowed to manage all Homework.
const managers = requireRole(
  "Administrator",
  "Principal"
);

// Validate Homework request data.
const validateHomeworkData = (data, res) => {
    const {
        academicYearId,
        sectionId,
        subjectId,
        title,
        description,
        assignedDate,
        dueDate,
        status
    } = data;

    if (
        status !== undefined &&
        !["Active", "Inactive"].includes(status)
    ) {
        res.status(400).json({
        success: false,
        message: "Status must be Active or Inactive."
        });
        return null;
    }

  if (
    !mongoose.isValidObjectId(academicYearId) ||
    !mongoose.isValidObjectId(sectionId) ||
    !mongoose.isValidObjectId(subjectId)
  ) {
    res.status(400).json({
      success: false,
      message:
        "Valid academicYearId, sectionId, and subjectId are required."
    });
    return null;
  }

  if (
    typeof title !== "string" ||
    !title.trim() ||
    title.trim().length > 150
  ) {
    res.status(400).json({
      success: false,
      message: "Title is required and must not exceed 150 characters."
    });
    return null;
  }

  if (
    typeof description !== "string" ||
    !description.trim() ||
    description.trim().length > 2000
  ) {
    res.status(400).json({
      success: false,
      message:
        "Description is required and must not exceed 2000 characters."
    });
    return null;
  }

  const parsedAssignedDate = new Date(assignedDate);
  const parsedDueDate = new Date(dueDate);

  if (
    !assignedDate ||
    Number.isNaN(parsedAssignedDate.getTime()) ||
    !dueDate ||
    Number.isNaN(parsedDueDate.getTime())
  ) {
    res.status(400).json({
      success: false,
      message: "Valid assignedDate and dueDate are required."
    });
    return null;
  }

  if (parsedDueDate < parsedAssignedDate) {
    res.status(400).json({
      success: false,
      message: "Due date cannot be earlier than assigned date."
    });
    return null;
  }

    return {
        academicYearId,
        sectionId,
        subjectId,
        title: title.trim(),
        description: description.trim(),
        assignedDate: parsedAssignedDate,
        dueDate: parsedDueDate,
        ...(status !== undefined && { status })
    };
};

// Validate related records and the active Teacher Assignment.
const validateHomeworkReferences = async (data, teacherId) => {
  const {
    academicYearId,
    sectionId,
    subjectId
  } = data;

  if (!mongoose.isValidObjectId(teacherId)) {
    return {
      valid: false,
      message: "A valid Teacher ID is required."
    };
  }

  const [
    academicYear,
    section,
    subject,
    teacher,
    assignment
  ] = await Promise.all([
    AcademicYear.findById(academicYearId),
    Section.findById(sectionId),
    Subject.findById(subjectId),
    User.findById(teacherId),
    TeacherAssignment.findOne({
      teacherId,
      subjectId,
      sectionId,
      academicYearId,
      status: "Active"
    })
  ]);

  if (!academicYear || academicYear.status !== "Active") {
    return {
      valid: false,
      message: "The selected Academic Year is not active."
    };
  }

  if (!section || section.status !== "Active") {
    return {
      valid: false,
      message: "The selected Section is not active."
    };
  }

  if (!subject || subject.status !== "Active") {
    return {
      valid: false,
      message: "The selected Subject is not active."
    };
  }

  if (
    !teacher ||
    teacher.role !== "Teacher" ||
    teacher.status !== "Active"
  ) {
    return {
      valid: false,
      message: "The selected user is not an active Teacher."
    };
  }

  if (!assignment) {
    return {
      valid: false,
      message:
        "No active Teacher Assignment exists for the selected teacher, subject, section, and Academic Year."
    };
  }

  return {
    valid: true
  };
};

// Retrieve Homework entries with role-based access.
router.get("/", viewers, async (req, res, next) => {
  try {
    const {
      academicYearId,
      sectionId,
      subjectId
    } = req.query;

    const filter = {};

    // Validate optional Academic Year filter.
    if (academicYearId) {
      if (!mongoose.isValidObjectId(academicYearId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid Academic Year ID."
        });
      }

      filter.academicYearId = academicYearId;
    }

    // Validate optional Section filter.
    if (sectionId) {
      if (!mongoose.isValidObjectId(sectionId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid Section ID."
        });
      }

      filter.sectionId = sectionId;
    }

    // Validate optional Subject filter.
    if (subjectId) {
      if (!mongoose.isValidObjectId(subjectId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid Subject ID."
        });
      }

      filter.subjectId = subjectId;
    }

    // Students can view Homework only for their active Enrollment.
    if (req.user.role === "Student") {
      if (!req.user.studentId) {
        return res.status(403).json({
          success: false,
          message: "No Student profile is linked to this account."
        });
      }

      const enrollments = await Enrollment.find({
        studentId: req.user.studentId,
        status: "Active"
      }).select("academicYearId sectionId");

      if (enrollments.length === 0) {
        return res.status(200).json({
          success: true,
          count: 0,
          data: []
        });
      }

      filter.$or = enrollments.map((enrollment) => ({
        academicYearId: enrollment.academicYearId,
        sectionId: enrollment.sectionId
      }));

      filter.status = "Active";
      filter.assignedDate = { $lte: new Date() };
    }

    // Teachers can view Homework for all their assigned
    // Section-Subject combinations, including inactive assignments.
    if (req.user.role === "Teacher") {
      const assignments = await TeacherAssignment.find({
        teacherId: req.user.id
      }).select("academicYearId sectionId subjectId");

      if (assignments.length === 0) {
        return res.status(200).json({
          success: true,
          count: 0,
          data: []
        });
      }

      filter.$or = assignments.map((assignment) => ({
        academicYearId: assignment.academicYearId,
        sectionId: assignment.sectionId,
        subjectId: assignment.subjectId
      }));
    }

    const entries = await Homework.find(filter)
      .populate("academicYearId", "name status")
      .populate({
        path: "sectionId",
        select: "name classId status",
        populate: {
          path: "classId",
          select: "name gradeNumber"
        }
      })
      .populate("subjectId", "name code status")
      .populate("teacherId", "name email role")
      .sort({
        assignedDate: -1,
        dueDate: 1
      })
      .lean();

    return res.status(200).json({
      success: true,
      count: entries.length,
      data: entries
    });

  } catch (error) {
    next(error);
  }
});

// Retrieve a single Homework entry by ID.
router.get("/:id", viewers, async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Homework ID."
      });
    }

    const homework = await Homework.findById(id);

    if (!homework) {
      return res.status(404).json({
        success: false,
        message: "Homework not found."
      });
    }

    // Teachers can view Homework only for their assigned
    // Section-Subject combinations, including inactive assignments.
    if (req.user.role === "Teacher") {
      const assignment = await TeacherAssignment.findOne({
        teacherId: req.user.id,
        academicYearId: homework.academicYearId,
        sectionId: homework.sectionId,
        subjectId: homework.subjectId
      });

      if (!assignment) {
        return res.status(403).json({
          success: false,
          message: "You are not authorized to view this Homework."
        });
      }
    }

    // Students can view only Active Homework for their
    // active Enrollment and after its assigned date.
    if (req.user.role === "Student") {
      if (!req.user.studentId) {
        return res.status(403).json({
          success: false,
          message: "No Student profile is linked to this account."
        });
      }

      const enrollment = await Enrollment.findOne({
        studentId: req.user.studentId,
        academicYearId: homework.academicYearId,
        sectionId: homework.sectionId,
        status: "Active"
      });

      if (
        !enrollment ||
        homework.status !== "Active" ||
        homework.assignedDate > new Date()
      ) {
        return res.status(404).json({
          success: false,
          message: "Homework not found."
        });
      }
    }

    const populatedHomework = await Homework.findById(id)
      .populate("academicYearId", "name status")
      .populate({
        path: "sectionId",
        select: "name classId status",
        populate: {
          path: "classId",
          select: "name gradeNumber"
        }
      })
      .populate("subjectId", "name code status")
      .populate("teacherId", "name email role")
      .lean();

    return res.status(200).json({
      success: true,
      data: populatedHomework
    });

  } catch (error) {
    next(error);
  }
});

// Create a new Homework entry.
router.post("/", async (req, res, next) => {
  try {
    const isManager = [
      "Administrator",
      "Principal"
    ].includes(req.user.role);

    if (!isManager && req.user.role !== "Teacher") {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to create Homework."
      });
    }

        // Teachers cannot set Homework status during creation.
    if (
      req.user.role === "Teacher" &&
      Object.prototype.hasOwnProperty.call(req.body, "status")
    ) {
      return res.status(400).json({
        success: false,
        message: "Teachers cannot change Homework status."
      });
    }

    // Step 1: Validate basic request data.
    const validatedData = validateHomeworkData(req.body, res);

    if (!validatedData) return;

    // Step 2: Determine the assigned Teacher.
    const teacherId = isManager
      ? req.body.teacherId
      : req.user.id;

    if (
      isManager &&
      !mongoose.isValidObjectId(teacherId)
    ) {
      return res.status(400).json({
        success: false,
        message: "A valid teacherId is required."
      });
    }

    // Step 3: Validate related records and active assignment.
    const referenceValidation =
      await validateHomeworkReferences(
        validatedData,
        teacherId
      );

    if (!referenceValidation.valid) {
      return res.status(400).json({
        success: false,
        message: referenceValidation.message
      });
    }

    // Step 4: Create Homework.
    const homework = await Homework.create({
      ...validatedData,
      teacherId
    });

    // Step 5: Retrieve created Homework with related details.
    const populatedHomework = await Homework.findById(
      homework._id
    )
      .populate("academicYearId", "name status")
      .populate({
        path: "sectionId",
        select: "name classId status",
        populate: {
          path: "classId",
          select: "name gradeNumber"
        }
      })
      .populate("subjectId", "name code status")
      .populate("teacherId", "name email role");

    return res.status(201).json({
      success: true,
      message: "Homework created successfully.",
      data: populatedHomework
    });

  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    next(error);
  }
});

// Update an existing Homework entry.
router.put("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    const isManager = [
      "Administrator",
      "Principal"
    ].includes(req.user.role);

    if (!isManager && req.user.role !== "Teacher") {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to update Homework."
      });
    }

        // Teachers cannot change Homework status during updates.
    if (
      req.user.role === "Teacher" &&
      Object.prototype.hasOwnProperty.call(req.body, "status")
    ) {
      return res.status(400).json({
        success: false,
        message: "Teachers cannot change Homework status."
      });
    }

    // Step 1: Validate Homework ID.
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Homework ID."
      });
    }

    // Step 2: Find existing Homework.
    const existingHomework = await Homework.findById(id);

    if (!existingHomework) {
      return res.status(404).json({
        success: false,
        message: "Homework not found."
      });
    }

    // Step 3: Teachers can update only their own Homework.
    if (
      !isManager &&
      existingHomework.teacherId.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "You can update only Homework created by you."
      });
    }

        // Teachers cannot change the assigned Teacher.
        if (
            !isManager &&
            req.body.teacherId !== undefined &&
            String(req.body.teacherId) !== String(req.user.id)
            ) {
            return res.status(400).json({
                success: false,
                message: "Teachers cannot change the assigned Teacher."
            });
        }

    // Step 4: Validate request data.
    const validatedData = validateHomeworkData(req.body, res);

    if (!validatedData) return;

    // Step 5: Determine the assigned Teacher.
    const teacherId = isManager
      ? req.body.teacherId
      : req.user.id;

    if (
      isManager &&
      !mongoose.isValidObjectId(teacherId)
    ) {
      return res.status(400).json({
        success: false,
        message: "A valid teacherId is required."
      });
    }

    // Step 6: Validate related records and active assignment.
    const referenceValidation =
      await validateHomeworkReferences(
        validatedData,
        teacherId
      );

    if (!referenceValidation.valid) {
      return res.status(400).json({
        success: false,
        message: referenceValidation.message
      });
    }

    // Step 7: Update Homework.
    Object.assign(existingHomework, {
      ...validatedData,
      teacherId
    });

    await existingHomework.save();

    // Step 8: Retrieve updated Homework with related details.
    const updatedHomework = await Homework.findById(id)
      .populate("academicYearId", "name status")
      .populate({
        path: "sectionId",
        select: "name classId status",
        populate: {
          path: "classId",
          select: "name gradeNumber"
        }
      })
      .populate("subjectId", "name code status")
      .populate("teacherId", "name email role")
      .lean();

    return res.status(200).json({
      success: true,
      message: "Homework updated successfully.",
      data: updatedHomework
    });

  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    next(error);
  }
});

// Soft-delete an existing Homework entry.
router.delete("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    const isManager = [
      "Administrator",
      "Principal"
    ].includes(req.user.role);

    if (!isManager && req.user.role !== "Teacher") {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to delete Homework."
      });
    }

    // Step 1: Validate Homework ID.
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Homework ID."
      });
    }

    // Step 2: Find existing Homework.
    const homework = await Homework.findById(id);

    if (!homework) {
      return res.status(404).json({
        success: false,
        message: "Homework not found."
      });
    }

    // Step 3: Teachers can delete only their own Homework.
    if (
      !isManager &&
      homework.teacherId.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "You can delete only Homework created by you."
      });
    }

    // Step 4: Change status instead of removing the record.
    homework.status = "Inactive";

    await homework.save();

    return res.status(200).json({
      success: true,
      message: "Homework deactivated successfully."
    });

  } catch (error) {
    next(error);
  }
});

// Activate or deactivate an existing Homework entry.
router.patch("/:id/status", managers, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Step 1: Validate Homework ID.
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Homework ID."
      });
    }

    // Step 2: Validate requested status.
    if (!["Active", "Inactive"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be Active or Inactive."
      });
    }

    // Step 3: Find existing Homework.
    const homework = await Homework.findById(id);

    if (!homework) {
      return res.status(404).json({
        success: false,
        message: "Homework not found."
      });
    }

    // Step 4: Update status.
    homework.status = status;

    await homework.save();

    return res.status(200).json({
      success: true,
      message: `Homework ${status.toLowerCase()} successfully.`,
      data: {
        _id: homework._id,
        status: homework.status
      }
    });

  } catch (error) {
    next(error);
  }
});

export default router;