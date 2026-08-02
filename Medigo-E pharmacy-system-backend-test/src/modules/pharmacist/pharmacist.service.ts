import mongoose from "mongoose";
import PrescriptionOrder from "../prescriptionOrder/prescriptionOrder.schema";
import Order from "../order/Order.schema";
import { ApiError, paginate } from "../../shared/utils";

export const formatPrescriptionOrderForPharmacist = (prescription: any) => {
  if (!prescription) return prescription;

  const user = prescription.user?.userId || prescription.user || {};
  const address = prescription.address || {};

  return {
    _id: prescription._id,
    prescriptionImageUrl: prescription.prescriptionImageUrl || prescription.prescriptionFile || "",
    prescriptionFile: prescription.prescriptionFile || "",
    extractedText: prescription.extractedText || "",
    suggestedMedicines: prescription.suggestedMedicines || [],
    medicines: prescription.medicines || [],
    customerName: user.name || "",
    customerPhone: user.phone || "",
    customerEmail: user.email || "",
    deliveryAddress: address.line1 || "",
    city: address.city || "",
    country: address.country || "",
    address,
    status: prescription.status,
    notes: prescription.notes || "",
    pharmacistNotes: prescription.pharmacistNotes || prescription.verificationNotes || "",
    verificationNotes: prescription.verificationNotes || "",
    createdAt: prescription.createdAt,
    updatedAt: prescription.updatedAt,
  };
};

export const formatOrderForPharmacist = (order: any) => {
  if (!order) return order;

  const user = order.user || {};
  const deliveryAddress = order.deliveryAddress || {};

  return {
    _id: order._id,
    prescriptionOrderId: order.prescriptionOrderId || null,
    customerName: order.contactName || user.name || "",
    customerPhone: order.contactPhone || user.phone || "",
    deliveryAddress: deliveryAddress.line1 || "",
    city: deliveryAddress.city || "",
    country: deliveryAddress.country || "",
    address: deliveryAddress,
    status: order.status,
    totalAmount: order.totalAmount ?? order.grandTotal ?? 0,
    medicines: order.medicines || [],
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
};

export const buildFulfillmentOrderData = (prescription: any, medicines: any[] = [], notes = "") => {
  const user = prescription?.user?.userId || prescription?.user || {};
  const address = prescription?.address || {};
  const normalizedMedicines = (medicines || []).map((medicine: any) => ({
    medicineId: medicine.medicineId ? new mongoose.Types.ObjectId(medicine.medicineId) : null,
    name: String(medicine.name || ""),
    dosage: String(medicine.dosage || ""),
    quantity: Number(medicine.quantity || 1),
    price: Number(medicine.price || 0),
    salePrice: Number(medicine.salePrice || medicine.price || 0),
    requiresPrescription: Boolean(medicine.requiresPrescription || false),
    status: "active",
  }));

  const totalAmount = normalizedMedicines.reduce(
    (sum, medicine) => sum + Number(medicine.price || 0) * Number(medicine.quantity || 1),
    0
  );

  return {
    orderNumber: `FUL-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
    user: user._id || user.id || prescription?.user?.userId || undefined,
    prescriptionOrderId: prescription?._id ? new mongoose.Types.ObjectId(prescription._id) : null,
    medicines: normalizedMedicines,
    status: "pending_pickup",
    customerName: prescription?.user?.name || user.name || "",
    customerPhone: prescription?.user?.phone || user.phone || "",
    contactName: prescription?.user?.name || user.name || "",
    contactPhone: prescription?.user?.phone || user.phone || "",
    deliveryAddress: {
      line1: address.line1 || "",
      line2: address.line2 || "",
      city: address.city || "",
      state: address.state || "",
      postcode: address.postcode || "",
      country: address.country || "",
      country_code: address.country_code || "",
      coordinates: address.coordinates || {},
    },
    totalAmount,
    subtotal: totalAmount,
    grandTotal: totalAmount,
    notes: notes || "",
    prescriptionRequired: true,
    prescription: prescription?._id || null,
  };
};

export class PharmacistService {
  /**
   * Get pharmacist dashboard statistics
   */
  static async getDashboardStats(pharmacistId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      // Total orders created today
      const totalOrdersToday = await Order.countDocuments({
        createdAt: { $gte: today },
      });

      // Pending verification prescriptions
      const pendingVerification = await PrescriptionOrder.countDocuments({
        status: "pending_verification",
      });

      // Verified today by this pharmacist
      const verifiedToday = await PrescriptionOrder.countDocuments({
        verifiedBy: new mongoose.Types.ObjectId(pharmacistId),
        verifiedAt: { $gte: today },
      });

      // Orders ready for delivery
      const ordersReady = await Order.countDocuments({
        status: "ready_for_delivery",
      });

      // Recent orders (last 5)
      const recentOrders = await Order.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select("_id user medicines status createdAt totalAmount")
        .lean();

      return {
        totalOrdersToday,
        pendingVerification,
        verifiedToday,
        ordersReady,
        recentOrders,
      };
    } catch (error) {
      throw new ApiError(
        500,
        error instanceof Error ? error.message : "Failed to fetch dashboard stats"
      );
    }
  }

  /**
   * Get all requested orders (pending verification)
   */
  static async getRequestedOrders(
    status: string = "pending_verification",
    page: number = 1,
    limit: number = 10
  ) {
    try {
      const skip = (page - 1) * limit;

      const filterQuery: any = {};

      // Filter by status
      if (status === "pending_verification") {
        filterQuery.status = "pending_verification";
      } else if (status === "verified") {
        filterQuery.status = "verified";
      } else if (status === "rejected") {
        filterQuery.status = "rejected";
      }

      const [items, total] = await Promise.all([
        PrescriptionOrder.find(filterQuery)
          .populate("user.userId", "name email phone")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        PrescriptionOrder.countDocuments(filterQuery),
      ]);

      const totalPages = Math.ceil(total / limit);
      return {
        items: items.map(formatPrescriptionOrderForPharmacist),
        pagination: { total, page, limit, totalPages },
      };
    } catch (error) {
      throw new ApiError(
        500,
        error instanceof Error ? error.message : "Failed to fetch requested orders"
      );
    }
  }

  /**
   * Get single prescription order details
   */
  static async getPrescriptionOrder(prescriptionId: string) {
    try {
      if (!mongoose.Types.ObjectId.isValid(prescriptionId)) {
        throw new ApiError(400, "Invalid prescription ID");
      }

      const prescription = await PrescriptionOrder.findById(prescriptionId)
        .populate("user.userId", "name email phone address")
        .populate("medicines.medicineId", "name genericName price salePrice")
        .lean();

      if (!prescription) {
        throw new ApiError(404, "Prescription not found");
      }

      return formatPrescriptionOrderForPharmacist(prescription);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        500,
        error instanceof Error ? error.message : "Failed to fetch prescription"
      );
    }
  }

  /**
   * Verify prescription (pharmacist approves medicines)
   */
  static async verifyPrescription(
    prescriptionId: string,
    pharmacistId: string,
    medicines: any[],
    verificationNotes?: string
  ) {
    try {
      if (!mongoose.Types.ObjectId.isValid(prescriptionId)) {
        throw new ApiError(400, "Invalid prescription ID");
      }

      if (!medicines || medicines.length === 0) {
        throw new ApiError(400, "At least one medicine is required");
      }

      const updatedPrescription = await PrescriptionOrder.findByIdAndUpdate(
        prescriptionId,
        {
          status: "verified",
          medicines: (medicines || []).map((medicine: any) => ({
            medicineId: medicine.medicineId ? new mongoose.Types.ObjectId(medicine.medicineId) : undefined,
            name: String(medicine.name || ""),
            genericName: String(medicine.genericName || ""),
            brandName: String(medicine.brandName || ""),
            quantity: Number(medicine.quantity || 1),
            price: Number(medicine.price || 0),
            salePrice: Number(medicine.salePrice || medicine.price || 0),
            images: medicine.images || [],
            requiresPrescription: Boolean(medicine.requiresPrescription || false),
            status: "active",
          })),
          verifiedBy: new mongoose.Types.ObjectId(pharmacistId),
          verifiedAt: new Date(),
          verificationNotes: verificationNotes || "",
          pharmacistNotes: verificationNotes || "",
        },
        { new: true }
      )
        .populate("user.userId", "name email phone")
        .lean();

      if (!updatedPrescription) {
        throw new ApiError(404, "Prescription not found");
      }

      const prescriptionIdValue = (updatedPrescription as any)?._id ?? prescriptionId;
      const existingFulfillmentOrder = await Order.findOne({ prescriptionOrderId: prescriptionIdValue }).lean();
      const fulfillmentOrder = existingFulfillmentOrder
        ? existingFulfillmentOrder
        : await Order.create(buildFulfillmentOrderData(updatedPrescription, medicines, verificationNotes || ""));

      const responsePayload = {
        ...formatPrescriptionOrderForPharmacist(updatedPrescription),
        fulfillmentOrderId: fulfillmentOrder?._id || null,
        fulfillmentOrder: formatOrderForPharmacist(fulfillmentOrder),
      };

      return responsePayload;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        500,
        error instanceof Error ? error.message : "Failed to verify prescription"
      );
    }
  }

  /**
   * Reject prescription
   */
  static async rejectPrescription(
    prescriptionId: string,
    pharmacistId: string,
    reason: string
  ) {
    try {
      if (!mongoose.Types.ObjectId.isValid(prescriptionId)) {
        throw new ApiError(400, "Invalid prescription ID");
      }

      if (!reason || !reason.trim()) {
        throw new ApiError(400, "Rejection reason is required");
      }

      const updatedPrescription = await PrescriptionOrder.findByIdAndUpdate(
        prescriptionId,
        {
          status: "rejected",
          verifiedBy: new mongoose.Types.ObjectId(pharmacistId),
          verifiedAt: new Date(),
          verificationNotes: `REJECTED: ${reason}`,
          pharmacistNotes: reason,
        },
        { new: true }
      )
        .populate("user.userId", "name email phone")
        .lean();

      if (!updatedPrescription) {
        throw new ApiError(404, "Prescription not found");
      }

      // TODO: Send notification to user about rejection
      // notificationService.sendRejectionEmail(updatedPrescription.user.email, reason);

      return formatPrescriptionOrderForPharmacist(updatedPrescription);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        500,
        error instanceof Error ? error.message : "Failed to reject prescription"
      );
    }
  }

  /**
   * Get all prescribed orders (orders ready for fulfillment)
   */
  static async getPrescribedOrders(
    status?: string,
    page: number = 1,
    limit: number = 10
  ) {
    try {
      const skip = (page - 1) * limit;

      const filterQuery: any = {};

      // Filter by status
      if (status) {
        filterQuery.status = status;
      } else {
        // Default: show all non-completed orders
        filterQuery.status = {
          $in: ["pending_pickup", "picked", "packed", "ready_for_delivery"],
        };
      }

      const [items, total] = await Promise.all([
        Order.find(filterQuery)
          .populate("user", "name email phone")
          .populate("medicines.medicineId", "name price salePrice")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Order.countDocuments(filterQuery),
      ]);

      const totalPages = Math.ceil(total / limit);
      return {
        items: items.map(formatOrderForPharmacist),
        pagination: { total, page, limit, totalPages },
      };
    } catch (error) {
      throw new ApiError(
        500,
        error instanceof Error ? error.message : "Failed to fetch prescribed orders"
      );
    }
  }

  /**
   * Get single order details
   */
  static async getOrder(orderId: string) {
    try {
      if (!mongoose.Types.ObjectId.isValid(orderId)) {
        throw new ApiError(400, "Invalid order ID");
      }

      const order = await Order.findById(orderId)
        .populate("user", "name email phone address")
        .populate("medicines.medicineId", "name genericName price salePrice quantity")
        .lean();

      if (!order) {
        throw new ApiError(404, "Order not found");
      }

      return formatOrderForPharmacist(order);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        500,
        error instanceof Error ? error.message : "Failed to fetch order"
      );
    }
  }

  /**
   * Update order status (progress through fulfillment workflow)
   */
  static async updateOrderStatus(
    orderId: string,
    newStatus: "picked" | "packed" | "ready_for_delivery" | "delivered"
  ) {
    try {
      if (!mongoose.Types.ObjectId.isValid(orderId)) {
        throw new ApiError(400, "Invalid order ID");
      }

      const validStatuses = ["picked", "packed", "ready_for_delivery", "delivered"];
      if (!validStatuses.includes(newStatus)) {
        throw new ApiError(400, `Invalid status. Must be one of: ${validStatuses.join(", ")}`);
      }

      const order = await Order.findById(orderId);
      if (!order) {
        throw new ApiError(404, "Order not found");
      }

      // Validate status progression
      const statusProgression = [
        "pending_pickup",
        "picked",
        "packed",
        "ready_for_delivery",
        "delivered",
      ];
      const currentIndex = statusProgression.indexOf(order.status);
      const newIndex = statusProgression.indexOf(newStatus);

      if (newIndex <= currentIndex) {
        throw new ApiError(
          400,
          `Cannot go from ${order.status} to ${newStatus}. Must progress forward.`
        );
      }

      const updatedOrder = await Order.findByIdAndUpdate(
        orderId,
        {
          status: newStatus,
          updatedAt: new Date(),
        },
        { new: true }
      )
        .populate("user", "name email phone")
        .populate("medicines.medicineId", "name")
        .lean();

      // TODO: Send notification to user about status update
      // notificationService.sendOrderStatusUpdate(order.user.email, newStatus);

      return formatOrderForPharmacist(updatedOrder);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        500,
        error instanceof Error ? error.message : "Failed to update order status"
      );
    }
  }

  /**
   * Generate invoice for an order
   */
  static async generateInvoice(orderId: string) {
    try {
      if (!mongoose.Types.ObjectId.isValid(orderId)) {
        throw new ApiError(400, "Invalid order ID");
      }

      const order = await Order.findById(orderId)
        .populate("user", "name email phone address")
        .populate("medicines.medicineId", "name price salePrice")
        .lean();

      if (!order) {
        throw new ApiError(404, "Order not found");
      }

      // TODO: Generate PDF or HTML invoice
      // For now, return invoice data structure
      const orderIdValue = (order as any)?._id ?? orderId;
      const invoiceId = `INV-${orderIdValue}`;
      const invoiceUrl = `${process.env.API_URL || "http://localhost:5000"}/invoices/${invoiceId}.pdf`;
      const invoiceData = {
        invoiceId,
        invoiceDate: new Date().toISOString(),
        order,
        totalAmount: (order as any).totalAmount || 0,
      };

      // TODO: Save invoice to storage or S3

      return {
        success: true,
        message: "Invoice generated",
        invoiceData,
        invoiceUrl,
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        500,
        error instanceof Error ? error.message : "Failed to generate invoice"
      );
    }
  }

  /**
   * Search prescriptions by patient name, email, or prescription ID
   */
  static async searchPrescriptions(query: string, limit: number = 20) {
    try {
      if (!query || query.trim().length < 2) {
        throw new ApiError(400, "Search query must be at least 2 characters");
      }

      const searchQuery: any = {
        $or: [
          { "user.name": { $regex: query, $options: "i" } },
          { "user.email": { $regex: query, $options: "i" } },
          { "user.phone": { $regex: query, $options: "i" } },
        ],
      };

      // Add ID search if query is a valid ObjectId
      if (mongoose.Types.ObjectId.isValid(query)) {
        searchQuery.$or.push({ _id: new mongoose.Types.ObjectId(query) });
      }

      const results = await PrescriptionOrder.find(searchQuery)
        .limit(limit)
        .select("_id user medicines status createdAt")
        .lean();

      return results;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        500,
        error instanceof Error ? error.message : "Search failed"
      );
    }
  }
}
