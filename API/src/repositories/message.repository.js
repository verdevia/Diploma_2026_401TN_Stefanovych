class MessageRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  findByUser(userId) {
    return this.prisma.message.findMany({
      where: {
        OR: [
          { sender_id: userId },
          { receiver_id: userId },
        ],
      },
      orderBy: { sent_at: "asc" },
    });
  }

  findById(id) {
    return this.prisma.message.findUnique({
      where: { message_id: id },
    });
  }

  create(data) {
    return this.prisma.message.create({ data });
  }

  update(id, data) {
    return this.prisma.message.update({
      where: { message_id: id },
      data,
    });
  }

  delete(id) {
    return this.prisma.message.delete({
      where: { message_id: id },
    });
  }
}

module.exports = MessageRepository;
