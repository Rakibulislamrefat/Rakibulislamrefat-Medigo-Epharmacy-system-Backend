import { Request, Response, NextFunction } from "express";
import { ApiResponse, asyncHandler } from "../../shared/utils";
import { RequestOrderService } from "./requestOrder.service";
import { sendInvoice } from "../../shared/utils/sendInvoice";

type AsyncFn = (req: Request, res: Response, next: NextFunction) => Promise<void>;

export const createRequestOrder = asyncHandler(async (req: Request, res: Response) => {
  const payload = {
    ...req.body,
    meta: {
      ip: req.ip,
      userAgent: req.get("User-Agent") || "",
    },
  };

  const data = await RequestOrderService.create(payload);
  res.status(201).json(new ApiResponse(201, "Request order created", data));
});

export const listRequestOrders = asyncHandler(async (req: Request, res: Response) => {
  const data = await RequestOrderService.list(req.query);
  res.status(200).json(new ApiResponse(200, "Request orders fetched", data));
});

export const listUserRequestOrders = asyncHandler(async (req: Request, res: Response) => {
  const data = await RequestOrderService.listForUser(req.query);
  res.status(200).json(new ApiResponse(200, "User request orders fetched", data));
});

export const getRequestOrder = asyncHandler(async (req: Request, res: Response) => {
  const data = await RequestOrderService.get(req.params.id);
  res.status(200).json(new ApiResponse(200, "Request order fetched", data));
});

export const updateRequestOrder = asyncHandler(async (req: Request, res: Response) => {
  const payload = { ...req.body };

  const data = await RequestOrderService.update(req.params.id, payload);
  res.status(200).json(new ApiResponse(200, "Request order updated", data));
});

export const deleteRequestOrder = asyncHandler(async (req: Request, res: Response) => {
  const data = await RequestOrderService.remove(req.params.id);
  res.status(200).json(new ApiResponse(200, "Request order deleted", data));
});

export const updateRequestOrderPayment = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { method, paymentMethod, status, pharmacistNotes, customerInfo, items, totalAmount, orderId } = req.body;

  // Validate incoming payload
  if (!totalAmount || totalAmount <= 0) {
    res.status(400).json(new ApiResponse(400, "totalAmount is required and must be greater than 0"));
    return;
  }

  const payload = {
    orderId,
    method,
    paymentMethod,
    status,
    pharmacistNotes,
    customerInfo,
    items,
    totalAmount,
  };

  const data = await RequestOrderService.updatePayment(id, payload);

  // Handle SSLCommerz payment initiation
  if (paymentMethod === "sslcommerz" || method === "online") {
    const paymentData = await RequestOrderService.initiateSSLCommerzPayment(id, {
      paymentMethod: "sslcommerz",
      totalAmount,
      customerInfo,
    });
    
    // In a real implementation, you'd call SSLCommerzService here
    // For now, return the prepared payment data
    res.status(200).json(
      new ApiResponse(200, "Payment method updated and ready for SSLCommerz", {
        order: data,
        paymentGateway: "sslcommerz",
        paymentUrl: null, // This would be populated by SSLCommerzService.initiatePayment
      })
    );
    return;
  }

  // Handle COD payment
  void res.status(200).json(
    new ApiResponse(200, "Payment method updated successfully", {
      order: data,
      paymentMethod: paymentMethod || "cod",
    })
  );
});

export const sendRequestOrderInvoice = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { orderId, status, pharmacistNotes, customerInfo, items, totalAmount } = req.body;

  // Get the order to ensure it exists
  const order = await RequestOrderService.get(id);

  if (!order) {
    res.status(404).json(new ApiResponse(404, "Request order not found"));
    return;
  }

  // Prepare invoice data
  const invoiceData = {
    orderId: orderId || id,
    orderNumber: `ORD-${id?.slice(-6).toUpperCase()}`,
    customerInfo: customerInfo || {
      name: order.fullName,
      email: order.email,
      phone: order.phone,
      address: order.deliveryAddress,
      city: order.city,
    },
    items: items || order.items,
    totalAmount: totalAmount || order.totalAmount,
    pharmacistNotes: pharmacistNotes || order.pharmacistNotes,
    status: status || order.status,
    createdAt: order.createdAt,
  };

  // Send invoice via email
  try {
    await sendInvoice(invoiceData);
  } catch (error) {
    console.error("Error sending invoice email:", error);
    res.status(500).json(
      new ApiResponse(500, "Failed to send invoice email", {
        error: "Email service unavailable",
      })
    );
    return;
  }

  void res.status(200).json(
    new ApiResponse(200, "Invoice sent successfully", {
      invoiceSent: true,
      orderNumber: invoiceData.orderNumber,
      email: invoiceData.customerInfo.email,
    })
  );
});
