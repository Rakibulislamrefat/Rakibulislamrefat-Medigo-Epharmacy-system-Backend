import bcrypt from "bcrypt";
import crypto from "crypto";
import UAParser from "ua-parser-js";
import geoip from "geoip-lite";
import {
  User,
  DeletedUser,
  Session,
  UserActivity,
} from "../index";
import {
  ApiError,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  sendEmail,
} from "../../shared/utils";

export class AuthService {
  // ══════════════════════════════════════════════════════
  //  PRIVATE HELPERS
  // ══════════════════════════════════════════════════════

  // ── Parse device + browser from user-agent ───────────
  private static parseDevice(userAgent: string) {
    const parser = new UAParser(userAgent);
    const r = parser.getResult();
    return {
      device: {
        type: r.device.type || "desktop",
        brand: r.device.vendor || "unknown",
        model: r.device.model || "unknown",
        os: r.os.name || "unknown",
        osVersion: r.os.version || "unknown",
      },
      browser: {
        name: r.browser.name || "unknown",
        version: r.browser.version || "unknown",
        engine: r.engine.name || "unknown",
        language: "unknown",
        cookiesEnabled: false,
        doNotTrack: false,
        userAgent,
      },
    };
  }

  // ── Get real location from IP via geoip-lite ─────────
  private static getIpLocation(ip: string) {
    const geo = geoip.lookup(ip.replace("::ffff:", ""));
    return {
      country: geo?.country || "",
      city: geo?.city || "",
      state: geo?.region || "",
      coordinates: {
        lat: geo?.ll?.[0] ?? null,
        lng: geo?.ll?.[1] ?? null,
      },
    };
  }

  // ── Clean IP helper ───────────────────────────────────
  private static cleanIp(ip: string): string {
    return ip.replace("::ffff:", "");
  }

  // ── Keep stored active session count in sync ─────────
  private static async syncActiveSessionCount(userId: string) {
    const activeSessions = await Session.countDocuments({
      userId,
      isActive: true,
    });

    await User.findByIdAndUpdate(userId, {
      $set: { "security.activeSessions": activeSessions },
    });

    return activeSessions;
  }

  private static ensureSecurity(user: any) {
    if (!user.security) {
      user.security = {
        loginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: null,
        lastLoginIp: null,
        lastLoginDevice: null,
        twoFactorEnabled: false,
        twoFactorSecret: null,
        passwordChangedAt: null,
        activeSessions: 0,
      };
    }
    return user.security as any;
  }

  private static generateOtpCode(): string {
    return crypto.randomInt(100000, 1000000).toString();
  }

  private static hashOtp(code: string): string {
    return crypto.createHash("sha256").update(code).digest("hex");
  }

  private static async issueEmailVerificationOtp(
    user: any,
    ip: string,
    userAgent: string,
  ) {
    const code = this.generateOtpCode();
    const codeHash = this.hashOtp(code);

    user.emailVerificationCode = codeHash;
    user.emailVerificationExpires = new Date(Date.now() + 10 * 60 * 1000);
    user.emailVerificationAttempts = 0;
    user.emailVerificationBlockedUntil = null;
    await user.save();

    await sendEmail({
      to: user.email,
      subject: "Medigo — Verify your email",
      html: `
        <h2>Email Verification</h2>
        <p>Hi ${user.name},</p>
        <p>Your verification code is:</p>
        <div style="font-size:28px;font-weight:700;letter-spacing:4px;">${code}</div>
        <p>This code expires in <strong>10 minutes</strong>.</p>
        <p>If you did not request this, please ignore this email.</p>
        <p>— Medigo Team</p>
      `,
    });

    await UserActivity.create({
      userId: user._id,
      event: "profile_update",
      meta: { action: "send_email_otp" },
      ip,
      userAgent,
      timestamp: new Date(),
    }).catch(() => {});

    return { email: user.email, expiresAt: user.emailVerificationExpires };
  }

  // ── Session helpers for frontend settings page ───────
  private static formatSessionDevice(session: any) {
    const browserName = session.browser?.name || "Unknown browser";
    const deviceModel = session.device?.model;
    const deviceBrand = session.device?.brand;
    const deviceType = session.device?.type;
    const osName = session.device?.os;

    const hardwareLabel =
      (deviceModel && deviceModel !== "unknown" && deviceModel) ||
      (deviceBrand && deviceBrand !== "unknown" && deviceBrand) ||
      (deviceType &&
        deviceType !== "unknown" &&
        deviceType.charAt(0).toUpperCase() + deviceType.slice(1)) ||
      (osName && osName !== "unknown" && osName) ||
      "Unknown device";

    return `${hardwareLabel} · ${browserName}`;
  }

  private static formatSessionLocation(session: any) {
    const city =
      session.location?.city ||
      session.location?.district ||
      session.location?.division ||
      "Unknown";

    const country =
      session.location?.countryCode || session.location?.country || "";

    return country ? `${city}, ${country}` : city;
  }

  private static formatLastActive(lastActiveAt: Date) {
    const diffMs = Date.now() - new Date(lastActiveAt).getTime();

    if (diffMs < 60 * 1000) return "Now";

    const minutes = Math.floor(diffMs / (60 * 1000));
    if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;

    const hours = Math.floor(diffMs / (60 * 60 * 1000));
    if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;

    const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;

    return new Date(lastActiveAt).toISOString();
  }

  private static mapSessionForResponse(session: any, currentSessionId: string) {
    return {
      id: String(session._id),
      device: this.formatSessionDevice(session),
      location: this.formatSessionLocation(session),
      lastActive: this.formatLastActive(session.lastActiveAt),
      lastActiveAt: session.lastActiveAt,
      current: String(session._id) === currentSessionId,
      loginMethod: session.loginMethod,
      browser: {
        name: session.browser?.name || "unknown",
        version: session.browser?.version || "unknown",
        engine: session.browser?.engine || "unknown",
      },
      deviceDetails: {
        type: session.device?.type || "unknown",
        brand: session.device?.brand || "unknown",
        model: session.device?.model || "unknown",
        os: session.device?.os || "unknown",
        osVersion: session.device?.osVersion || "unknown",
      },
      network: {
        ip: session.network?.ip || "",
        type: session.network?.type || "unknown",
        effectiveType: session.network?.effectiveType || "unknown",
      },
      createdAt: session.createdAt,
    };
  }

  // ══════════════════════════════════════════════════════
  //  VPN DETECTION
  //  Frontend sends location → compare with IP location
  //  If country OR city+state both mismatch → VPN detected
  // ══════════════════════════════════════════════════════
  static detectVpn(
    frontendLocation: Record<string, any>,
    ip: string,
  ): { isVpn: boolean; reason?: string } {
    const ipLoc = this.getIpLocation(ip);

    // skip for localhost / private IPs (dev environment)
    if (!ipLoc.country) return { isVpn: false };

    const fCountry = (frontendLocation.country_code || "").toUpperCase().trim();
    const iCountry = (ipLoc.country || "").toUpperCase().trim();
    const fCity = (frontendLocation.city || "").toLowerCase().trim();
    const fState = (frontendLocation.state || "").toLowerCase().trim();
    const iCity = (ipLoc.city || "").toLowerCase().trim();
    const iState = (ipLoc.state || "").toLowerCase().trim();

    // Rule 1 — country must match
    if (fCountry && iCountry && fCountry !== iCountry) {
      return {
        isVpn: true,
        reason: `Country mismatch — device says "${fCountry}" but IP is from "${iCountry}". VPN or proxy is not allowed.`,
      };
    }

    // Rule 2 — city AND state both mismatch → VPN
    const cityMatch = fCity && iCity && fCity === iCity;
    const stateMatch = fState && iState && fState === iState;

    if (fCity && fState && !cityMatch && !stateMatch) {
      return {
        isVpn: true,
        reason: `Location mismatch — device (${fCity}, ${fState}) vs IP location (${iCity}, ${iState}). Please disable your VPN or proxy.`,
      };
    }

    return { isVpn: false };
  }

  // ══════════════════════════════════════════════════════
  //  REGISTER
  // ══════════════════════════════════════════════════════
  static async register(body: any, ip: string, userAgent: string) {
    const {
      name,
      email,
      phone,
      avatar,
      password,
      role: requestedRole,
      addresses,
    } = body;

    const role = (requestedRole || "user") as string;
    const allowedRoles = ["user", "pharmacist", "doctor", "hospital"];
    if (!allowedRoles.includes(role)) {
      throw new ApiError(400, "Invalid role");
    }

    // ── Duplicate check ────────────────────────────────
    const [emailExists, phoneExists] = await Promise.all([
      User.findOne({ email: email.toLowerCase() }),
      User.findOne({ phone }),
    ]);
    if (emailExists) throw new ApiError(409, "Email is already registered");
    if (phoneExists) throw new ApiError(409, "Phone is already registered");

    // ── Hash password ──────────────────────────────────
    const passwordHash = await bcrypt.hash(password, 12);

    // ── Create user ────────────────────────────────────
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      phone,
      passwordHash,
      avatar: avatar || null,
      role,
      status: "pending",
      isVerified: false,
      isEmailVerified: false,
      isPhoneVerified: false,
      addresses: Array.isArray(addresses) ? addresses : [],
      lastLoginAt: null,
    });

    await this.issueEmailVerificationOtp(user, this.cleanIp(ip), userAgent);

    // ── Log activity ───────────────────────────────────
    await UserActivity.create({
      userId: user._id,
      event: "register",
      meta: { role: user.role },
      ip: this.cleanIp(ip),
      userAgent,
      timestamp: new Date(),
    }).catch(() => {});

    return {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: (user as any).status,
      emailVerificationSent: true,
    };
  }

  // ══════════════════════════════════════════════════════
  //  SEND EMAIL OTP
  // ══════════════════════════════════════════════════════
  static async sendEmailVerificationOtp(
    email: string,
    ip: string,
    userAgent: string,
  ) {
    const user = await User.findOne({ email: email.toLowerCase() }).select(
      "+emailVerificationCode +emailVerificationExpires +emailVerificationAttempts +emailVerificationBlockedUntil",
    );

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    if (user.isVerified) {
      throw new ApiError(400, "Email is already verified");
    }

    if (
      user.emailVerificationBlockedUntil &&
      user.emailVerificationBlockedUntil > new Date()
    ) {
      const mins = Math.ceil(
        (user.emailVerificationBlockedUntil.getTime() - Date.now()) / 60000,
      );
      throw new ApiError(429, `Too many attempts. Try again in ${mins} minute(s).`);
    }

    return this.issueEmailVerificationOtp(user, this.cleanIp(ip), userAgent);
  }

  // ══════════════════════════════════════════════════════
  //  VERIFY EMAIL OTP
  // ══════════════════════════════════════════════════════
  static async verifyEmailOtp(
    email: string,
    otp: string,
    ip: string,
    userAgent: string,
  ) {
    const user = await User.findOne({ email: email.toLowerCase() }).select(
      "+emailVerificationCode +emailVerificationExpires +emailVerificationAttempts +emailVerificationBlockedUntil",
    );

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    if (user.isVerified) {
      return { id: user._id, email: user.email, isVerified: true };
    }

    if (!user.emailVerificationCode || !user.emailVerificationExpires) {
      throw new ApiError(400, "No OTP found. Please request a new one.");
    }

    if (
      user.emailVerificationBlockedUntil &&
      user.emailVerificationBlockedUntil > new Date()
    ) {
      const mins = Math.ceil(
        (user.emailVerificationBlockedUntil.getTime() - Date.now()) / 60000,
      );
      throw new ApiError(429, `Too many attempts. Try again in ${mins} minute(s).`);
    }

    if (user.emailVerificationExpires < new Date()) {
      user.emailVerificationCode = null;
      user.emailVerificationExpires = null;
      user.emailVerificationAttempts = 0;
      await user.save();
      throw new ApiError(400, "OTP expired. Please request a new one.");
    }

    const otpHash = this.hashOtp(otp);
    if (otpHash !== user.emailVerificationCode) {
      user.emailVerificationAttempts += 1;

      if (user.emailVerificationAttempts >= 5) {
        user.emailVerificationBlockedUntil = new Date(Date.now() + 15 * 60 * 1000);
      }

      await user.save();
      throw new ApiError(400, "Invalid OTP");
    }

    user.isVerified = true;
    (user as any).isEmailVerified = true;
    if (user.role === "user" && (user as any).status === "pending") {
      (user as any).status = "active";
    }
    user.emailVerificationCode = null;
    user.emailVerificationExpires = null;
    user.emailVerificationAttempts = 0;
    user.emailVerificationBlockedUntil = null;
    await user.save();

    await UserActivity.create({
      userId: user._id,
      event: "profile_update",
      meta: { action: "verify_email" },
      ip: this.cleanIp(ip),
      userAgent,
      timestamp: new Date(),
    }).catch(() => {});

    return { id: user._id, email: user.email, isVerified: true };
  }

  // ══════════════════════════════════════════════════════
  //  LOGIN
  //  Supports email OR phone as identifier
  // ══════════════════════════════════════════════════════
  static async login(body: any, ip: string, userAgent: string) {
    const { identifier, password } = body;
    const cleanedIp = this.cleanIp(ip);

    // ── Detect identifier type — email or phone ────────
    const isEmail = identifier.includes("@");
    const query = isEmail
      ? { email: identifier.toLowerCase() }
      : { phone: identifier };

    // ── Find user ──────────────────────────────────────
    const user = await User.findOne(query).select("+passwordHash");

    if (!user) {
      throw new ApiError(401, "Your Password is wrong");
    }

    if (!user.isActive) {
      throw new ApiError(403, "Account deactivated. Contact support.");
    }

    if (!(user as any).isEmailVerified) {
      throw new ApiError(403, "Email not verified. Please verify OTP.");
    }

    const status = (user as any).status;
    if (status === "blocked") {
      throw new ApiError(403, "Account blocked. Contact support.");
    }
    if (status === "pending") {
      throw new ApiError(403, "Account pending approval.");
    }

    const security = this.ensureSecurity(user);

    // ── Account lock check ─────────────────────────────
    if (security.lockedUntil && security.lockedUntil > new Date()) {
      const mins = Math.ceil(
        (security.lockedUntil.getTime() - Date.now()) / 60000,
      );
      throw new ApiError(
        423,
        `Account locked. Try again in ${mins} minute(s).`,
      );
    }

    // ── Password check ─────────────────────────────────
    const isMatch = await bcrypt.compare(password, user.passwordHash);

    if (!isMatch) {
      security.loginAttempts += 1;

      if (security.loginAttempts >= 5) {
        security.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
        security.loginAttempts = 0;
      }

      await user.save();

      await UserActivity.create({
        userId: user._id,
        event: "login_failed",
        meta: { attempts: security.loginAttempts },
        ip: cleanedIp,
        userAgent,
        timestamp: new Date(),
      }).catch(() => {});

      throw new ApiError(401, "Your Password is wrong");
    }

    // ── Reset security fields on success ───────────────
    security.loginAttempts = 0;
    security.lockedUntil = null;
    security.lastLoginAt = new Date();
    security.lastLoginIp = cleanedIp;
    security.lastLoginDevice = (userAgent || "").substring(0, 100);
    security.activeSessions += 1;

    (user as any).lastLoginAt = new Date();

    await user.save();

    // ── Generate tokens ────────────────────────────────
    const accessToken = generateAccessToken(String(user._id), user.role);
    const refreshToken = generateRefreshToken(String(user._id));

    // ── Parse device + browser ─────────────────────────
    const { device, browser } = this.parseDevice(userAgent);

    // ── Get IP location for session ────────────────────
    const ipLoc = this.getIpLocation(cleanedIp);

    // ── Create session ─────────────────────────────────
    const session = await Session.create({
      userId: user._id,
      device,
      browser,
      network: {
        ip: cleanedIp,
        ipv6: null,
        type: "unknown",
        effectiveType: "unknown",
        downlink: null,
        isp: null,
        proxy: false,
        vpn: false,
        tor: false,
      },
      location: {
        country: ipLoc.country,
        countryCode: ipLoc.country,
        division: ipLoc.state,
        district: ipLoc.state,
        city: ipLoc.city,
        timezone: "",
        coordinates: ipLoc.coordinates,
        accuracy: "city-level",
      },
      token: accessToken,
      refreshToken,
      tokenExpiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 min
      refreshTokenExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      loginMethod: isEmail ? "email" : "phone",
      isActive: true,
      lastActiveAt: new Date(),
    });

    // ── Log activity ───────────────────────────────────
    await UserActivity.create({
      userId: user._id,
      sessionId: session._id,
      event: "login",
      meta: { method: isEmail ? "email" : "phone", device: device.type },
      ip: cleanedIp,
      userAgent,
      timestamp: new Date(),
    }).catch(() => {});

    await this.syncActiveSessionCount(String(user._id));

    return {
      refreshToken,
      data: {
        accessToken,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          avatar: user.avatar,
          isVerified: user.isVerified,
          status: (user as any).status,
          addresses: (user as any).addresses ?? [],
        },
      },
    };
  }

  // ══════════════════════════════════════════════════════
  //  LOGOUT
  // ══════════════════════════════════════════════════════
  static async logout(
    userId: string,
    sessionId: string,
    ip: string,
    userAgent: string,
  ) {
    // ── Deactivate session ─────────────────────────────
    await Session.findByIdAndUpdate(sessionId, {
      $set: { isActive: false, loggedOutAt: new Date() },
    });

    // ── Decrement active session count ─────────────────
    await User.findByIdAndUpdate(userId, {
      $inc: { "security.activeSessions": -1 },
    });

    // ── Log activity ───────────────────────────────────
    await UserActivity.create({
      userId,
      sessionId,
      event: "logout",
      meta: {},
      ip: this.cleanIp(ip),
      userAgent,
      timestamp: new Date(),
    }).catch(() => {});

    await this.syncActiveSessionCount(userId);
  }

  // ══════════════════════════════════════════════════════
  //  GET MY ACTIVE SESSIONS
  // ══════════════════════════════════════════════════════
  static async getMySessions(userId: string, currentSessionId: string) {
    const sessions = await Session.find({
      userId,
      isActive: true,
    })
      .sort({ lastActiveAt: -1, createdAt: -1 })
      .select(
        "_id device browser network location loginMethod lastActiveAt createdAt",
      );

    return {
      totalSessions: sessions.length,
      currentSessionId,
      sessions: sessions.map((session) =>
        this.mapSessionForResponse(session, currentSessionId),
      ),
    };
  }

  // ══════════════════════════════════════════════════════
  //  LOGOUT ONE OTHER SESSION
  // ══════════════════════════════════════════════════════
  static async logoutSession(
    userId: string,
    targetSessionId: string,
    currentSessionId: string,
    ip: string,
    userAgent: string,
  ) {
    if (targetSessionId === currentSessionId) {
      throw new ApiError(
        400,
        "Use the normal logout endpoint to log out your current session.",
      );
    }

    const session = await Session.findOne({
      _id: targetSessionId,
      userId,
      isActive: true,
    }).select("_id");

    if (!session) {
      throw new ApiError(404, "Session not found");
    }

    await Session.findByIdAndUpdate(targetSessionId, {
      $set: { isActive: false, loggedOutAt: new Date() },
    });

    const activeSessions = await this.syncActiveSessionCount(userId);

    await UserActivity.create({
      userId,
      sessionId: session._id,
      event: "logout",
      meta: { scope: "single-other-session" },
      ip: this.cleanIp(ip),
      userAgent,
      timestamp: new Date(),
    }).catch(() => {});

    return {
      loggedOutSessionId: targetSessionId,
      activeSessions,
    };
  }

  // ══════════════════════════════════════════════════════
  //  LOGOUT ALL OTHER SESSIONS
  // ══════════════════════════════════════════════════════
  static async logoutOtherSessions(
    userId: string,
    currentSessionId: string,
    ip: string,
    userAgent: string,
  ) {
    const result = await Session.updateMany(
      {
        userId,
        isActive: true,
        _id: { $ne: currentSessionId },
      },
      {
        $set: { isActive: false, loggedOutAt: new Date() },
      },
    );

    const activeSessions = await this.syncActiveSessionCount(userId);

    await UserActivity.create({
      userId,
      sessionId: currentSessionId,
      event: "logout",
      meta: {
        scope: "all-other-sessions",
        loggedOutCount: result.modifiedCount || 0,
      },
      ip: this.cleanIp(ip),
      userAgent,
      timestamp: new Date(),
    }).catch(() => {});

    return {
      loggedOutCount: result.modifiedCount || 0,
      activeSessions,
    };
  }

  // ══════════════════════════════════════════════════════
  //  REFRESH ACCESS TOKEN
  //  Validates refresh token + session + issues new access token
  // ══════════════════════════════════════════════════════
  static async refreshAccessToken(token: string) {
    // ── Verify JWT signature ───────────────────────────
    let decoded: any;
    console.log("[token]: ", token);
    try {
      decoded = verifyRefreshToken(token);
    } catch (err: any) {
      if (err.name === "TokenExpiredError") {
        throw new ApiError(
          401,
          "Refresh token has expired. Please log in again.",
        );
      }
      throw new ApiError(401, "Invalid refresh token");
    }

    // ── Find active session + select hidden fields ─────
    // Since a user can have multiple active sessions (e.g. phone and laptop),
    // we need to find the specific session that matches this refresh token.
    const session = await Session.findOne({
      userId: decoded.id,
      refreshToken: token,
    }).select("+token +refreshToken +isActive +refreshTokenExpiresAt");

    if (!session) {
      throw new ApiError(401, "Session not found or token revoked. Please log in again.");
    }

    if (!session.isActive) {
      throw new ApiError(401, "Session has been logged out. Please log in again.");
    }

    // ── Check refresh token expiry ─────────────────────
    if (session.refreshTokenExpiresAt < new Date()) {
      await Session.findByIdAndUpdate(session._id, {
        $set: { isActive: false, loggedOutAt: new Date() },
      });
      throw new ApiError(
        401,
        "Refresh token has expired. Please log in again.",
      );
    }

    // ── Check user still exists ───────────────────────
    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) {
      throw new ApiError(401, "User not found or deactivated");
    }

    // ── Issue new access token ─────────────────────────
    const newAccessToken = generateAccessToken(String(user._id), user.role);

    // ── Update session ─────────────────────────────────
    await Session.findByIdAndUpdate(session._id, {
      $set: {
        token: newAccessToken,
        tokenExpiresAt: new Date(Date.now() + 15 * 60 * 1000),
        lastActiveAt: new Date(),
      },
    });

    return { accessToken: newAccessToken, refreshToken: session.refreshToken };
  }

  // ══════════════════════════════════════════════════════
  //  FORGOT PASSWORD
  //  Generates reset token → stores hashed in DB → sends raw in email
  // ══════════════════════════════════════════════════════
  static async forgotPassword(email: string, clientUrl: string) {
    const user = await User.findOne({ email: email.toLowerCase() });

    // always return silently — never reveal if email exists
    if (!user) return;

    if (user.passwordResetLockedUntil && user.passwordResetLockedUntil > new Date()) {
      const mins = Math.ceil(
        (user.passwordResetLockedUntil.getTime() - Date.now()) / 60000,
      );
      throw new ApiError(429, `Too many reset attempts. Try again in ${mins} minute(s).`);
    }

    user.passwordResetAttempts = (user.passwordResetAttempts || 0) + 1;

    if (user.passwordResetAttempts >= 3) {
      user.passwordResetLockedUntil = new Date(Date.now() + 60 * 60 * 1000);
      user.passwordResetAttempts = 0;
      await user.save();
      throw new ApiError(429, "Too many reset attempts. Locked for 1 hour.");
    }

    await user.save();

    // ── Generate token ─────────────────────────────────
    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    // ── Save hashed token to DB ────────────────────────
    await User.findByIdAndUpdate(user._id, {
      $set: {
        passwordResetToken: hashedToken,
        passwordResetExpires: new Date(Date.now() + 30 * 60 * 1000),
      },
    });

    // ── Send raw token in email ────────────────────────
    const resetUrl = `${clientUrl}/reset-password?token=${resetToken}`;
    await sendEmail({
      to: user.email || email.toLowerCase(),
      subject: "Medigo — Password Reset",
      html: `
        <h2>Password Reset Request</h2>
        <p>Hi ${user.name},</p>
        <p>
          You have <strong>${3 - user.passwordResetAttempts} attempt(s)</strong>
          remaining before lockout.
        </p>
        <p>Click below to reset your password. Expires in <strong>30 minutes</strong>.</p>
        <a href="${resetUrl}"
           style="display:inline-block;padding:12px 28px;background:#e53e3e;
                  color:white;border-radius:6px;text-decoration:none;margin:16px 0">
          Reset Password
        </a>
        <p>If you didn't request this, ignore this email.</p>
        <p>— Medigo Team</p>
      `,
    });
  }

  // ══════════════════════════════════════════════════════
  //  RESET PASSWORD
  //  Hashes incoming token → finds matching user → resets
  // ══════════════════════════════════════════════════════
  static async resetPassword(
    token: string,
    newPassword: string,
    ip: string,
    userAgent: string,
  ) {
    // ── Hash incoming token to compare with DB ─────────
    const hashedToken = crypto
      .createHash("sha256")
      .update(token.trim())
      .digest("hex");

    // ── Find user with valid token ─────────────────────
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() },
    }).select("+passwordResetToken +passwordResetExpires");

    if (!user) {
      throw new ApiError(400, "Reset token is invalid or has expired");
    }

    // ── Hash new password ──────────────────────────────
    const passwordHash = await bcrypt.hash(newPassword, 12);

    // ── Update user ────────────────────────────────────
    await User.findByIdAndUpdate(user._id, {
      $set: {
        passwordHash,
        "security.passwordChangedAt": new Date(),
        "security.loginAttempts": 0,
        "security.lockedUntil": null,
        "security.activeSessions": 0,

        // clear reset fields
        passwordResetToken: null,
        passwordResetExpires: null,
        passwordResetAttempts: 0,
        passwordResetLockedUntil: null,
      },
    });

    // ── Invalidate all active sessions ─────────────────
    await Session.updateMany(
      { userId: user._id, isActive: true },
      { $set: { isActive: false, loggedOutAt: new Date() } },
    );

    // ── Log activity ───────────────────────────────────
    await UserActivity.create({
      userId: user._id,
      event: "password_reset",
      meta: {},
      ip: this.cleanIp(ip),
      userAgent,
      timestamp: new Date(),
    }).catch(() => {});
  }

  // ══════════════════════════════════════════════════════
  //  UPDATE AUTH USER
  // ══════════════════════════════════════════════════════
  static async updateAuthUser(userId: string, body: any) {
    const user = await User.findById(userId);
    if (!user) throw new ApiError(404, "User not found");

    const allowedUpdates = [
      "name",
      "phone",
      "avatar",
      "addresses",
    ];

    allowedUpdates.forEach((field) => {
      if (body[field] !== undefined) {
        (user as any)[field] = body[field];
      }
    });

    await user.save();

    const refreshedUser = await User.findById(user._id).select(
      "name email phone avatar role status isEmailVerified isPhoneVerified addresses lastLoginAt createdAt updatedAt",
    );

    if (!refreshedUser) throw new ApiError(404, "User not found");

    return {
      ...refreshedUser.toObject(),
    };
  }

  // ══════════════════════════════════════════════════════
  //  CHANGE PASSWORD
  // ══════════════════════════════════════════════════════
  static async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await User.findById(userId).select("+passwordHash");
    if (!user) throw new ApiError(404, "User not found");
    const security = this.ensureSecurity(user);

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) throw new ApiError(400, "Incorrect current password");

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    security.passwordChangedAt = new Date();
    await user.save();
  }

  // ══════════════════════════════════════════════════════
  //  DEACTIVATE ACCOUNT
  // ══════════════════════════════════════════════════════
  static async deactivateAccount(
    userId: string,
    sessionId: string,
    ip: string,
    userAgent: string,
  ) {
    const user = await User.findById(userId);
    if (!user) throw new ApiError(404, "User not found");
    const security = this.ensureSecurity(user);

    user.isActive = false;
    security.activeSessions = 0;
    await user.save();

    await Session.updateMany(
      { userId, isActive: true },
      { $set: { isActive: false, loggedOutAt: new Date() } },
    );

    await UserActivity.create({
      userId,
      sessionId,
      event: "profile_update",
      meta: { action: "deactivate_account" },
      ip: this.cleanIp(ip),
      userAgent,
      timestamp: new Date(),
    }).catch(() => {});
  }

  // ══════════════════════════════════════════════════════
  //  DELETE ACCOUNT PERMANENTLY
  // ══════════════════════════════════════════════════════
  static async deleteAccount(
    userId: string,
    sessionId: string,
    ip: string,
    userAgent: string,
    reason?: string,
  ) {
    const user = await User.findById(userId);
    if (!user) throw new ApiError(404, "User not found");
    const security = this.ensureSecurity(user);

    await DeletedUser.create({
      userId: user._id,
      deletedBy: user._id,
      reason: reason?.trim() || "user_requested",
      userSnapshot: user.toObject(),
      meta: {
        ip: this.cleanIp(ip),
        userAgent,
      },
      deletedAt: new Date(),
    });

    user.isActive = false;
    user.isDeleted = true;
    user.deletedAt = new Date();
    security.activeSessions = 0;
    await user.save();

    await Session.updateMany(
      { userId, isActive: true },
      { $set: { isActive: false, loggedOutAt: new Date() } },
    );

    await UserActivity.create({
      userId,
      sessionId,
      event: "account_delete",
      meta: { action: "soft_delete", reason: reason || "" },
      ip: this.cleanIp(ip),
      userAgent,
      timestamp: new Date(),
    }).catch(() => {});
  }
}
