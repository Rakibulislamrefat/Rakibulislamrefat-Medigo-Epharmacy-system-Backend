import { Router } from "express";
import { protect } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/role.middleware";
import { upload } from "../../middleware/upload.middleware";
import { validate } from "../../middleware/validation.middleware";
import {
  createPrescriptionOrder,
  deletePrescriptionOrder,
  getMyPrescriptionOrder,
  getPrescriptionOrder,
  listMyPrescriptionOrders,
  listPrescriptionOrders,
  payPrescriptionOrder,
  updatePrescriptionOrder,
} from "./prescriptionOrder.controller";
import {
  createPrescriptionOrderSchema,
  prescriptionOrderPaymentSchema,
  updatePrescriptionOrderSchema,
} from "./prescriptionOrder.validation";

const router = Router();

router.use(protect);

router.post(
  "/",
  authorize("user"),
  upload.prescriptionFile,
  validate(createPrescriptionOrderSchema),
  createPrescriptionOrder,
);

router.get("/my", authorize("user"), listMyPrescriptionOrders);
router.get("/my/:id", authorize("user"), getMyPrescriptionOrder);
router.post(
  "/:id/payment",
  authorize("user"),
  validate(prescriptionOrderPaymentSchema),
  payPrescriptionOrder,
);

router.get("/", authorize("admin", "pharmacist"), listPrescriptionOrders);
router.get("/:id", authorize("admin", "pharmacist"), getPrescriptionOrder);
router.patch(
  "/:id",
  authorize("admin", "pharmacist"),
  upload.prescriptionFile,
  validate(updatePrescriptionOrderSchema),
  updatePrescriptionOrder,
);
router.delete("/:id", authorize("admin"), deletePrescriptionOrder);

export default router;
