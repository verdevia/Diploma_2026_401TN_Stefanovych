class AdDTO {
  constructor({ ad_id, user_id, category_id, title, description, image_url, price, status, created_at }) {
    this.id = ad_id;
    this.user_id = user_id;
    this.category_id = category_id;
    this.title = title;
    this.description = description;
    this.image_url = image_url;
    this.price = price;
    this.status = status;
    this.created_at = created_at;
  }
}

module.exports = AdDTO;
