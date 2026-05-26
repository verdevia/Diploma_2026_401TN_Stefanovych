class FavoriteService {
  constructor(favoriteRepository) {
    this.favoriteRepository = favoriteRepository;
  }

  async getUserFavorites(userId) {
    return await this.favoriteRepository.findByUserId(userId);
  }

  async getFavorite(user_id, ad_id) {
    return await this.favoriteRepository.findById(user_id, ad_id);
  }

  async createFavorite(data) {
    const existing = await this.favoriteRepository.findById(data.user_id, data.ad_id);
    if (existing) {
      throw new Error("Favorite already exists");
    }
    return await this.favoriteRepository.create(data);
  }

  async deleteFavorite(user_id, ad_id) {
    const favorite = await this.favoriteRepository.findById(user_id, ad_id);
    if (!favorite) {
      throw new Error("Favorite not found");
    }
    return await this.favoriteRepository.delete(user_id, ad_id);
  }
}

module.exports = FavoriteService;