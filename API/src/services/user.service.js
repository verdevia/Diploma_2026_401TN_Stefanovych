const bcrypt = require("bcrypt");

class UserService {
  constructor(userRepository, emailVerificationService) {
    this.userRepository = userRepository;
    this.emailVerificationService = emailVerificationService;
  }

  async getAllUsers() {
    return await this.userRepository.findAll();
  }

  async getUser(id) {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new Error("User not found");
    }
    return user;
  }

  async createUser(data) {
    if (!data.username || !data.email || !data.password_hash) {
      throw new Error("Missing required fields");
    }

    if (String(data.username).trim().length > 15) {
      throw new Error("Username must be 15 characters or less");
    }

    return await this.userRepository.create(data);
  }

  async updateUser(id, data) {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new Error("User not found");
    }

    return await this.userRepository.update(id, data);
  }

  async updateCurrentUser(currentUser, data) {
    const user = await this.userRepository.findById(currentUser.userId);
    if (!user) {
      throw new Error("User not found");
    }

    const username = data.username?.trim();
    const email = data.email?.trim();
    const updates = {};

    if (!username || !email) {
      throw new Error("Username and email are required");
    }

    if (username.length > 15) {
      throw new Error("Username must be 15 characters or less");
    }

    const existingUsername = await this.userRepository.findByUsername(username);
    if (existingUsername && existingUsername.user_id !== user.user_id) {
      throw new Error("Username already taken");
    }

    const existingEmail = await this.userRepository.findByEmail(email);
    if (existingEmail && existingEmail.user_id !== user.user_id) {
      throw new Error("Email already registered");
    }

    updates.username = username;

    if (email !== this.emailVerificationService.normalizeEmail(user.email)) {
      if (!data.emailVerificationId || !data.emailVerificationCode) {
        throw new Error("Email verification is required");
      }

      const verified = await this.emailVerificationService.confirm(
        data.emailVerificationId,
        data.emailVerificationCode,
        "email-change"
      );

      if (verified.userId !== user.user_id || verified.email !== email) {
        throw new Error("Invalid verification code");
      }

      updates.email = email;
    }

    return await this.userRepository.update(user.user_id, updates);
  }

  async requestCurrentUserEmailChange(currentUser, data) {
    const user = await this.userRepository.findById(currentUser.userId);
    if (!user) {
      throw new Error("User not found");
    }

    const email = this.emailVerificationService.normalizeEmail(data.email);
    if (email === user.email) {
      throw new Error("Email is unchanged");
    }

    const existingEmail = await this.userRepository.findByEmail(email);
    if (existingEmail && existingEmail.user_id !== user.user_id) {
      throw new Error("Email already registered");
    }

    return await this.emailVerificationService.start(email, "email-change", {
      userId: user.user_id,
    });
  }

  async changeCurrentUserPassword(currentUser, data) {
    const user = await this.userRepository.findById(currentUser.userId);
    if (!user) {
      throw new Error("User not found");
    }

    if (!data.currentPassword || !data.newPassword) {
      throw new Error("Current and new password are required");
    }

    if (data.newPassword.length < 6) {
      throw new Error("New password must be at least 6 characters");
    }

    const valid = await bcrypt.compare(data.currentPassword, user.password_hash);
    if (!valid) {
      const error = new Error("Current password is incorrect");
      error.status = 401;
      throw error;
    }

    const password_hash = await bcrypt.hash(data.newPassword, 10);
    await this.userRepository.update(user.user_id, { password_hash });

    return true;
  }

  async updateUserRole(id, role, currentUser) {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new Error("User not found");
    }

    const isModeratorOrAdmin = currentUser.role === "moderator" || currentUser.role === "admin";
    if (!isModeratorOrAdmin) {
      const error = new Error("Forbidden");
      error.status = 403;
      throw error;
    }

    if (!["user", "moderator"].includes(role)) {
      throw new Error("Invalid role");
    }

    if (user.user_id === currentUser.userId) {
      const error = new Error("You cannot change your own role");
      error.status = 403;
      throw error;
    }

    return await this.userRepository.update(id, { role });
  }

  async deleteUser(id, currentUser) {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new Error("User not found");
    }

    const isOwner = user.user_id === currentUser.userId;
    const isModeratorOrAdmin = currentUser.role === "moderator" || currentUser.role === "admin";

    if (!isOwner && !isModeratorOrAdmin) {
      const error = new Error("Forbidden");
      error.status = 403;
      throw error;
    }

    return await this.userRepository.delete(id);
  }
}

module.exports = UserService;
