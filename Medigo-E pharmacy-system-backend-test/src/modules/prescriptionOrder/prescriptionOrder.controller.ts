import { Request, Response } from "express";
import { ApiError, ApiResponse, asyncHandler } from "../../shared/utils";
import { PrescriptionOrderService } from "./prescriptionOrder.service";
import { SSLCommerzService } from "../sslcommerz/sslcommerz.service";
import { OCRService } from "./ocr.service";
import { autoMatchPrescription, calculateOrderTotals } from "./prescriptionMatcher.service";
import { matchMedicineFuse } from "./fuseMatcher";

const getUserId = (req: Request) => {
  const userId = req.user?.id;
  if (!userId) throw new ApiError(401, "Not authenticated");
  return userId;
};

const processPrescriptionOCR = async (prescriptionId: string, filePath: string) => {
  try {
    const extractedText = await OCRService.extractTextFromPrescription(filePath);
    const suggestedMedicines = await OCRService.matchMedicinesFromText(extractedText);
    const autoMatched = await autoMatchPrescription({ extractedText, ocrText: extractedText });

    return PrescriptionOrderService.update(prescriptionId, {
      extractedText,
      suggestedMedicines,
      suggestedMatches: autoMatched.items,
      ocrProcessedAt: new Date(),
      status: autoMatched.status,
      pharmacistNotes: "",
    });
  } catch (error) {
    console.error("OCR processing error:", error);

    return PrescriptionOrderService.update(prescriptionId, {
      extractedText: "",
      suggestedMedicines: [],
      suggestedMatches: [],
      ocrProcessedAt: new Date(),
      status: "pending_verification",
      pharmacistNotes: "OCR failed or no readable text found. Manual review required.",
    });
  }
};

const extractPrescriptionPayload = (req: Request) => {
  const body = { ...(req.body || {}) };

  if (typeof body.user === "string") {
    try {
      body.user = JSON.parse(body.user);
    } catch {
      body.user = { name: "", email: "", phone: "" };
    }
  }

  if (typeof body.address === "string") {
    try {
      body.address = JSON.parse(body.address);
    } catch {
      body.address = { line1: "", city: "", country: "" };
    }
  }

  return body;
};

export const createPrescriptionOrder = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file?.path) throw new ApiError(400, "prescriptionFile is required");

  const payload = extractPrescriptionPayload(req);

  const prescription = await PrescriptionOrderService.createForUser(getUserId(req), {
    ...payload,
    prescriptionFile: req.file.path,
    status: "pending_ocr",
  });

  const data = await processPrescriptionOCR(prescription._id.toString(), req.file.path);

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
  const payload = extractPrescriptionPayload(req);
  
  // Create prescription order with pending_ocr status
  const prescription = await PrescriptionOrderService.createForUser(userId, {
    ...payload,
    prescriptionFile: req.file.path,
    status: "pending_ocr",
  });

  try {
    // Process OCR in background, but don't block the response
    setImmediate(async () => {
      try {
        await processPrescriptionOCR(prescription._id.toString(), req.file!.path);
      } catch (error) {
        console.error("OCR processing error:", error);
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
  const { medicines, status = "verified", verificationNotes = "", deliveryFee = 0, discount = 0 } = req.body;

  if (!medicines || !Array.isArray(medicines)) {
    throw new ApiError(400, "medicines array is required");
  }

  const allowedStatuses = ["verified", "rejected"];
  if (!allowedStatuses.includes(status)) {
    throw new ApiError(400, `Status must be one of: ${allowedStatuses.join(", ")}`);
  }

  const totals = await calculateOrderTotals(medicines, Number(deliveryFee || 0), Number(discount || 0));

  const updatedPrescription = await PrescriptionOrderService.update(req.params.id, {
    medicines,
    status,
    verifiedBy: pharmacistId,
    verifiedAt: new Date(),
    verificationNotes,
    paymentInfo: {
      ...(req.body.paymentInfo || {}),
      calculatedTotals: totals,
    },
  });

  res.status(200).json(
    new ApiResponse(200, `Prescription ${status} by pharmacist`, {
      ...updatedPrescription,
      pricing: totals,
    })
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

  // Normalize suggestedMatches and suggestedMedicines for frontend compatibility
  const rawMatches = Array.isArray(prescription.suggestedMatches) ? prescription.suggestedMatches : [];
  const rawMedicines = Array.isArray(prescription.suggestedMedicines) ? prescription.suggestedMedicines : [];

  const suggestedMatches = rawMatches.map((m: any) => {
    const suggestions = Array.isArray(m.suggestions)
      ? m.suggestions.map((s: any) => ({
          _id: s._id ?? s.id ?? null,
          name: s.name ?? s.productName ?? null,
          price: Number(s.price ?? s.salePrice ?? s.price ?? 0) || 0,
          stock: Number(s.stock ?? s.stockQty ?? s.stockQty ?? 0) || 0,
          score: typeof s.score === 'number' ? s.score : (typeof s.matchScore === 'number' ? s.matchScore : undefined),
        }))
      : [];

    return {
      ocrLine: m.ocrLine ?? m.rawText ?? null,
      parsedName: m.parsedName ?? null,
      quantity: typeof m.quantity === 'number' ? m.quantity : Number(m.quantity || 1),
      suggestions,
      selectedMedicineId: m.selectedMedicineId ?? m.selectedId ?? null,
      manualReview: Boolean(m.manualReview),
      matchConfidence: typeof m.matchConfidence === 'number' ? m.matchConfidence : (m.score ?? undefined),
    };
  });

  // Build suggestedMedicines for frontend convenience (name, medicineId, price, quantity)
  const suggestedMedicines = rawMatches.map((m: any, idx: number) => {
    const match = suggestedMatches[idx] ?? {};
    const chosen = Array.isArray(match.suggestions) && match.suggestions.length > 0
      ? match.suggestions.find((s: any) => String(s._id) === String(match.selectedMedicineId)) ?? match.suggestions[0]
      : null;

    const base = rawMedicines[idx] ?? {};

    const price = chosen?.price ?? (base.price ?? base.salePrice ?? null);
    const salePrice = price;

    return {
      id: base.id ?? base._id ?? `line_${idx}`,
      medicineId: chosen?._id ?? base.medicineId ?? base._id ?? null,
      name: chosen?.name ?? base.name ?? match.parsedName ?? base.medicineName ?? match.ocrLine ?? `line_${idx}`,
      dosage: base.dosage ?? base.strength ?? null,
      quantity: match.quantity ?? base.quantity ?? 1,
      price: price ?? null,
      salePrice: salePrice ?? null,
    };
  });

  res.status(200).json(
    new ApiResponse(200, "Prescription OCR details fetched", {
      prescriptionId: prescription._id,
      status: prescription.status,
      extractedText: prescription.extractedText,
      suggestedMedicines,
      suggestedMatches,
      ocrProcessedAt: prescription.ocrProcessedAt,
      verificationStatus: prescription.verifiedAt ? "verified" : "pending",
      verifiedBy: prescription.verifiedBy,
      verificationNotes: prescription.verificationNotes,
      pharmacistNotes: prescription.pharmacistNotes,
    })
  );
});

// Demo endpoint to run the matcher live for a prescription id
export const getPrescriptionMatchDemo = asyncHandler(async (req: Request, res: Response) => {
  const prescription = await PrescriptionOrderService.getById(req.params.id);
  if (!prescription) throw new ApiError(404, "Prescription not found");

  const ocrText = prescription.extractedText || '';

  // Run auto-match pipeline
  const auto = await autoMatchPrescription({ extractedText: ocrText, ocrText });

  // Also run the lower-level fuse matcher for the full text as a convenience
  const simpleSuggestions = [] as any[];
  const lines = (ocrText || '').split(/\r?\n/).map((l: string) => l.trim()).filter(Boolean);
  for (const line of lines) {
    const matches = await matchMedicineFuse(line, 5);
    simpleSuggestions.push({ ocrLine: line, matches });
  }

  res.status(200).json(new ApiResponse(200, 'Matcher demo output', {
    prescriptionId: prescription._id,
    extractedText: ocrText,
    suggestedMatches: auto.items,
    simpleSuggestions,
  }));
});
