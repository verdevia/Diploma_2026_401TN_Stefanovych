class ReviewDTO {
  constructor({ review_id, reviewer_id, reviewed_user_id, ad_id, rating, comment, created_at }) {
    this.id = review_id;
    this.reviewer_id = reviewer_id;
    this.reviewed_user_id = reviewed_user_id;
    this.ad_id = ad_id;
    this.rating = rating;
    this.comment = comment;
    this.created_at = created_at;
  }
}

module.exports = ReviewDTO;
