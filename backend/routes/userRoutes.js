
import { Router } from "express";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import {
  createUserSchema,
  updateUserSchema,
} from "../validators/userSchemas.js";

const router = Router();

router.use(requireAuth);

const managementRoles = requireRole("Administrator", "Principal");

function canManageRole(actorRole, targetRole) {
  if (actorRole === "Administrator") {
    return true;
  }

  return (
    actorRole === "Principal" &&
    ["Teacher", "Student", "Parent", "Accountant"].includes(targetRole)
  );
}

// GET /api/users/teachers
// Preserve the existing endpoint used to retrieve active teachers.
router.get(
  "/teachers",
  requireRole("Administrator", "Principal"),
  async (req, res, next) => {
    try {
      const teachers = await User.find({
        role: "Teacher",
        status: "Active",
      })
        .select("name email role status")
        .sort({ name: 1 })
        .lean();

      return res.status(200).json({
        success: true,
        data: teachers,
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/users?page=1&limit=10&role=Teacher&status=Active
router.get("/", managementRoles, async (req, res, next) => {
  try {
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 10);

    if (
      !Number.isInteger(page) ||
      page < 1 ||
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 100
    ) {
      return res.status(400).json({
        success: false,
        message: "Page must be positive and limit must be between 1 and 100",
      });
    }

    const filter = {};

    if (req.query.role !== undefined) {
      const parsedRole = User.schema.path("role").enumValues.includes(
        req.query.role
      );

      if (!parsedRole) {
        return res.status(400).json({
          success: false,
          message: "Invalid role filter",
        });
      }

      filter.role = req.query.role;
    }

    if (req.query.status !== undefined) {
      if (!["Active", "Inactive"].includes(req.query.status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid status filter",
        });
      }

      filter.status = req.query.status;
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select("name email role status createdAt updatedAt")
        .sort({ name: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/users
router.post("/", managementRoles, async (req, res, next) => {
  try {
    const result = createUserSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid user details",
        errors: result.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    const { name, email, password, role } = result.data;

    if (!canManageRole(req.user.role, role)) {
      return res.status(403).json({
        success: false,
        message: "You are not permitted to create this role",
      });
    }

    const existingUser = await User.findOne({ email }).select("_id");

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "A user with this email already exists",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await User.create({
      name,
      email,
      passwordHash,
      role,
    });

    return res.status(201).json({
      success: true,
      message: "User created successfully",
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A user with this email already exists",
      });
    }

    next(error);
  }
});

// PATCH /api/users/:id
router.patch("/:id", managementRoles, async (req, res, next) => {
  try {
    const result = updateUserSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid user update",
        errors: result.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    const targetUser = await User.findById(req.params.id);

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (!canManageRole(req.user.role, targetUser.role)) {
      return res.status(403).json({
        success: false,
        message: "You are not permitted to manage this user",
      });
    }

    const updates = result.data;

    if (
      updates.role !== undefined &&
      !canManageRole(req.user.role, updates.role)
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not permitted to assign this role",
      });
    }

    if (
      updates.status === "Inactive" &&
      targetUser._id.toString() === req.user.id
    ) {
      return res.status(400).json({
        success: false,
        message: "You cannot deactivate your own account",
      });
    }

    if (updates.email !== undefined) {
      const duplicate = await User.findOne({
        email: updates.email,
        _id: { $ne: targetUser._id },
      }).select("_id");

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: "A user with this email already exists",
        });
      }
    }

    Object.assign(targetUser, updates);
    await targetUser.save();

    return res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: {
        id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
        status: targetUser.status,
        createdAt: targetUser.createdAt,
        updatedAt: targetUser.updatedAt,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A user with this email already exists",
      });
    }

    next(error);
  }
});

export default router;
