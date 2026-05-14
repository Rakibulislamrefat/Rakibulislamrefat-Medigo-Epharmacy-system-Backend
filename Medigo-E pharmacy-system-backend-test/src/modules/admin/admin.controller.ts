import { Request, Response } from "express";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import { ApiResponse } from "../../shared/utils/ApiResponse";
import User from "../user/User.schema";
import Product from "../product/Product.schema";
import { EMedicine } from "../epharmacy/models";
import Order from "../order/Order.schema";
import Doctor from "../doctor/Doctor.schema";
import Consultancy from "../consultancy/Consultancy.schema";

export const getAdminMetrics = asyncHandler(async (req: Request, res: Response) => {
  const [users, medicines, orders, doctors, consultancies] = await Promise.all([
    User.countDocuments({ role: "user" }),
    Product.countDocuments(),
    Order.countDocuments(),
    Doctor.countDocuments(),
    Consultancy.countDocuments(),
  ]);

  const metrics = {
    users,
    medicines,
    orders,
    doctors,
    consultancies,
  };

  res.status(200).json(
    new ApiResponse(200, "Admin metrics retrieved", metrics)
  );
});

export const getAdminUsers = asyncHandler(async (req: Request, res: Response) => {
  const { q, page = 1, limit = 10, role, status } = req.query;

  const query: any = {};
  if (q) query.$or = [
    { name: { $regex: q, $options: "i" } },
    { email: { $regex: q, $options: "i" } },
    { phone: { $regex: q, $options: "i" } },
  ];
  if (role) query.role = role;
  if (status) query.status = status;

  const skip = (Number(page) - 1) * Number(limit);
  const [data, total] = await Promise.all([
    User.find(query).skip(skip).limit(Number(limit)),
    User.countDocuments(query),
  ]);

  res.status(200).json(
    new ApiResponse(200, "Admin users retrieved", {
      items: data,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    })
  );
});

export const getAdminMedicines = asyncHandler(async (req: Request, res: Response) => {
  const { q, page = 1, limit = 10, status } = req.query;

  const query: any = {};
  if (q) query.$or = [
    { name: { $regex: q, $options: "i" } },
    { genericName: { $regex: q, $options: "i" } },
    { brandName: { $regex: q, $options: "i" } },
  ];
  if (status) query.status = status;

  const skip = (Number(page) - 1) * Number(limit);
  const [data, total] = await Promise.all([
    Product.find(query).skip(skip).limit(Number(limit)),
    Product.countDocuments(query),
  ]);

  res.status(200).json(
    new ApiResponse(200, "Admin medicines retrieved", {
      items: data,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    })
  );
});

export const getAdminOrders = asyncHandler(async (req: Request, res: Response) => {
  const { q, page = 1, limit = 10, status, paymentStatus } = req.query;

  const query: any = {};
  if (q) query.orderNumber = { $regex: q, $options: "i" };
  if (status) query.status = status;
  if (paymentStatus) query.paymentStatus = paymentStatus;

  const skip = (Number(page) - 1) * Number(limit);
  const [data, total] = await Promise.all([
    Order.find(query)
      .populate("user", "name email phone")
      .populate("items.product")
      .populate("prescription")
      .populate("appliedCoupon")
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 }),
    Order.countDocuments(query),
  ]);

  res.status(200).json(
    new ApiResponse(200, "Admin orders retrieved", {
      items: data,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    })
  );
});

export const getAdminDoctors = asyncHandler(async (req: Request, res: Response) => {
  const { q, page = 1, limit = 10, status } = req.query;

  const query: any = {};
  if (q) query.$or = [
    { fullName: { $regex: q, $options: "i" } },
    { specialization: { $regex: q, $options: "i" } },
  ];
  if (status) query.status = status;

  const skip = (Number(page) - 1) * Number(limit);
  const [data, total] = await Promise.all([
    Doctor.find(query)
      .populate("user", "name email phone")
      .skip(skip)
      .limit(Number(limit)),
    Doctor.countDocuments(query),
  ]);

  res.status(200).json(
    new ApiResponse(200, "Admin doctors retrieved", {
      items: data,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    })
  );
});

export const getAdminConsultancies = asyncHandler(async (req: Request, res: Response) => {
  const { page = 1, limit = 10, status, mode, doctorId, userId } = req.query;

  const query: any = {};
  if (status) query.status = status;
  if (mode) query.mode = mode;
  if (doctorId) query.doctor = doctorId;
  if (userId) query.user = userId;

  const skip = (Number(page) - 1) * Number(limit);
  const [data, total] = await Promise.all([
    Consultancy.find(query)
      .populate("user", "name email phone")
      .populate("doctor", "fullName specialization")
      .skip(skip)
      .limit(Number(limit)),
    Consultancy.countDocuments(query),
  ]);

  res.status(200).json(
    new ApiResponse(200, "Admin consultancies retrieved", {
      items: data,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    })
  );
});

export const updateAdminUser = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { role, status } = req.body;

  const user = await User.findByIdAndUpdate(
    id,
    { role, status },
    { new: true, runValidators: true }
  );

  if (!user) {
    res.status(404).json(new ApiResponse(404, "User not found"));
    return;
  }

  res.status(200).json(new ApiResponse(200, "User updated", user));
});

export const updateAdminOrder = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const order = await Order.findByIdAndUpdate(id, req.body, { new: true });
  if (!order) {
    res.status(404).json(new ApiResponse(404, "Order not found"));
    return;
  }
  res.status(200).json(new ApiResponse(200, "Order updated", order));
});

export const updateAdminOrderStatus = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;
  const order = await Order.findByIdAndUpdate(id, { status }, { new: true });
  if (!order) {
    res.status(404).json(new ApiResponse(404, "Order not found"));
    return;
  }
  res.status(200).json(new ApiResponse(200, "Order status updated", order));
});
