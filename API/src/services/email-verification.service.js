const bcrypt = require("bcrypt");
const crypto = require("crypto");
const dns = require("dns").promises;

function readBoolean(value) {
  return value === "true" || value === "1";
}

function readFlag(value) {
  if (value && typeof value === "object" && "value" in value) {
    return value.value;
  }

  return value;
}

class EmailVerificationService {
  constructor() {
    this.pending = new Map();
    this.ttlMs = Number(process.env.EMAIL_VERIFICATION_TTL_MINUTES || 10) * 60 * 1000;
  }

  normalizeEmail(email) {
    return String(email || "").trim().toLowerCase();
  }

  assertEmailFormat(email) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("Invalid email");
    }
  }

  async validateWithAbstract(email) {
    if (typeof fetch !== "function") {
      throw new Error("Email validation provider is unavailable in this Node.js runtime");
    }

    const url = new URL("https://emailvalidation.abstractapi.com/v1/");
    url.searchParams.set("api_key", process.env.ABSTRACT_EMAIL_API_KEY);
    url.searchParams.set("email", email);

    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.error?.message || "Email validation failed");
    }

    const formatValid = readFlag(data?.is_valid_format);
    const smtpValid = readFlag(data?.is_smtp_valid);
    const disposable = readFlag(data?.is_disposable_email);
    const deliverability = String(data?.deliverability || "").toUpperCase();

    if (formatValid === false || smtpValid === false || disposable === true || deliverability === "UNDELIVERABLE") {
      throw new Error("Email address does not look deliverable");
    }
  }

  async validateWithZeroBounce(email) {
    if (typeof fetch !== "function") {
      throw new Error("Email validation provider is unavailable in this Node.js runtime");
    }

    const url = new URL("https://api.zerobounce.net/v2/validate");
    url.searchParams.set("api_key", process.env.ZEROBOUNCE_API_KEY);
    url.searchParams.set("email", email);

    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.error || "Email validation failed");
    }

    if (data.status !== "valid") {
      throw new Error("Email address does not look deliverable");
    }
  }

  async validateMx(email) {
    const domain = email.split("@")[1];
    let records = [];

    try {
      records = await dns.resolveMx(domain);
    } catch (error) {
      if (["ENOTFOUND", "ENODATA"].includes(error.code)) {
        throw new Error("Email domain cannot receive mail");
      }

      if (readBoolean(process.env.EMAIL_VERIFICATION_STRICT)) {
        throw error;
      }

      return;
    }

    if (!records.length) {
      throw new Error("Email domain cannot receive mail");
    }
  }

  async validateAddress(email) {
    this.assertEmailFormat(email);

    const provider = process.env.EMAIL_VALIDATION_PROVIDER;

    if (provider === "abstract" && process.env.ABSTRACT_EMAIL_API_KEY) {
      await this.validateWithAbstract(email);
      return;
    }

    if (provider === "zerobounce" && process.env.ZEROBOUNCE_API_KEY) {
      await this.validateWithZeroBounce(email);
      return;
    }

    await this.validateMx(email);
  }

  buildEmailSubject(purpose) {
    return purpose === "signup"
      ? "Код підтвердження реєстрації"
      : "Код підтвердження нової пошти";
  }

  buildTemplateParams(email, code, purpose) {
    return {
      to_email: email,
      email,
      code,
      verification_code: code,
      subject: this.buildEmailSubject(purpose),
      purpose,
      app_name: process.env.APP_NAME || "C2C Marketplace",
      expires_minutes: Math.round(this.ttlMs / 60000),
    };
  }

  async sendCodeWithEmailJs(email, code, purpose) {
    const hasConfig = process.env.EMAILJS_SERVICE_ID
      && process.env.EMAILJS_TEMPLATE_ID
      && process.env.EMAILJS_PUBLIC_KEY;

    if (!hasConfig || typeof fetch !== "function") {
      return false;
    }

    const body = {
      service_id: process.env.EMAILJS_SERVICE_ID,
      template_id: process.env.EMAILJS_TEMPLATE_ID,
      user_id: process.env.EMAILJS_PUBLIC_KEY,
      template_params: this.buildTemplateParams(email, code, purpose),
    };

    if (process.env.EMAILJS_PRIVATE_KEY) {
      body.accessToken = process.env.EMAILJS_PRIVATE_KEY;
    }

    const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const message = await response.text().catch(() => "");
      throw new Error(message || "Could not send verification email");
    }

    return true;
  }

  async sendCodeWithResend(email, code, purpose) {
    if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM || typeof fetch !== "function") {
      return false;
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to: email,
        subject: this.buildEmailSubject(purpose),
        text: `Ваш код підтвердження: ${code}. Він діє ${Math.round(this.ttlMs / 60000)} хв.`,
      }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(data?.message || "Could not send verification email");
    }

    return true;
  }

  async sendCode(email, code, purpose) {
    if (await this.sendCodeWithEmailJs(email, code, purpose)) {
      return;
    }

    if (await this.sendCodeWithResend(email, code, purpose)) {
      return;
    }

    console.log(`[email verification] ${email}: ${code}`);
  }

  async start(email, purpose, payload = {}) {
    const normalizedEmail = this.normalizeEmail(email);
    await this.validateAddress(normalizedEmail);

    const code = String(crypto.randomInt(100000, 1000000));
    const id = crypto.randomUUID();

    this.pending.set(id, {
      codeHash: await bcrypt.hash(code, 10),
      email: normalizedEmail,
      expiresAt: Date.now() + this.ttlMs,
      payload,
      purpose,
    });

    await this.sendCode(normalizedEmail, code, purpose);

    return {
      verificationId: id,
      expiresInMinutes: Math.round(this.ttlMs / 60000),
    };
  }

  async confirm(id, code, purpose) {
    const verification = this.pending.get(id);

    if (!verification || verification.purpose !== purpose) {
      throw new Error("Invalid verification code");
    }

    if (Date.now() > verification.expiresAt) {
      this.pending.delete(id);
      throw new Error("Verification code expired");
    }

    const valid = await bcrypt.compare(String(code || ""), verification.codeHash);
    if (!valid) {
      throw new Error("Invalid verification code");
    }

    this.pending.delete(id);

    return {
      email: verification.email,
      ...verification.payload,
    };
  }
}

module.exports = EmailVerificationService;
