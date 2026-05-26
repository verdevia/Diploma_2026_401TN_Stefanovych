const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

class AuthService {
  constructor(userRepository, emailVerificationService) {
    this.userRepository = userRepository;
    this.emailVerificationService = emailVerificationService;
  }

  createToken(user) {
    return jwt.sign(
      {
        userId: user.user_id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
  }

  toPublicUser(user) {
    return {
      id: user.user_id,
      username: user.username,
      email: user.email,
      role: user.role,
      created_at: user.created_at,
    };
  }

  async requestSignUp({ username, email, password }) {
    const normalizedUsername = String(username || "").trim();
    const normalizedEmail = this.emailVerificationService.normalizeEmail(email);

    if (!normalizedUsername || !normalizedEmail || !password) {
      throw new Error("Missing required fields");
    }

    if (normalizedUsername.length > 15) {
      throw new Error("Username must be 15 characters or less");
    }

    if (password.length < 6) {
      throw new Error("Password must be at least 6 characters");
    }

    const existingEmail = await this.userRepository.findByEmail(normalizedEmail);
    if (existingEmail) {
      throw new Error("Email already registered");
    }

    const existingUsername = await this.userRepository.findByUsername(normalizedUsername);
    if (existingUsername) {
      throw new Error("Username already taken");
    }

    const password_hash = await bcrypt.hash(password, 10);

    return await this.emailVerificationService.start(normalizedEmail, "signup", {
      username: normalizedUsername,
      email: normalizedEmail,
      password_hash,
    });
  }

  async confirmSignUp({ verificationId, code }) {
    const pending = await this.emailVerificationService.confirm(verificationId, code, "signup");

    if (pending.username.length > 15) {
      throw new Error("Username must be 15 characters or less");
    }

    const existingEmail = await this.userRepository.findByEmail(pending.email);
    if (existingEmail) {
      throw new Error("Email already registered");
    }

    const existingUsername = await this.userRepository.findByUsername(pending.username);
    if (existingUsername) {
      throw new Error("Username already taken");
    }

    const user = await this.userRepository.create({
      username: pending.username,
      email: pending.email,
      password_hash: pending.password_hash,
    });

    return {
      token: this.createToken(user),
      user: this.toPublicUser(user),
    };
  }

  async signUp(data) {
    return await this.requestSignUp(data);
  }

  async signIn({ email, password }) {
    const user = await this.userRepository.findByEmail(email);
    if (!user) throw new Error("Invalid credentials");

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) throw new Error("Invalid credentials");

    return {
      token: this.createToken(user),
      user: this.toPublicUser(user),
    };
  }
}

module.exports = AuthService;
