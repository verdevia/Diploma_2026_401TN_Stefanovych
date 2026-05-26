const express = require("express");
const router = express.Router();

const { adService } = require("../container");
const AdDTO = require("../dto/ad.dto");
const authenticate = require("../middleware/auth.middleware");

function respondError(res, e) {
  const status = e.status || (e.message === "Forbidden" ? 403 : (e.message === "Unauthorized" ? 401 : (/(not found)/i.test(e.message) ? 404 : 400)));
  return res.status(status).json({ error: e.message });
}

/**
 * @swagger
 * tags:
 *   name: Ads
 *   description: User ads
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     AdDTO:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         user_id:
 *           type: integer
 *           example: 1
 *         category_id:
 *           type: integer
 *           example: 2
 *         title:
 *           type: string
 *           example: "iPhone 14 Pro"
 *         description:
 *           type: string
 *           example: "Selling almost new iPhone 14 Pro, excellent condition"
 *         image_url:
 *           type: string
 *           nullable: true
 *         price:
 *           type: number
 *           example: 1200.50
 *         status:
 *           type: string
 *           example: "active"
 *         created_at:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/ads:
 *   get:
 *     summary: Get all ads
 *     tags: [Ads]
 *     responses:
 *       200:
 *         description: List of ads
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/AdDTO'
 */
router.get("/", async (req, res) => {
  try {
    const ads = await adService.getAllAds({
      status: req.query.status,
    });
    res.json(ads.map(a => new AdDTO(a)));
  } catch (e) {
    respondError(res, e);
  }
});

/**
 * @swagger
 * /api/ads/{id}:
 *   get:
 *     summary: Get ad by ID
 *     tags: [Ads]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Ad found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdDTO'
 *       404:
 *         description: Ad not found
 */
router.get("/:id", async (req, res) => {
  try {
    const ad = await adService.getAd(Number(req.params.id));
    res.json(new AdDTO(ad));
  } catch {
    res.status(404).json({ error: "Ad not found" });
  }
});

/**
 * @swagger
 * /api/ads:
 *   post:
 *     summary: Create a new ad
 *     tags: [Ads]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               user_id:
 *                 type: integer
 *               category_id:
 *                 type: integer
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               image_url:
 *                 type: string
 *                 nullable: true
 *               price:
 *                 type: number
 *     responses:
 *       201:
 *         description: Ad created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdDTO'
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */

router.post("/", authenticate, async (req, res) => {
  try {
    const ad = await adService.createAd({
      ...req.body,
      user_id: req.user.userId,
    });

    res.status(201).json(new AdDTO(ad));
  } catch (e) {
    respondError(res, e);
  }
});

/**
 * @swagger
 * /api/ads/{id}:
 *   delete:
 *     summary: Delete ad by ID
 *     security:
 *       - bearerAuth: []
 *     tags: [Ads]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Ad deleted
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
 *         description: Ad not found
 */
router.delete("/:id", authenticate, async (req, res) => {
  try {
    await adService.deleteAd(
      Number(req.params.id),
      req.user
    );

    res.json({ message: "Ad deleted" });
  } catch (e) {
    respondError(res, e);
  }
});

/**
 * @swagger
 * /api/ads/{id}:
 *   patch:
 *     summary: Partial update ad
 *     tags: [Ads]
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
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               image_url:
 *                 type: string
 *                 nullable: true
 *               price:
 *                 type: number
 *               status:
 *                 type: string
 *                 enum: [pending, active, sold, removed]
 *               category_id:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Ad updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdDTO'
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Ad not found
 */
router.patch("/:id", authenticate, async (req, res) => {
  try {
    const ad = await adService.updateAd(Number(req.params.id), req.body, req.user);
    res.json(new AdDTO(ad));
  } catch (e) {
    respondError(res, e);
  }
});

module.exports = router;
