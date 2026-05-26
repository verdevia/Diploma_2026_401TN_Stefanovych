class MessageDTO {
  constructor({ message_id, sender_id, receiver_id, ad_id, content, sent_at }) {
    this.id = message_id;
    this.sender_id = sender_id;
    this.receiver_id = receiver_id;
    this.ad_id = ad_id;
    this.content = content;
    this.sent_at = sent_at;
  }
}

module.exports = MessageDTO;