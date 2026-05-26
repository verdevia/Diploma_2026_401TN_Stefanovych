class CategoryRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  findAll() {
    return this.prisma.category.findMany();
  }

  findById(id) {
    return this.prisma.category.findUnique({
      where: { category_id: id },
    });
  }

  create(data) {
    return this.prisma.category.create({ data });
  }

  update(id, data) {
    return this.prisma.category.update({
      where: { category_id: id },
      data,
    });
  }

  delete(id) {
    return this.prisma.category.delete({
      where: { category_id: id },
    });
  }
}

module.exports = CategoryRepository;