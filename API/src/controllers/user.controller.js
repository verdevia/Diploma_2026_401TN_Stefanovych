const express = require("express");
const router = express.Router();

const { userService } = require("../container");
const UserDTO = require("../dto/user.dto");
const authenticate = require("../middleware/auth.middleware");
const authorizeRoles = require("../middleware/role.middleware");

function respondError(res, e) {
  const status = e.status || (e.message === "Forbidden" ? 403 : (e.message === "Unauthorized" ? 401 : (/(not found)/i.test(e.message) ? 404 : 400)));
  return res.status(status).json({ error: e.message });
}

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: System users
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     UserDTO:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         username:
 *           type: string
 *           example: johndoe
 *         email:
 *           type: string
 *           example: johndoe@example.com
 *         role:
 *           type: string
 *           example: user
 *         created_at:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: List of users
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/UserDTO'
 */
router.get("/", async (req, res) => {
  const users = await userService.getAllUsers();
  res.json(users.map(u => new UserDTO(u)));
});

router.get("/me", authenticate, async (req, res) => {
  try {
    const user = await userService.getUser(req.user.userId);
    res.json(new UserDTO(user));
  } catch (e) {
    respondError(res, e);
  }
});

router.patch("/me", authenticate, async (req, res) => {
  try {
    const user = await userService.updateCurrentUser(req.user, req.body);
    res.json(new UserDTO(user));
  } catch (e) {
    respondError(res, e);
  }
});

router.post("/me/email-verification", authenticate, async (req, res) => {
  try {
    const result = await userService.requestCurrentUserEmailChange(req.user, req.body);
    res.status(202).json({
      message: "Verification code sent",
      ...result,
    });
  } catch (e) {
    respondError(res, e);
  }
});

router.patch("/me/password", authenticate, async (req, res) => {
  try {
    await userService.changeCurrentUserPassword(req.user, req.body);
    res.json({ message: "Password updated" });
  } catch (e) {
    respondError(res, e);
  }
});

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: User found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserDTO'
 *       404:
 *         description: User not found
 */
router.get("/:id", async (req, res) => {
  try {
    const user = await userService.getUser(Number(req.params.id));
    res.json(new UserDTO(user));
  } catch {
    res.status(404).json({ error: "User not found" });
  }
});

/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: Create new user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 example: johndoe
 *               email:
 *                 type: string
 *                 example: johndoe@example.com
 *               password_hash:
 *                 type: string
 *                 example: hashed_password
 *     responses:
 *       201:
 *         description: User created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserDTO'
 *       400:
 *         description: Invalid data
 */
router.post("/", async (req, res) => {
  try {
    const user = await userService.createUser(req.body);
    res.status(201).json(new UserDTO(user));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

/**
 * @swagger
 * /api/users/{id}/role:
 *   patch:
 *     summary: Update user role (moderator/admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [user, moderator, admin]
 *                 example: moderator
 *     responses:
 *       200:
 *         description: User role updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserDTO'
 *       400:
 *         description: Invalid role
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: User not found
 */
router.patch("/:id/role", authenticate, authorizeRoles("moderator", "admin"), async (req, res) => {
  try {
    const user = await userService.updateUserRole(Number(req.params.id), req.body.role, req.user);
    res.json(new UserDTO(user));
  } catch (e) {
    respondError(res, e);
  }
});

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Delete user by ID
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: User deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Deleted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: User not found
 */
router.delete("/:id", authenticate, async (req, res) => {
  try {
    await userService.deleteUser(Number(req.params.id), req.user);
    res.json({ message: "Deleted" });
  } catch (e) {
    respondError(res, e);
  }
});

module.exports = router;
