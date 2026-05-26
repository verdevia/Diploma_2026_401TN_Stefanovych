const MAX_DESCRIPTION_LENGTH = 191;

class AdService {
  constructor(adRepository) {
    this.adRepository = adRepository;
  }

  async getAllAds(filters = {}) {
    const where = {};

    if (filters.status !== undefined && filters.status !== "") {
      this.validateStatus(filters.status);
      where.status = filters.status;
    }

    return await this.adRepository.findAll(where);
  }

  async getAd(id) {
    return await this.adRepository.findById(id);
  }

  validatePrice(data) {
    if (data.price === undefined) {
      return;
    }

    const price = Number(data.price);
    if (!Number.isFinite(price) || price <= 0) {
      throw new Error("Price must be greater than 0");
    }

    data.price = price;
  }

  validateImage(data) {
    if (data.image_url === undefined) {
      return;
    }

    if (!data.image_url) {
      data.image_url = null;
      return;
    }

    if (typeof data.image_url !== "string") {
      throw new Error("Image must be a data URL");
    }

    if (data.image_url.length > 2200000) {
      throw new Error("Image is too large");
    }

    if (!/^data:image\/(png|jpe?g|webp);base64,/i.test(data.image_url)) {
      throw new Error("Image must be PNG, JPG, or WebP");
    }
  }

  validateDescription(data) {
    if (data.description === undefined || data.description === null) {
      return;
    }

    if (typeof data.description !== "string") {
      throw new Error("Description must be text");
    }

    data.description = data.description.trim();

    if (data.description.length > MAX_DESCRIPTION_LENGTH) {
      throw new Error(`Description must be ${MAX_DESCRIPTION_LENGTH} characters or less`);
    }
  }

  validateAdPayload(data) {
    this.validatePrice(data);
    this.validateImage(data);
    this.validateDescription(data);
  }

  validateStatus(status) {
    if (!["pending", "active", "sold", "removed"].includes(status)) {
      throw new Error("Invalid status");
    }
  }

  async createAd(data) {
    this.validateAdPayload(data);
    data.status = "pending";
    return await this.adRepository.create(data);
  }

  async updateAd(id, data, currentUser) {
    this.validateAdPayload(data);

    const ad = await this.adRepository.findById(id);
    if (!ad) {
      throw new Error("Ad not found");
    }

    const isOwner = ad.user_id === currentUser.userId;
    const isModeratorOrAdmin = currentUser.role === "moderator" || currentUser.role === "admin";

    if (data.status !== undefined) {
      this.validateStatus(data.status);

      if (!isModeratorOrAdmin) {
        const error = new Error("Forbidden");
        error.status = 403;
        throw error;
      }
    } else {
      if (!isOwner && !isModeratorOrAdmin) {
        const error = new Error("Forbidden");
        error.status = 403;
        throw error;
      }
    }

    if (isOwner && !isModeratorOrAdmin) {
      data.status = "pending";
    }

    return await this.adRepository.update(id, data);
  }

  async deleteAd(id, currentUser) {
  const ad = await this.adRepository.findById(id);

  if (!ad) {
    throw new Error("Ad not found");
  }

  const isOwner = ad.user_id === currentUser.userId;
  const isModeratorOrAdmin =
    currentUser.role === "moderator" || currentUser.role === "admin";

  if (!isOwner && !isModeratorOrAdmin) {
    const error = new Error("Forbidden");
    error.status = 403;
    throw error;
  }

  return await this.adRepository.delete(id);
}
}

module.exports = AdService;
