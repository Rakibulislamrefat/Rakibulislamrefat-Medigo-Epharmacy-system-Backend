import { Router } from "express";
import { protect } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/role.middleware";
import {
  createNotification,
  listMyNotifications,
  markNotificationRead,
} from "./notification.controller";

const router = Router();

router.get("/me", protect, listMyNotifications);
router.patch("/:id/read", protect, markNotificationRead);

router.post("/", protect, authorize("admin", "pharmacist"), createNotification);

export default router;

