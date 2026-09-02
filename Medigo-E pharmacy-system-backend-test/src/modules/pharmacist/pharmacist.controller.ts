import { Request, Response } from "express";
import { ApiError, ApiResponse, asyncHandler } from "../../shared/utils";
import { PharmacistService } from "./pharmacist.service";

const getPharmacistId = (req: Request) => {
  const userId = req.user?.id;
  if (!userId) throw new ApiError(401, "Not authenticated");
  return userId;
};

/**
 * Get pharmacist dashboard statistics
 */
export const getDashboardStats = asyncHandler(async (req: Request, res: Response) => {
  const pharmacistId = getPharmacistId(req);
  const stats = await PharmacistService.getDashboardStats(pharmacistId);
  res.status(200).json(new ApiResponse(200, "Dashboard loaded successfully", {
    totalOrdersToday: stats.totalOrdersToday,
    pendingVerification: stats.pendingVerification,
    verifiedToday: stats.verifiedToday,
    ordersReady: stats.ordersReady,
    recentOrders: (stats.recentOrders || []).map((order: any) => ({
      _id: order._id,
      customerName: order.user?.name || "",
      customerPhone: order.user?.phone || "",
      status: order.status,
      suggestedMedicines: order.medicines || [],
      createdAt: order.createdAt,
    })),
  }));
});

/**
 * Get all requested orders (pending verification)
 */
export const getRequestedOrders = asyncHandler(async (req: Request, res: Response) => {
  const { status = "pending_verification", page = 1, limit = 10 } = req.query;

  const result = await PharmacistService.getRequestedOrders(
    String(status),
    Number(page) || 1,
    Number(limit) || 10
  );

  res.status(200).json(new ApiResponse(200, "Requested orders loaded successfully", result.items));
});

/**
 * Get single prescription order details
 */
export const getPrescriptionOrder = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const prescription = await PharmacistService.getPrescriptionOrder(id);
  res.status(200).json(new ApiResponse(200, "Order details loaded successfully", prescription));
});

/**
 * Verify prescription (approve medicines)
 */
export const verifyPrescription = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { medicines, verifiedMedicines, verificationNotes, pharmacistNotes, deliveryFee } = req.body;
  const pharmacistId = getPharmacistId(req);

  const selectedMedicines = medicines ?? verifiedMedicines ?? [];
  const notes = verificationNotes ?? pharmacistNotes ?? "";

  const updated = await PharmacistService.verifyPrescription(
    id,
    pharmacistId,
    selectedMedicines,
    notes,
    Number(deliveryFee || 0)
  );

  res.status(200).json(new ApiResponse(200, "Order verified successfully", updated));
});

/**
 * Reject prescription
 */
export const rejectPrescription = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { reason } = req.body;
  const pharmacistId = getPharmacistId(req);

  if (!reason || !reason.trim()) {
    throw new ApiError(400, "Rejection reason is required");
  }

  const updated = await PharmacistService.rejectPrescription(id, pharmacistId, reason);

  res.status(200).json(new ApiResponse(200, "Order rejected successfully", updated));
});

/**
 * Get all prescribed orders (orders in fulfillment)
 */
export const getPrescribedOrders = asyncHandler(async (req: Request, res: Response) => {
  const { status, page = 1, limit = 10 } = req.query;

  const result = await PharmacistService.getPrescribedOrders(
    status ? String(status) : undefined,
    Number(page) || 1,
    Number(limit) || 10
  );

  res.status(200).json(new ApiResponse(200, "Prescribed orders loaded successfully", result.items));
});

/**
 * Get single order details
 */
export const getOrder = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const order = await PharmacistService.getOrder(id);
  res.status(200).json(new ApiResponse(200, "Order details loaded successfully", order));
});

/**
 * Update order status (progress through workflow)
 */
export const updateOrderStatus = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    throw new ApiError(400, "Status is required");
  }

  const updated = await PharmacistService.updateOrderStatus(
    id,
    status as "picked" | "packed" | "ready_for_delivery" | "delivered"
  );

  res.status(200).json(new ApiResponse(200, "Order status updated successfully", updated));
});

/**
 * Generate invoice for an order
 */
export const generateInvoice = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await PharmacistService.generateInvoice(id);
  const invoiceUrl = (result as any)?.invoiceUrl || (result as any)?.invoiceData?.invoiceUrl || "";

  res.status(200).json({
    status: 200,
    message: "Invoice generated",
    data: {
      invoiceUrl,
    },
  });
});

/**
 * Search prescriptions
 */
export const searchPrescriptions = asyncHandler(async (req: Request, res: Response) => {
  const { q, limit = 20 } = req.query;

  if (!q) {
    throw new ApiError(400, "Search query is required");
  }

  const results = await PharmacistService.searchPrescriptions(String(q), Number(limit));
  res.status(200).json(new ApiResponse(200, "Search results", results));
});
