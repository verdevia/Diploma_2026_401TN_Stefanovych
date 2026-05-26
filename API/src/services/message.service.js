class MessageService {
  constructor(messageRepository) {
    this.messageRepository = messageRepository;
  }

  async getUserMessages(userId) {
    return await this.messageRepository.findByUser(userId);
  }

  async getMessage(id, userId) {
    const message = await this.messageRepository.findById(id);
    if (!message || (message.sender_id !== userId && message.receiver_id !== userId)) {
      throw new Error("Message not found");
    }
    return message;
  }

  async createMessage(data) {
    return await this.messageRepository.create(data);
  }

  async updateMessage(id, data, userId) {
    const message = await this.messageRepository.findById(id);
    if (!message || message.sender_id !== userId) {
      throw new Error("Message not found");
    }
    return await this.messageRepository.update(id, data);
  }

  async deleteMessage(id, userId) {
    const message = await this.messageRepository.findById(id);
    if (!message || message.sender_id !== userId) {
      throw new Error("Message not found");
    }
    return await this.messageRepository.delete(id);
  }
}

module.exports = MessageService;