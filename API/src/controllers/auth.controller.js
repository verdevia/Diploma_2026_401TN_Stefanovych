const express = require("express");
const router = express.Router();
const { authService } = require("../container");

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: Authentication and user registration
 */

/**
 * @swagger
 * /api/auth/signup:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SignUpDTO'
 *     responses:
 *       201:
 *         description: User created
 *       400:
 *         description: Invalid input or email already exists
 */
router.post("/signup", async (req, res) => {
  try {
    const result = await authService.requestSignUp(req.body);

    res.status(202).json({
      message: "Verification code sent",
      ...result,
    });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/signup/request", async (req, res) => {
  try {
    const result = await authService.requestSignUp(req.body);

    res.status(202).json({
      message: "Verification code sent",
      ...result,
    });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/signup/confirm", async (req, res) => {
  try {
    const result = await authService.confirmSignUp(req.body);

    res.status(201).json({
      message: "User created",
      ...result,
    });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

/**
 * @swagger
 * /api/auth/signin:
 *   post:
 *     summary: Login user and receive JWT token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SignInDTO'
 *     responses:
 *       200:
 *         description: Successful login
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TokenResponse'
 *       401:
 *         description: Invalid credentials
 */
router.post("/signin", async (req, res) => {
  try {
    const result = await authService.signIn(req.body);
    res.json(result);
  } catch (e) {
    res.status(401).json({ error: e.message });
  }
});

module.exports = router;
