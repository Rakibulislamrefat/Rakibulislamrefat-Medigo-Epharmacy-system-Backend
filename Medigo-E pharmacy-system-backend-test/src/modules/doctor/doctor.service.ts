import mongoose from "mongoose";
import Doctor from "./Doctor.schema";
import { ApiError, paginate } from "../../shared/utils";

const isValidId = (id: string) => mongoose.Types.ObjectId.isValid(id);
const DOCTOR_STATUSES = ["active", "inactive"];
const CONSULTATION_TYPES = ["online", "in-person", "both"];
const DOCTOR_FIELDS = [
  "fullName",
  "profileImage",
  "qualifications",
  "specialization",
  "experienceYears",
  "consultationType",
  "city",
  "availability",
  "nextAvailableAt",
  "rating",
  "totalReviews",
  "fee",
  "currency",
  "registrationNumber",
  "bio",
  "languages",
  "email",
  "phone",
  "status",
];

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const toStringArray = (value: unknown) => {
  if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean);
  if (typeof value !== "string") return value;

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.map(String).map((item) => item.trim()).filter(Boolean);
    }
  } catch {
    // Fall back to comma-separated values.
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

const normalizeDoctorPayload = (payload: any = {}, partial = false) => {
  const normalized: Record<string, any> = {};

  for (const field of DOCTOR_FIELDS) {
    if (payload[field] !== undefined) normalized[field] = payload[field];
  }

  for (const field of [
    "fullName",
    "email",
    "phone",
    "profileImage",
    "specialization",
    "consultationType",
    "city",
    "registrationNumber",
    "bio",
    "currency",
    "status",
  ]) {
    if (typeof normalized[field] === "string") normalized[field] = normalized[field].trim();
  }

  if (normalized.email) normalized.email = normalized.email.toLowerCase();
  if (normalized.qualifications != null) {
    normalized.qualifications = toStringArray(normalized.qualifications);
  }
  if (normalized.languages != null) normalized.languages = toStringArray(normalized.languages);
  for (const field of ["experienceYears", "rating", "totalReviews", "fee"]) {
    if (normalized[field] !== undefined && normalized[field] !== "") {
      normalized[field] = Number(normalized[field]);
    }
    if (normalized[field] === "") normalized[field] = 0;
  }
  if (normalized.nextAvailableAt === "") normalized.nextAvailableAt = null;
  if (normalized.nextAvailableAt) normalized.nextAvailableAt = new Date(normalized.nextAvailableAt);

  if (!partial) {
    if (!normalized.fullName) throw new ApiError(400, "fullName is required");
  }

  if (normalized.status && !DOCTOR_STATUSES.includes(normalized.status)) {
    throw new ApiError(400, "status must be active or inactive");
  }
  if (normalized.consultationType && !CONSULTATION_TYPES.includes(normalized.consultationType)) {
    throw new ApiError(400, "consultationType must be online, in-person, or both");
  }
  for (const field of ["experienceYears", "rating", "totalReviews", "fee"]) {
    if (normalized[field] !== undefined && !Number.isFinite(normalized[field])) {
      throw new ApiError(400, `${field} must be a number`);
    }
  }
  if (normalized.rating !== undefined && (normalized.rating < 0 || normalized.rating > 5)) {
    throw new ApiError(400, "rating must be between 0 and 5");
  }
  if (normalized.nextAvailableAt instanceof Date && Number.isNaN(normalized.nextAvailableAt.getTime())) {
    throw new ApiError(400, "nextAvailableAt must be a valid date");
  }

  return normalized;
};

export class DoctorService {
  static async create(payload: any) {
    const created = await Doctor.create(normalizeDoctorPayload(payload));
    return created;
  }

  static async list(query: any) {
    const paginationQuery = { ...(query || {}), limit: query?.rows || query?.limit };
    const { skip, limit, page, totalPages } = paginate(paginationQuery);
    const filter: any = {};
    if (query?.status && String(query.status).toLowerCase() !== "all") filter.status = query.status;
    if (query?.consultationType && String(query.consultationType).toLowerCase() !== "all") {
      filter.consultationType = query.consultationType;
    }
    if (query?.city) filter.city = new RegExp(escapeRegex(String(query.city).trim()), "i");
    if (query?.specialization) {
      filter.specialization = new RegExp(escapeRegex(String(query.specialization).trim()), "i");
    }
    const search = query?.q || query?.search;
    if (search) {
      const regex = new RegExp(escapeRegex(String(search).trim()), "i");
      filter.$or = [
        { fullName: regex },
        { email: regex },
        { phone: regex },
        { specialization: regex },
        { city: regex },
        { registrationNumber: regex },
      ];
    }
    const [items, total] = await Promise.all([
      Doctor.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }),
      Doctor.countDocuments(filter),
    ]);
    return { items, pagination: { total, page, limit, totalPages: totalPages(total) } };
  }

  static async get(id: string) {
    if (!isValidId(id)) throw new ApiError(400, "Invalid doctor id");
    const doc = await Doctor.findById(id);
    if (!doc) throw new ApiError(404, "Doctor not found");
    return doc;
  }

  static async update(id: string, payload: any) {
    if (!isValidId(id)) throw new ApiError(400, "Invalid doctor id");
    const doc = await Doctor.findByIdAndUpdate(id, normalizeDoctorPayload(payload, true), {
      new: true,
      runValidators: true,
    });
    if (!doc) throw new ApiError(404, "Doctor not found");
    return doc;
  }

  static async remove(id: string) {
    if (!isValidId(id)) throw new ApiError(400, "Invalid doctor id");
    const doc = await Doctor.findByIdAndDelete(id);
    if (!doc) throw new ApiError(404, "Doctor not found");
    return doc;
  }
}

