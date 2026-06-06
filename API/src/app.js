const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const express = require("express");
const cors = require("cors");
const app = express();

// Controllers
const userController = require("./controllers/user.controller");
const adController = require("./controllers/ad.controller");
const messageController = require("./controllers/message.controller");
const reviewController = require("./controllers/review.controller");
const favoriteController = require("./controllers/favorite.controller");
const categoryController = require("./controllers/category.controller"); 
const authController = require("./controllers/auth.controller");

// Swagger
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./config/swagger");

app.use(cors());
app.use(express.json({ limit: "5mb" }));

app.get("/", (req, res) => {
  res.json({
    status: "ok",
    service: "c2c-marketplace-api",
  });
});

// Routing
app.use("/api/auth", authController);
app.use("/api/users", userController);
app.use("/api/listings", adController);
app.use("/api/ads", adController);
app.use("/api/messages", messageController);
app.use("/api/reviews", reviewController);
app.use("/api/favorites", favoriteController);
app.use("/api/categories", categoryController);

// Swagger UI
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

const PORT = process.env.PORT || 3000;
const HOST = process.env.API_HOST || "0.0.0.0";

if (require.main === module) {
  app.listen(PORT, HOST, () => {
    console.log(`Server running on http://${HOST}:${PORT}`);
  });
}

module.exports = app;
