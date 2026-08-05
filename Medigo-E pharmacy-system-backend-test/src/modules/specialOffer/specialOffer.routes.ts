import { Router } from "express";
import { protect } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/role.middleware";
import {
  createSpecialOffer,
  deleteSpecialOffer,
  getSpecialOffer,
  listSpecialOffers,
  updateSpecialOffer,
} from "./specialOffer.controller";

const router = Router();

router.get("/", listSpecialOffers);
router.get("/:id", getSpecialOffer);

router.post("/", protect, authorize("admin"), createSpecialOffer);
router.patch("/:id", protect, authorize("admin"), updateSpecialOffer);
router.delete("/:id", protect, authorize("admin"), deleteSpecialOffer);

export default router;
