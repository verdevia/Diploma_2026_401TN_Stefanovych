class ReviewService {
  constructor(reviewRepository, adRepository) {
    this.reviewRepository = reviewRepository;
    this.adRepository = adRepository;
  }

  async getAllReviews(filters = {}) {
    const where = {};

    if (filters.ad_id !== undefined && filters.ad_id !== "") {
      const adId = Number(filters.ad_id);

      if (!Number.isInteger(adId) || adId <= 0) {
        throw new Error("Ad filter must be valid");
      }

      where.ad_id = adId;
    }

    return await this.reviewRepository.findAll(where);
  }

  async getReview(id) {
    const review = await this.reviewRepository.findById(id);
    if (!review) {
      throw new Error("Review not found");
    }

    return review;
  }

  validateReviewPayload(data) {
    const rating = Number(data.rating);
    const comment = String(data.comment || "").trim();

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new Error("Rating must be an integer from 1 to 5");
    }

    if (!comment) {
      throw new Error("Review text is required");
    }

    if (comment.length > 1000) {
      throw new Error("Review text must be 1000 characters or less");
    }

    return { rating, comment };
  }

  async createReview(data, currentUser) {
    const adId = Number(data.ad_id);
    if (!adId) {
      throw new Error("Ad is required");
    }

    const ad = await this.adRepository.findById(adId);
    if (!ad) {
      throw new Error("Ad not found");
    }

    if (ad.user_id === currentUser.userId) {
      const error = new Error("You cannot review your own ad");
      error.status = 403;
      throw error;
    }

    if (ad.status !== "active") {
      throw new Error("Only active ads can be reviewed");
    }

    const existing = await this.reviewRepository.findByReviewerAndAd(currentUser.userId, adId);
    if (existing) {
      throw new Error("You have already reviewed this ad");
    }

    const payload = this.validateReviewPayload(data);

    return await this.reviewRepository.create({
      ...payload,
      ad_id: adId,
      reviewer_id: currentUser.userId,
      reviewed_user_id: ad.user_id,
    });
  }

  async updateReview(id, data, currentUser) {
    const review = await this.reviewRepository.findById(id);
    if (!review) {
      throw new Error("Review not found");
    }

    const isOwner = review.reviewer_id === currentUser.userId;
    const isModeratorOrAdmin = currentUser.role === "moderator" || currentUser.role === "admin";

    if (!isOwner && !isModeratorOrAdmin) {
      const error = new Error("Forbidden");
      error.status = 403;
      throw error;
    }

    const payload = this.validateReviewPayload({
      rating: data.rating ?? review.rating,
      comment: data.comment ?? review.comment,
    });

    return await this.reviewRepository.update(id, payload);
  }

  async deleteReview(id, currentUser) {
    const review = await this.reviewRepository.findById(id);
    if (!review) {
      throw new Error("Review not found");
    }

    const isOwner = review.reviewer_id === currentUser.userId;
    const isModeratorOrAdmin = currentUser.role === "moderator" || currentUser.role === "admin";

    if (!isOwner && !isModeratorOrAdmin) {
      const error = new Error("Forbidden");
      error.status = 403;
      throw error;
    }

    return await this.reviewRepository.delete(id);
  }
}

module.exports = ReviewService;
