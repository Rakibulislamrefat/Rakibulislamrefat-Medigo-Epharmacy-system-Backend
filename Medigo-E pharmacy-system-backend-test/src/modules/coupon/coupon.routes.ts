import { Router } from "express";
import { protect } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/role.middleware";
import {
  createCoupon,
  deleteCoupon,
  listCoupons,
  updateCoupon,
  validateCoupon,
} from "./coupon.controller";

const router = Router();

router.get("/", listCoupons);
router.get("/validate/:code", validateCoupon);

router.post("/", protect, authorize("admin", "pharmacist"), createCoupon);
router.patch("/:id", protect, authorize("admin", "pharmacist"), updateCoupon);
router.delete("/:id", protect, authorize("admin", "pharmacist"), deleteCoupon);

export default router;

