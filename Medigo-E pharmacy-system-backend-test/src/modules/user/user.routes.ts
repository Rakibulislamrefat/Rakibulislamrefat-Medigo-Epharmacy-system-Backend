import { Router } from "express";
import { protect } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/role.middleware";
import { upload } from "../../middleware/upload.middleware";
import {
  getAllUsers,
  getUserById,
  promoteToAdmin,
  updateAvatar,
  updateUserStatus,
} from "./user.controller";

const router = Router();

router.post("/dev/promote-admin", promoteToAdmin);

router.get("/", protect, authorize("admin"), getAllUsers);
router.patch("/:id/status", protect, authorize("admin"), updateUserStatus);

router.put("/me/avatar", protect, upload.avatar, updateAvatar);

router.get("/:id", getUserById);

export default router;
