const express = require("express");
const router = express.Router();

const { favoriteService } = require("../container");
const FavoriteDTO = require("../dto/favorite.dto");
const authenticate = require("../middleware/auth.middleware");

function respondError(res, e) {
  const status = e.status || (e.message === "Forbidden" ? 403 : (e.message === "Unauthorized" ? 401 : (/(not found)/i.test(e.message) ? 404 : 400)));
  return res.status(status).json({ error: e.message });
}

/**
 * @swagger
 * tags:
 *   name: Favorites
 *   description: User favorites
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     FavoriteDTO:
 *       type: object
 *       properties:
 *         user_id:
 *           type: integer
 *           example: 1
 *         ad_id:
 *           type: integer
 *           example: 2
 */

/**
 * @swagger
 * /api/favorites:
 *   get:
 *     summary: Get current user favorites
 *     tags: [Favorites]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Favorites list
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/FavoriteDTO'
 *       401:
 *         description: Unauthorized
 */
router.get("/", authenticate, async (req, res) => {
  const favorites = await favoriteService.getUserFavorites(req.user.userId);
  res.json(favorites.map(f => new FavoriteDTO(f)));
});

/**
 * @swagger
 * /api/favorites/{ad_id}:
 *   post:
 *     summary: Add favorite
 *     tags: [Favorites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ad_id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       201:
 *         description: Favorite added
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FavoriteDTO'
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 */
router.post("/:ad_id", authenticate, async (req, res) => {
  try {
    const favorite = await favoriteService.createFavorite({
      user_id: req.user.userId,
      ad_id: Number(req.params.ad_id),
    });
    res.status(201).json(new FavoriteDTO(favorite));
  } catch (e) {
    respondError(res, e);
  }
});

/**
 * @swagger
 * /api/favorites/{ad_id}:
 *   delete:
 *     summary: Remove favorite
 *     tags: [Favorites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ad_id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Favorite removed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Deleted
 *       404:
 *         description: Favorite not found
 *       401:
 *         description: Unauthorized
 */
router.delete("/:ad_id", authenticate, async (req, res) => {
  try {
    await favoriteService.deleteFavorite(req.user.userId, Number(req.params.ad_id));
    res.json({ message: "Deleted" });
  } catch (e) {
    respondError(res, e);
  }
});

module.exports = router;