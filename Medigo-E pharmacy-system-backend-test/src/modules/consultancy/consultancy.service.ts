import mongoose from "mongoose";
import Consultancy from "./Consultancy.schema";
import { ApiError, paginate, sendEmail } from "../../shared/utils";

const isValidId = (id: string) => mongoose.Types.ObjectId.isValid(id);

export class ConsultancyService {
  static async createForUser(userId: string | null, payload: any) {
    const {
      userId: payloadUserId,
      doctorId,
      doctor,
      status,
      patientName,
      contactPhone,
      contactEmail,
      mode,
      scheduledAt,
      durationMinutes,
      symptoms,
      notes,
      attachments,
    } = payload || {};
    const effectiveUserId = userId || payloadUserId || null;
    const doctorValue = doctorId || doctor;

    if (effectiveUserId && !isValidId(String(effectiveUserId))) {
      throw new ApiError(400, "Invalid user id");
    }
    if (!doctorValue) throw new ApiError(400, "doctorId is required");
    if (!isValidId(String(doctorValue))) throw new ApiError(400, "Invalid doctor id");

    const created = await Consultancy.create({
      user: effectiveUserId,
      doctor: doctorValue,
      status: status || "requested",
      patientName: patientName || "",
      contactPhone: contactPhone || "",
      contactEmail: contactEmail || "",
      mode: mode || "chat",
      scheduledAt: scheduledAt || null,
      durationMinutes: durationMinutes ?? 15,
      symptoms: symptoms || "",
      notes: notes || "",
      attachments: Array.isArray(attachments) ? attachments : [],
    });
    return created;
  }

  static async sendConfirmation(id: string) {
    if (!isValidId(id)) throw new ApiError(400, "Invalid consultancy id");

    const doc = await Consultancy.findById(id)
      .populate("user", "email name fullName")
      .populate("doctor", "fullName");

    if (!doc) throw new ApiError(404, "Consultancy not found");

    const recipient = doc.user?.email || doc.contactEmail;
    if (!recipient) throw new ApiError(400, "No email address found for consultancy user");

    const doctorName = doc.doctor?.fullName || "your doctor";
    const patientName = doc.user?.fullName || doc.user?.name || doc.patientName || "patient";
    const subject = `Consultancy booking confirmation`;
    const html = `
      <p>Hello ${patientName},</p>
      <p>Your consultancy booking has been received for ${doctorName}.</p>
      <p>Appointment mode: ${doc.mode || "chat"}</p>
      <p>Scheduled at: ${doc.scheduledAt ? new Date(doc.scheduledAt).toLocaleString() : "TBD"}</p>
      <p>We will notify you once the booking is confirmed.</p>
    `;

    try {
      await sendEmail({ to: recipient, subject, html });
      return true;
    } catch (error) {
      console.error("Failed to send consultancy confirmation email:", error);
      return false;
    }
  }

  static async listForUser(userId: string, query: any) {
    if (!isValidId(userId)) throw new ApiError(400, "Invalid user id");
    const { skip, limit, page, totalPages } = paginate(query || {});
    const filter: any = { user: userId };
    if (query?.status) filter.status = query.status;
    const [items, total] = await Promise.all([
      Consultancy.find(filter).populate("doctor transaction").skip(skip).limit(limit).sort({ createdAt: -1 }),
      Consultancy.countDocuments(filter),
    ]);
    return { items, pagination: { total, page, limit, totalPages: totalPages(total) } };
  }

  static async listAll(query: any) {
    const { skip, limit, page, totalPages } = paginate(query || {});
    const filter: any = {};
    if (query?.status) filter.status = query.status;
    if (query?.doctor && isValidId(String(query.doctor))) filter.doctor = query.doctor;
    if (query?.user && isValidId(String(query.user))) filter.user = query.user;
    const [items, total] = await Promise.all([
      Consultancy.find(filter).populate("user doctor transaction").skip(skip).limit(limit).sort({ createdAt: -1 }),
      Consultancy.countDocuments(filter),
    ]);
    return { items, pagination: { total, page, limit, totalPages: totalPages(total) } };
  }

  static async listReadyForDoctor(doctorId: string, query: any) {
    if (!isValidId(doctorId)) throw new ApiError(400, "Invalid doctor id");
    const { skip, limit, page, totalPages } = paginate(query || {});
    const filter: any = { doctor: doctorId, status: "ready" };
    if (query?.mode) filter.mode = query.mode;
    const [items, total] = await Promise.all([
      Consultancy.find(filter).populate("user doctor transaction").skip(skip).limit(limit).sort({ createdAt: -1 }),
      Consultancy.countDocuments(filter),
    ]);
    return { items, pagination: { total, page, limit, totalPages: totalPages(total) } };
  }

  static async markReady(id: string, userId: string, userRole: string) {
    if (!isValidId(id)) throw new ApiError(400, "Invalid consultancy id");
    const doc = await Consultancy.findById(id);
    if (!doc) throw new ApiError(404, "Consultancy not found");
    if (userRole === "doctor" && String(doc.doctor) !== String(userId)) {
      throw new ApiError(403, "Access denied");
    }
    if (doc.status === "cancelled" || doc.status === "completed") {
      throw new ApiError(400, "Cannot mark this consultancy as ready");
    }
    doc.status = "ready";
    await doc.save();
    return await doc.populate("user doctor transaction");
  }

  static async get(id: string) {
    if (!isValidId(id)) throw new ApiError(400, "Invalid consultancy id");
    const doc = await Consultancy.findById(id).populate("user doctor transaction");
    if (!doc) throw new ApiError(404, "Consultancy not found");
    return doc;
  }

  static async update(id: string, payload: any) {
    if (!isValidId(id)) throw new ApiError(400, "Invalid consultancy id");
    const doc = await Consultancy.findByIdAndUpdate(id, payload, { new: true });
    if (!doc) throw new ApiError(404, "Consultancy not found");
    return doc;
  }
}

