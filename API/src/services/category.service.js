class CategoryService {
  constructor(categoryRepository) {
    this.categoryRepository = categoryRepository;
  }

  async getAllCategories() {
    return await this.categoryRepository.findAll();
  }

  async getCategory(id) {
    return await this.categoryRepository.findById(id);
  }

  async createCategory(data) {
    return await this.categoryRepository.create(data);
  }

  async updateCategory(id, data) {
    return await this.categoryRepository.update(id, data);
  }

  async deleteCategory(id) {
    return await this.categoryRepository.delete(id);
  }
}

module.exports = CategoryService;