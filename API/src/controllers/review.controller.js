const express = require("express");
const router = express.Router();
const { reviewService } = require("../container");
const ReviewDTO = require("../dto/review.dto");
const authenticate = require("../middleware/auth.middleware");

function respondError(res, e) {
  const status = e.status || (e.message === "Forbidden" ? 403 : (e.message === "Unauthorized" ? 401 : (/(not found)/i.test(e.message) ? 404 : 400)));
  return res.status(status).json({ error: e.message });
}

/**
 * @swagger
 * tags:
 *   name: Reviews
 *   description: User reviews
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     ReviewDTO:
 *       type: object
 *       properties:
 *         review_id:
 *           type: integer
 *           example: 1
 *         reviewer_id:
 *           type: integer
 *           example: 2
 *         reviewed_user_id:
 *           type: integer
 *           example: 3
 *         ad_id:
 *           type: integer
 *           example: 10
 *         rating:
 *           type: integer
 *           example: 5
 *         comment:
 *           type: string
 *           example: "Excellent seller!"
 *         created_at:
 *           type: string
 *           format: date-time
 *           example: "2026-03-21T15:30:00Z"
 */

/**
 * @swagger
 * /api/reviews:
 *   get:
 *     summary: Get all reviews
 *     tags: [Reviews]
 *     responses:
 *       200:
 *         description: List of reviews
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ReviewDTO'
 */
router.get("/", async (req, res) => {
  try {
    const reviews = await reviewService.getAllReviews({
      ad_id: req.query.ad_id,
    });
    res.json(reviews.map(r => new ReviewDTO(r)));
  } catch (e) {
    respondError(res, e);
  }
});

/**
 * @swagger
 * /api/reviews/{id}:
 *   get:
 *     summary: Get review by ID
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Review found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ReviewDTO'
 *       404:
 *         description: Review not found
 */
router.get("/:id", async (req, res) => {
  try {
    const review = await reviewService.getReview(Number(req.params.id));
    res.json(new ReviewDTO(review));
  } catch (e) {
    respondError(res, e);
  }
});

/**
 * @swagger
 * /api/reviews:
 *   post:
 *     summary: Create a new review
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ReviewDTO'
 *     responses:
 *       201:
 *         description: Review created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ReviewDTO'
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 */
router.post("/", authenticate, async (req, res) => {
  try {
    const review = await reviewService.createReview(req.body, req.user);
    res.status(201).json(new ReviewDTO(review));
  } catch (e) {
    respondError(res, e);
  }
});

/**
 * @swagger
 * /api/reviews/{id}:
 *   patch:
 *     summary: Partial update review
 *     tags: [Reviews]
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
 *               rating:
 *                 type: integer
 *               comment:
 *                 type: string
 *     responses:
 *       200:
 *         description: Review updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ReviewDTO'
 *       400:
 *         description: Invalid data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Review not found
 */
router.patch("/:id", authenticate, async (req, res) => {
  try {
    const review = await reviewService.updateReview(Number(req.params.id), req.body, req.user);
    res.json(new ReviewDTO(review));
  } catch (e) {
    respondError(res, e);
  }
});

/**
 * @swagger
 * /api/reviews/{id}:
 *   delete:
 *     summary: Delete review by ID
 *     tags: [Reviews]
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
 *         description: Review deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Deleted
 *       400:
 *         description: Invalid data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Review not found
 */
router.delete("/:id", authenticate, async (req, res) => {
  try {
    await reviewService.deleteReview(Number(req.params.id), req.user);
    res.json({ message: "Deleted" });
  } catch (e) {
    respondError(res, e);
  }
});

module.exports = router;
