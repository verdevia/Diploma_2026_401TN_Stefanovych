class UserRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  findAll() {
    return this.prisma.user.findMany();
  }

  findById(id) {
    return this.prisma.user.findUnique({
      where: { user_id: id }
    });
  }

  create(data) {
    return this.prisma.user.create({ data });
  }

  update(id, data) {
    return this.prisma.user.update({
      where: { user_id: id },
      data
    });
  }

  delete(id) {
    return this.prisma.$transaction(async (tx) => {
      const userAds = await tx.ad.findMany({
        where: { user_id: id },
        select: { ad_id: true },
      });
      const adIds = userAds.map((ad) => ad.ad_id);
      const adFilter = adIds.length ? [{ ad_id: { in: adIds } }] : [];

      await tx.message.deleteMany({
        where: {
          OR: [
            { sender_id: id },
            { receiver_id: id },
            ...adFilter,
          ],
        },
      });

      await tx.favorite.deleteMany({
        where: {
          OR: [
            { user_id: id },
            ...adFilter,
          ],
        },
      });

      await tx.review.deleteMany({
        where: {
          OR: [
            { reviewer_id: id },
            { reviewed_user_id: id },
          ],
        },
      });

      await tx.ad.deleteMany({
        where: { user_id: id },
      });

      return tx.user.delete({
        where: { user_id: id },
      });
    });
  }

  findByEmail(email) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  findByUsername(username) {
    return this.prisma.user.findUnique({
      where: { username },
    });
  }
}

module.exports = UserRepository;
