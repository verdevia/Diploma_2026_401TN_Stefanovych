const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "C2C Marketplace API",
      version: "1.0.0",
    },

    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },

      schemas: {
        SignUpDTO: {
          type: "object",
          required: ["username", "email", "password"],
          properties: {
            username: { type: "string", example: "ivan123" },
            email: { type: "string", example: "ivan@gmail.com" },
            password: { type: "string", example: "password123" },
          },
        },

        SignInDTO: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string", example: "ivan@gmail.com" },
            password: { type: "string", example: "password123" },
          },
        },

        TokenResponse: {
          type: "object",
          properties: {
            token: {
              type: "string",
              example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            },
          },
        },
      },
    },
  },

  apis: ["./src/controllers/*.js"], 
};

module.exports = swaggerJsdoc(options);