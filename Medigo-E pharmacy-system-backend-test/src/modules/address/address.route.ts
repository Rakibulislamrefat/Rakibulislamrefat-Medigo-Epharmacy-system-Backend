import { Router } from "express";
import { protect } from "../../middleware/auth.middleware";
import { validate } from "../../middleware/validation.middleware";
import {
  createAddress,
  deleteAddress,
  getAddress,
  listMyAddresses,
  setDefaultAddress,
  updateAddress,
} from "./address.controller";
import { createAddressSchema, updateAddressSchema } from "./addtess.validation";

const router = Router();

router.use(protect);

router.get("/", listMyAddresses);
router.post("/", validate(createAddressSchema), createAddress);
router.get("/:id", getAddress);
router.patch("/:id", validate(updateAddressSchema), updateAddress);
router.patch("/:id/default", setDefaultAddress);
router.delete("/:id", deleteAddress);

export default router;
