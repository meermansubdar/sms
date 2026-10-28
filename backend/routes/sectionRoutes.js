
import express from "express";
import mongoose from "mongoose";
import Section from "../models/Section.js";
import SchoolClass from "../models/SchoolClass.js";
import {
  createSectionSchema,
  updateSectionSchema,
} from "../validators/sectionSchemas.js";
import {
  requireAuth,
  requireRole,
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(requireAuth);

const canManageSections = requireRole("Administrator", "Principal");
const canViewSections = requireRole(
  "Administrator",
  "Principal",
  "Teacher",
  "Accountant"
);

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function sendValidationError(res, error) {
  return res.status(400).json({
    message: "Validation failed.",
    errors: error.issues,
  });
}

function handleDatabaseError(res, error) {
  if (error.code === 11000) {
    return res.status(409).json({
      message: "This section already exists in the selected class.",
    });
  }

  if (error instanceof mongoose.Error.ValidationError) {
    return res.status(400).json({
      message: error.message,
    });
  }

  console.error("Section API error:", error);

  return res.status(500).json({
    message: "An unexpected error occurred.",
  });
}

async function findActiveClass(classId) {
  return SchoolClass.findOne({
    _id: classId,
    status: "Active",
  });
}

// GET /api/sections
router.get("/", canViewSections, async (req, res) => {
  try {
    const search = String(req.query.search || "");
    const status = String(req.query.status || "");
    const classId = String(req.query.classId || "");

    const page = Math.max(
      1,
      Number.parseInt(req.query.page, 10) || 1
    );

    const requestedLimit = Number.parseInt(req.query.limit, 10) || 10;
    const limit = Math.min(Math.max(requestedLimit, 1), 100);

    const filter = {};

    if (search.trim()) {
      filter.name = {
        $regex: escapeRegex(search.trim()),
        $options: "i",
      };
    }

    if (status) {
      if (!["Active", "Inactive"].includes(status)) {
        return res.status(400).json({
          message: "Status must be Active or Inactive.",
        });
      }

      filter.status = status;
    }

    if (classId) {
      if (!mongoose.isValidObjectId(classId)) {
        return res.status(400).json({
          message: "Invalid class ID.",
        });
      }

      filter.classId = classId;
    }

    const total = await Section.countDocuments(filter);

    const data = await Section.find(filter)
      .populate("classId", "name gradeNumber status")
      .sort({ classId: 1, name: 1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return res.status(200).json({
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return handleDatabaseError(res, error);
  }
});

// POST /api/sections
router.post("/", canManageSections, async (req, res) => {
  try {
    const result = createSectionSchema.safeParse(req.body);

    if (!result.success) {
      return sendValidationError(res, result.error);
    }

    const schoolClass = await findActiveClass(result.data.classId);

    if (!schoolClass) {
      return res.status(400).json({
        message: "The selected class does not exist or is inactive.",
      });
    }

    const section = await Section.create({
      name: result.data.name,
      classId: result.data.classId,
    });

    const populatedSection = await Section.findById(section._id)
      .populate("classId", "name gradeNumber status");

    return res.status(201).json({
      message: "Section created successfully.",
      data: populatedSection,
    });
  } catch (error) {
    return handleDatabaseError(res, error);
  }
});

// GET /api/sections/:id
router.get("/:id", canViewSections, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid section ID.",
      });
    }

    const section = await Section.findById(req.params.id)
      .populate("classId", "name gradeNumber status");

    if (!section) {
      return res.status(404).json({
        message: "Section not found.",
      });
    }

    return res.status(200).json({ data: section });
  } catch (error) {
    return handleDatabaseError(res, error);
  }
});

// PATCH /api/sections/:id
router.patch("/:id", canManageSections, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid section ID.",
      });
    }

    const result = updateSectionSchema.safeParse(req.body);

    if (!result.success) {
      return sendValidationError(res, result.error);
    }

    const section = await Section.findById(req.params.id);

    if (!section) {
      return res.status(404).json({
        message: "Section not found.",
      });
    }

    if (result.data.classId !== undefined) {
      const schoolClass = await findActiveClass(result.data.classId);

      if (!schoolClass) {
        return res.status(400).json({
          message: "The selected class does not exist or is inactive.",
        });
      }

      section.classId = result.data.classId;
    }

    if (result.data.name !== undefined) {
      section.name = result.data.name;
    }

    if (result.data.status !== undefined) {
      if (result.data.status === "Active") {
        const schoolClass = await findActiveClass(section.classId);

        if (!schoolClass) {
          return res.status(400).json({
            message: "Cannot activate a section whose class is inactive.",
          });
        }
      }

      section.status = result.data.status;
    }

    await section.save();

    const populatedSection = await Section.findById(section._id)
      .populate("classId", "name gradeNumber status");

    return res.status(200).json({
      message: "Section updated successfully.",
      data: populatedSection,
    });
  } catch (error) {
    return handleDatabaseError(res, error);
  }
});

// PATCH /api/sections/:id/status
router.patch("/:id/status", canManageSections, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid section ID.",
      });
    }

    const status = req.body?.status;

    if (!["Active", "Inactive"].includes(status)) {
      return res.status(400).json({
        message: "Status must be Active or Inactive.",
      });
    }

    const section = await Section.findById(req.params.id);

    if (!section) {
      return res.status(404).json({
        message: "Section not found.",
      });
    }

    if (status === "Active") {
      const schoolClass = await findActiveClass(section.classId);

      if (!schoolClass) {
        return res.status(400).json({
          message: "Cannot activate a section whose class is inactive.",
        });
      }
    }

    section.status = status;
    await section.save();

    const populatedSection = await Section.findById(section._id)
      .populate("classId", "name gradeNumber status");

    return res.status(200).json({
      message: `Section marked ${status.toLowerCase()} successfully.`,
      data: populatedSection,
    });
  } catch (error) {
    return handleDatabaseError(res, error);
  }
});

export default router;
