class AdRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  findAll(filters = {}) {
    return this.prisma.ad.findMany({
      where: filters,
      orderBy: { created_at: "desc" },
    });
  }

  findById(id) {
    return this.prisma.ad.findUnique({
      where: { ad_id: id },
    });
  }

  create(data) {
    return this.prisma.ad.create({ data });
  }

  update(id, data) {
    return this.prisma.ad.update({
      where: { ad_id: id },
      data,
    });
  }

  delete(id) {
    return this.prisma.$transaction(async (tx) => {
      await tx.message.deleteMany({
        where: { ad_id: id },
      });

      await tx.favorite.deleteMany({
        where: { ad_id: id },
      });

      await tx.review.deleteMany({
        where: { ad_id: id },
      });

      return tx.ad.delete({
        where: { ad_id: id },
      });
    });
  }
}

module.exports = AdRepository;
