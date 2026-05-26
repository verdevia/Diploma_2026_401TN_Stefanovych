class FavoriteRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  findAll() {
    return this.prisma.favorite.findMany();
  }

  findByUserId(user_id) {
    return this.prisma.favorite.findMany({
      where: { user_id },
    });
  }

  findById(user_id, ad_id) {
    return this.prisma.favorite.findUnique({
      where: { user_id_ad_id: { user_id, ad_id } },
    });
  }

  create(data) {
    return this.prisma.favorite.create({ data });
  }

  delete(user_id, ad_id) {
    return this.prisma.favorite.delete({
      where: { user_id_ad_id: { user_id, ad_id } },
    });
  }
}

module.exports = FavoriteRepository;