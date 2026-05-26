const prisma = require("./config/prisma");

const UserRepository = require("./repositories/user.repository");
const AdRepository = require("./repositories/ad.repository");
const MessageRepository = require("./repositories/message.repository");
const ReviewRepository = require("./repositories/review.repository");
const FavoriteRepository = require("./repositories/favorite.repository");
const CategoryRepository = require("./repositories/category.repository");

const AuthService = require("./services/auth.service");
const UserService = require("./services/user.service");
const EmailVerificationService = require("./services/email-verification.service");
const AdService = require("./services/ad.service");
const MessageService = require("./services/message.service");
const ReviewService = require("./services/review.service");
const FavoriteService = require("./services/favorite.service");
const CategoryService = require("./services/category.service");

const userRepository = new UserRepository(prisma);
const adRepository = new AdRepository(prisma);
const messageRepository = new MessageRepository(prisma);
const reviewRepository = new ReviewRepository(prisma);
const favoriteRepository = new FavoriteRepository(prisma);
const categoryRepository = new CategoryRepository(prisma);

const emailVerificationService = new EmailVerificationService();

const authService = new AuthService(userRepository, emailVerificationService);

const userService = new UserService(userRepository, emailVerificationService);
const adService = new AdService(adRepository);
const messageService = new MessageService(messageRepository);
const reviewService = new ReviewService(reviewRepository, adRepository);
const favoriteService = new FavoriteService(favoriteRepository);
const categoryService = new CategoryService(categoryRepository);

module.exports = {
  authService,
  userService,
  adService,
  messageService,
  reviewService,
  favoriteService,
  categoryService,
};
