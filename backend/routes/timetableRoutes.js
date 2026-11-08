import express from "express";
import mongoose from "mongoose";

import Timetable from "../models/Timetable.js";
import AcademicYear from "../models/AcademicYear.js";
import Section from "../models/Section.js";
import Subject from "../models/Subject.js";
import User from "../models/User.js";
import TeacherAssignment from "../models/TeacherAssignment.js";
import PeriodConfiguration from "../models/PeriodConfiguration.js";

import {
  requireAuth,
  requireRole
} from "../middleware/authMiddleware.js";

const router = express.Router();

// All timetable routes require authentication.
router.use(requireAuth);

// Roles allowed to view timetable entries.
const viewers = requireRole(
  "Administrator",
  "Principal",
  "Teacher",
  "Accountant"
);

// Roles allowed to manage timetable entries.
const managers = requireRole(
  "Administrator",
  "Principal"
);

// Validate timetable request data.
const validateTimetableData = (data, res) => {
  const {
    academicYearId,
    sectionId,
    day,
    periodNumber,
    subjectId,
    teacherId,
    roomNumber = ""
  } = data;

  if (
    !mongoose.isValidObjectId(academicYearId) ||
    !mongoose.isValidObjectId(sectionId) ||
    !mongoose.isValidObjectId(subjectId) ||
    !mongoose.isValidObjectId(teacherId)
  ) {
    res.status(400).json({
      success: false,
      message:
        "Valid academicYearId, sectionId, subjectId, and teacherId are required."
    });
    return null;
  }

  const validDays = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday"
  ];

  if (!validDays.includes(day)) {
    res.status(400).json({
      success: false,
      message: "Invalid day."
    });
    return null;
  }

  if (
    !Number.isInteger(periodNumber) ||
    periodNumber < 1
  ) {
    res.status(400).json({
      success: false,
      message: "Period number must be a positive whole number."
    });
    return null;
  }

  if (
    typeof roomNumber !== "string" ||
    roomNumber.trim().length > 30
  ) {
    res.status(400).json({
      success: false,
      message: "Room number must be text with a maximum of 30 characters."
    });
    return null;
  }

  return {
    academicYearId,
    sectionId,
    day,
    periodNumber,
    subjectId,
    teacherId,
    roomNumber: roomNumber.trim()
  };
};

// Validate all related records before creating a timetable entry.
const validateTimetableReferences = async (data) => {
  const {
    academicYearId,
    sectionId,
    subjectId,
    teacherId
  } = data;

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

// Validate the selected day and period against Period Configuration.
const validateConfiguredPeriod = async (data) => {
  const { academicYearId, day, periodNumber } = data;

  const configuration = await PeriodConfiguration.findOne({
    academicYearId,
    status: "Active"
  });

  if (!configuration) {
    return {
      valid: false,
      message: "No active Period Configuration exists for this Academic Year."
    };
  }

  if (!configuration.workingDays.includes(day)) {
    return {
      valid: false,
      message: `${day} is not configured as a working day.`
    };
  }

  const periods =
    day === "Saturday"
      ? configuration.saturdayPeriods
      : configuration.weekdayPeriods;

  const selectedPeriod = periods.find(
    (period) => period.periodNumber === periodNumber
  );

  if (!selectedPeriod) {
    return {
      valid: false,
      message: `Period ${periodNumber} is not configured for ${day}.`
    };
  }

  if (selectedPeriod.type !== "Teaching") {
    return {
      valid: false,
      message: `Period ${periodNumber} is a Break period and cannot be assigned a subject.`
    };
  }

  return {
    valid: true,
    period: selectedPeriod
  };
};

// Check for teacher and room timetable clashes.
const checkTimetableClashes = async (data, excludeId = null) => {
  const {
    academicYearId,
    sectionId,
    teacherId,
    day,
    periodNumber,
    roomNumber
  } = data;

  const baseFilter = {
    academicYearId,
    day,
    periodNumber
  };

  // Exclude the current record when updating.
  if (excludeId) {
    baseFilter._id = { $ne: excludeId };
  }

  // Check whether the teacher is already assigned
  // to another section during this period.
  const teacherClash = await Timetable.findOne({
    ...baseFilter,
    teacherId,
    sectionId: { $ne: sectionId }
  });

  if (teacherClash) {
    return {
      valid: false,
      message:
        "The selected Teacher is already assigned to another Section during this period."
    };
  }

  // Check room availability only when a room is specified.
  if (roomNumber) {
    const roomClash = await Timetable.findOne({
      ...baseFilter,
      roomNumber: {
        $regex: `^${roomNumber.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
        $options: "i"
      },
      sectionId: { $ne: sectionId }
    });

    if (roomClash) {
      return {
        valid: false,
        message:
          "The selected Room is already allocated to another Section during this period."
      };
    }
  }

  return {
    valid: true
  };
};

// Retrieve Timetable entries with optional filters.
router.get("/", viewers, async (req, res, next) => {
  try {
    const {
      academicYearId,
      sectionId,
      teacherId,
      day
    } = req.query;

    const filter = {};

    // Validate and apply Academic Year filter.
    if (academicYearId) {
      if (!mongoose.isValidObjectId(academicYearId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid Academic Year ID."
        });
      }

      filter.academicYearId = academicYearId;
    }

    // Validate and apply Section filter.
    if (sectionId) {
      if (!mongoose.isValidObjectId(sectionId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid Section ID."
        });
      }

      filter.sectionId = sectionId;
    }

    // Teachers can only view their own timetable.
    if (req.user.role === "Teacher") {
      filter.teacherId = req.user.id;
    } else if (teacherId) {
      if (!mongoose.isValidObjectId(teacherId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid Teacher ID."
        });
      }

      filter.teacherId = teacherId;
    }

    // Validate and apply Day filter.
    if (day) {
      const validDays = [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday"
      ];

      if (!validDays.includes(day)) {
        return res.status(400).json({
          success: false,
          message: "Invalid day."
        });
      }

      filter.day = day;
    }

    const entries = await Timetable.find(filter)
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
        day: 1,
        periodNumber: 1
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

// Retrieve a single Timetable entry by ID.
router.get("/:id", viewers, async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validate Timetable ID.
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Timetable ID."
      });
    }

// Teachers can retrieve only their own timetable entries.
    const filter = { _id: id };

    if (req.user.role === "Teacher") {
        filter.teacherId = req.user.id;
    }

    const timetable = await Timetable.findOne(filter)
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
      data: timetable
    });

  } catch (error) {
    next(error);
  }
});

// Update an existing Timetable entry.
router.put("/:id", managers, async (req, res, next) => {
  try {
    const { id } = req.params;

    // Step 1: Validate Timetable ID.
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Timetable ID."
      });
    }

    // Step 2: Find existing entry.
    const existingTimetable = await Timetable.findById(id);

    if (!existingTimetable) {
      return res.status(404).json({
        success: false,
        message: "Timetable entry not found."
      });
    }

    // Step 3: Validate request data.
    const validatedData = validateTimetableData(req.body, res);

    if (!validatedData) return;

    // Step 4: Validate related database records.
    const referenceValidation =
      await validateTimetableReferences(validatedData);

    if (!referenceValidation.valid) {
      return res.status(400).json({
        success: false,
        message: referenceValidation.message
      });
    }

    // Step 5: Validate configured day and period.
    const periodValidation =
      await validateConfiguredPeriod(validatedData);

    if (!periodValidation.valid) {
      return res.status(400).json({
        success: false,
        message: periodValidation.message
      });
    }

    // Step 6: Check teacher and room clashes.
    // Exclude the current entry from clash detection.
    const clashValidation =
      await checkTimetableClashes(validatedData, id);

    if (!clashValidation.valid) {
      return res.status(409).json({
        success: false,
        message: clashValidation.message
      });
    }

    // Step 7: Update the existing entry.
    Object.assign(existingTimetable, validatedData);

    await existingTimetable.save();

    // Step 8: Retrieve updated entry with related details.
    const updatedTimetable = await Timetable.findById(id)
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
      message: "Timetable entry updated successfully.",
      data: updatedTimetable
    });

  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "A timetable entry already exists for this Section, Day, and Period."
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    next(error);
  }
});

// Delete a Timetable entry.
router.delete("/:id", managers, async (req, res, next) => {
  try {
    const { id } = req.params;

    // Step 1: Validate Timetable ID.
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Timetable ID."
      });
    }

    // Step 2: Find and delete the entry.
    const timetable = await Timetable.findByIdAndDelete(id);

    if (!timetable) {
      return res.status(404).json({
        success: false,
        message: "Timetable entry not found."
      });
    }

    return res.status(200).json({
      success: true,
      message: "Timetable entry deleted successfully."
    });

  } catch (error) {
    next(error);
  }
});

// Create a new Timetable entry.
router.post("/", managers, async (req, res, next) => {
  try {
    // Step 1: Validate basic request data.
    const validatedData = validateTimetableData(req.body, res);

    if (!validatedData) return;

    // Step 2: Validate related database records.
    const referenceValidation =
      await validateTimetableReferences(validatedData);

    if (!referenceValidation.valid) {
      return res.status(400).json({
        success: false,
        message: referenceValidation.message
      });
    }

    // Step 3: Validate configured working day and period.
    const periodValidation =
      await validateConfiguredPeriod(validatedData);

    if (!periodValidation.valid) {
      return res.status(400).json({
        success: false,
        message: periodValidation.message
      });
    }

    // Step 4: Check teacher and room clashes.
    const clashValidation =
      await checkTimetableClashes(validatedData);

    if (!clashValidation.valid) {
      return res.status(409).json({
        success: false,
        message: clashValidation.message
      });
    }

    // Step 5: Create the Timetable entry.
    const timetable = await Timetable.create(validatedData);

    // Step 6: Retrieve the entry with related details.
    const populatedTimetable = await Timetable.findById(
      timetable._id
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
      message: "Timetable entry created successfully.",
      data: populatedTimetable
    });

  } catch (error) {
    // Handle duplicate Section-Day-Period entries.
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "A timetable entry already exists for this Section, Day, and Period."
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    next(error);
  }
});

export default router;