import { Router } from "express";
import {
  uploadAvatar,
  createUserByAdmin,
  register,
  login,
  adminLogin,
  pharmacistLogin,
  logout,
  refreshAccessToken,
  forgotPassword,
  resetPassword,
  sendEmailOtp,
  verifyEmailOtp,
  getAuthUser,
  updateAuthUser,
  changePassword,
  getMySessions,
  logoutOtherSessions,
  logoutSingleSession,
  deactivateAccount,
  deleteAccount,
} from "./auth.controller";
import { protect } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/role.middleware";
import { upload } from "../../middleware/upload.middleware";
import {
  authLimiter,
  forgotPasswordLimiter,
  otpSendLimiter,
  otpVerifyLimiter,
} from "../../middleware/rateLimiter.middleware";
import { validate } from "../../middleware/validation.middleware";
import {
  registerSchema,
  adminCreateUserSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  sendOtpSchema,
  verifyOtpSchema,
} from "./auth.validation";

const router = Router();

// ══════════════════════════════════════════════════════
//  PUBLIC ROUTES
// ══════════════════════════════════════════════════════

// POST /api/auth/upload-avatar
router.post("/upload-avatar", authLimiter, upload.avatar, uploadAvatar);

// POST /api/auth/register
router.post("/register", authLimiter, validate(registerSchema), register);

// POST /api/auth/login
router.post("/login", authLimiter, validate(loginSchema), login);

// POST /api/auth/admin-login
router.post("/admin-login", authLimiter, validate(loginSchema), adminLogin);

// POST /api/auth/pharmacist-login
router.post("/pharmacist-login", authLimiter, validate(loginSchema), pharmacistLogin);

// POST /api/auth/refresh-token  (uses cookie — no body needed)
router.post("/refresh-token", refreshAccessToken);

// POST /api/auth/forgot-password
router.post(
  "/forgot-password",
  forgotPasswordLimiter,
  validate(forgotPasswordSchema),
  forgotPassword,
);

// POST /api/auth/reset-password
router.post("/reset-password", validate(resetPasswordSchema), resetPassword);

// POST /api/auth/send-otp
router.post("/send-otp", otpSendLimiter, validate(sendOtpSchema), sendEmailOtp);

// POST /api/auth/verify-otp
router.post("/verify-otp", otpVerifyLimiter, validate(verifyOtpSchema), verifyEmailOtp);

// ══════════════════════════════════════════════════════
//  PROTECTED ROUTES  (require valid JWT)
// ══════════════════════════════════════════════════════

// GET  /api/auth/me
router.get("/me", protect, getAuthUser);

// POST /api/auth/create
router.post("/create", protect, authorize("admin"), validate(adminCreateUserSchema), createUserByAdmin);

// PATCH /api/auth/me
router.patch("/me", protect, updateAuthUser);

// POST /api/auth/change-password
router.post("/change-password", protect, changePassword);

// GET /api/auth/sessions
router.get("/sessions", protect, getMySessions);

// POST /api/auth/sessions/logout-others
router.post("/sessions/logout-others", protect, logoutOtherSessions);

// DELETE /api/auth/sessions/:sessionId
router.delete("/sessions/:sessionId", protect, logoutSingleSession);

// POST /api/auth/deactivate-account
router.post("/deactivate-account", protect, deactivateAccount);

// DELETE /api/auth/delete-account
router.delete("/delete-account", protect, deleteAccount);

// POST /api/auth/logout
router.post("/logout", protect, logout);

export default router;
