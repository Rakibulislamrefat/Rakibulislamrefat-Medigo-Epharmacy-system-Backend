import { Request, Response } from "express";
import { ApiError, ApiResponse, asyncHandler } from "../../shared/utils";
import { PrescriptionOrderService } from "./prescriptionOrder.service";
import { SSLCommerzService } from "../sslcommerz/sslcommerz.service";
import { OCRService } from "./ocr.service";

const getUserId = (req: Request) => {
  const userId = req.user?.id;
  if (!userId) throw new ApiError(401, "Not authenticated");
  return userId;
};

export const createPrescriptionOrder = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file?.path) throw new ApiError(400, "prescriptionFile is required");

  const data = await PrescriptionOrderService.createForUser(getUserId(req), {
    ...req.body,
    prescriptionFile: req.file.path,
  });

  res.status(201).json(new ApiResponse(201, "Prescription order created", data));
});

export const listMyPrescriptionOrders = asyncHandler(async (req: Request, res: Response) => {
  const data = await PrescriptionOrderService.listForUser(getUserId(req), req.query);
  res.status(200).json(new ApiResponse(200, "Prescription orders fetched", data));
});

export const listPrescriptionOrders = asyncHandler(async (req: Request, res: Response) => {
  const data = await PrescriptionOrderService.listAll(req.query);
  res.status(200).json(new ApiResponse(200, "Prescription orders fetched", data));
});

export const getMyPrescriptionOrder = asyncHandler(async (req: Request, res: Response) => {
  const data = await PrescriptionOrderService.getForUser(getUserId(req), req.params.id);
  res.status(200).json(new ApiResponse(200, "Prescription order fetched", data));
});

export const getPrescriptionOrder = asyncHandler(async (req: Request, res: Response) => {
  const data = await PrescriptionOrderService.getById(req.params.id);
  res.status(200).json(new ApiResponse(200, "Prescription order fetched", data));
});

export const updatePrescriptionOrder = asyncHandler(async (req: Request, res: Response) => {
  const payload = { ...req.body };
  if (req.file?.path) payload.prescriptionFile = req.file.path;

  const data = await PrescriptionOrderService.update(req.params.id, payload);
  res.status(200).json(new ApiResponse(200, "Prescription order updated", data));
});

export const payPrescriptionOrder = asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { method, customerInfo } = req.body;

  const data =
    method === "cash_on_delivery"
      ? await PrescriptionOrderService.selectCashOnDeliveryPayment(userId, req.params.id)
      : await SSLCommerzService.initiatePrescriptionPayment(req.params.id, customerInfo || {}, userId);

  res.status(200).json(new ApiResponse(200, "Prescription order payment confirmed", data));
});

export const deletePrescriptionOrder = asyncHandler(async (req: Request, res: Response) => {
  const data = await PrescriptionOrderService.remove(req.params.id);
  res.status(200).json(new ApiResponse(200, "Prescription order deleted", data));
});

/**
 * Upload prescription and process OCR
 * Returns prescription order with extracted text and suggested medicines
 */
export const uploadAndProcessPrescription = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file?.path) throw new ApiError(400, "prescriptionFile is required");

  const userId = getUserId(req);
  
  // Create prescription order with pending_ocr status
  const prescription = await PrescriptionOrderService.createForUser(userId, {
    ...req.body,
    prescriptionFile: req.file.path,
    status: "pending_ocr",
  });

  try {
    // Process OCR in background, but don't block the response
    setImmediate(async () => {
      try {
        const extractedText = await OCRService.extractTextFromPrescription(req.file!.path);
        const suggestedMedicines = OCRService.parseMedicinesFromText(extractedText);
        const { isValid, confidence } = OCRService.validateExtractionQuality(extractedText);

        // Update prescription with OCR results
        await PrescriptionOrderService.update(prescription._id.toString(), {
          extractedText,
          ocrProcessedAt: new Date(),
          status: "pending_verification",
        });
      } catch (error) {
        console.error("OCR processing error:", error);
        // Mark as failed but don't crash the response
        await PrescriptionOrderService.update(prescription._id.toString(), {
          status: "pending_verification", // Let pharmacist review manually
          extractedText: `[OCR failed - Manual review required]`,
        });
      }
    });

    res.status(201).json(
      new ApiResponse(201, "Prescription uploaded successfully. Processing OCR...", {
        prescriptionId: prescription._id,
        status: prescription.status,
        message: "The prescription is being processed. Check back shortly for extracted text.",
      })
    );
  } catch (error) {
    throw new ApiError(500, `Upload failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
});

/**
 * Pharmacist verifies and confirms extracted prescription data
 * Updates medicines list and sets status to "verified"
 */
export const verifyPrescription = asyncHandler(async (req: Request, res: Response) => {
  const pharmacistId = getUserId(req);
  const { medicines, status = "verified", verificationNotes = "" } = req.body;

  if (!medicines || !Array.isArray(medicines)) {
    throw new ApiError(400, "medicines array is required");
  }

  // Validate status is one of allowed values
  const allowedStatuses = ["verified", "rejected"];
  if (!allowedStatuses.includes(status)) {
    throw new ApiError(400, `Status must be one of: ${allowedStatuses.join(", ")}`);
  }

  const updatedPrescription = await PrescriptionOrderService.update(req.params.id, {
    medicines,
    status,
    verifiedBy: pharmacistId,
    verifiedAt: new Date(),
    verificationNotes,
  });

  res.status(200).json(
    new ApiResponse(200, `Prescription ${status} by pharmacist`, updatedPrescription)
  );
});

/**
 * Get OCR extraction details for a prescription
 * Used by frontend to show user the extracted data
 */
export const getPrescriptionOCRDetails = asyncHandler(async (req: Request, res: Response) => {
  const prescription = await PrescriptionOrderService.getById(req.params.id);

  if (!prescription) {
    throw new ApiError(404, "Prescription not found");
  }

  // Check authorization - user can only see their own, pharmacist can see any
  const userId = getUserId(req);
  const userRole = req.user?.role;
  
  if (userRole !== "admin" && userRole !== "pharmacist" && prescription.user.userId.toString() !== userId) {
    throw new ApiError(403, "Not authorized to view this prescription");
  }

  res.status(200).json(
    new ApiResponse(200, "Prescription OCR details fetched", {
      prescriptionId: prescription._id,
      status: prescription.status,
      extractedText: prescription.extractedText,
      suggestedMedicines: prescription.medicines,
      ocrProcessedAt: prescription.ocrProcessedAt,
      verificationStatus: prescription.verifiedAt ? "verified" : "pending",
      verifiedBy: prescription.verifiedBy,
      verificationNotes: prescription.verificationNotes,
    })
  );
});
