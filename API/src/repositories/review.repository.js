class ReviewRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  findAll(filters = {}) {
    return this.prisma.review.findMany({
      where: filters,
      orderBy: { created_at: "desc" },
    });
  }

  findById(id) {
    return this.prisma.review.findUnique({
      where: { review_id: id },
    });
  }

  create(data) {
    return this.prisma.review.create({ data });
  }

  findByReviewerAndAd(reviewerId, adId) {
    return this.prisma.review.findFirst({
      where: {
        reviewer_id: reviewerId,
        ad_id: adId,
      },
    });
  }

  update(id, data) {
    return this.prisma.review.update({
      where: { review_id: id },
      data,
    });
  }

  delete(id) {
    return this.prisma.review.delete({
      where: { review_id: id },
    });
  }
}

module.exports = ReviewRepository;
