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
  uploadAndProcessPrescription,
  verifyPrescription,
  getPrescriptionOCRDetails,
  getPrescriptionMatchDemo,
} from "./prescriptionOrder.controller";
import {
  createPrescriptionOrderSchema,
  prescriptionOrderPaymentSchema,
  updatePrescriptionOrderSchema,
} from "./prescriptionOrder.validation";

const router = Router();

router.use(protect);

// OCR Upload endpoint - users can upload prescriptions for OCR processing
router.post(
  "/ocr/upload",
  authorize("user"),
  upload.prescriptionFile,
  validate(createPrescriptionOrderSchema),
  uploadAndProcessPrescription,
);

// Get OCR details for a specific prescription
router.get("/ocr/:id", getPrescriptionOCRDetails);
// Demo matcher endpoint (returns autoMatch + per-line Fuse suggestions)
router.get("/ocr/:id/match-demo", authorize("admin", "pharmacist"), getPrescriptionMatchDemo);

// Pharmacist verification endpoint - verify and edit extracted medicines
router.put(
  "/verify/:id",
  authorize("admin", "pharmacist"),
  verifyPrescription,
);
router.post(
  "/:id/verify",
  authorize("admin", "pharmacist"),
  verifyPrescription,
);

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
