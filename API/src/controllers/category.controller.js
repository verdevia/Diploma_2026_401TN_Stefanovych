const express = require("express");
const router = express.Router();

const { categoryService } = require("../container");
const CategoryDTO = require("../dto/category.dto");
const authenticate = require("../middleware/auth.middleware");
const authorizeRoles = require("../middleware/role.middleware");

function respondError(res, e) {
  const status = e.status || (e.message === "Forbidden" ? 403 : (e.message === "Unauthorized" ? 401 : (/(not found)/i.test(e.message) ? 404 : 400)));
  return res.status(status).json({ error: e.message });
}

/**
 * @swagger
 * tags:
 *   name: Categories
 *   description: Product categories
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     CategoryDTO:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         name:
 *           type: string
 *           example: Electronics
 */

/**
 * @swagger
 * /api/categories:
 *   get:
 *     summary: Get all categories
 *     tags: [Categories]
 *     responses:
 *       200:
 *         description: List of categories
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/CategoryDTO'
 */
router.get("/", async (req, res) => {
  const categories = await categoryService.getAllCategories();
  res.json(categories.map(c => new CategoryDTO(c)));
});

/**
 * @swagger
 * /api/categories/{id}:
 *   get:
 *     summary: Get category by ID
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Category found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CategoryDTO'
 *       404:
 *         description: Category not found
 */
router.get("/:id", async (req, res) => {
  try {
    const category = await categoryService.getCategory(Number(req.params.id));
    res.json(new CategoryDTO(category));
  } catch (e) {
    respondError(res, e);
  }
});

/**
 * @swagger
 * /api/categories/{id}:
 *   patch:
 *     summary: Partial update category
 *     tags: [Categories]
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
 *               name:
 *                 type: string
 *     responses:
 *       200:
 *         description: Category updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CategoryDTO'
 *       400:
 *         description: Invalid data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Category not found
 */
router.patch("/:id", authenticate, authorizeRoles("moderator", "admin"), async (req, res) => {
  try {
    const category = await categoryService.updateCategory(Number(req.params.id), req.body);
    res.json(new CategoryDTO(category));
  } catch (e) {
    respondError(res, e);
  }
});

/**
 * @swagger
 * /api/categories:
 *   post:
 *     summary: Create new category
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: Category created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CategoryDTO'
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post("/", authenticate, authorizeRoles("moderator", "admin"), async (req, res) => {
  try {
    const category = await categoryService.createCategory(req.body);
    res.status(201).json(new CategoryDTO(category));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

/**
 * @swagger
 * /api/categories/{id}:
 *   delete:
 *     summary: Delete category by ID
 *     tags: [Categories]
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
 *         description: Category deleted
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
 *         description: Category not found
 */
router.delete("/:id", authenticate, authorizeRoles("moderator", "admin"), async (req, res) => {
  try {
    await categoryService.deleteCategory(Number(req.params.id));
    res.json({ message: "Deleted" });
  } catch (e) {
    respondError(res, e);
  }
});

module.exports = router;