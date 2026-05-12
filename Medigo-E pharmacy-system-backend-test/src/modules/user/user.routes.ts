import { Router } from "express";
import { protect } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/role.middleware";
import { upload } from "../../middleware/upload.middleware";
import {
  getAllUsers,
  getMyProfile,
  getUserById,
  promoteToAdmin,
  updateAvatar,
  updateUserStatus,
} from "./user.controller";

const router = Router();

router.post("/dev/promote-admin", promoteToAdmin);

// Get current user's profile
router.get("/me/profile", protect, getMyProfile);

// Upload/update profile picture
router.post("/me/avatar", protect, upload.avatar, updateAvatar);
router.put("/me/avatar", protect, upload.avatar, updateAvatar);

router.get("/", protect, authorize("admin"), getAllUsers);
router.patch("/:id/status", protect, authorize("admin"), updateUserStatus);

router.get("/:id", getUserById);

export default router;
