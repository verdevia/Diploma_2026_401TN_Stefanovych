const express = require("express");
const jwt = require("jsonwebtoken");
const router = express.Router();
const { messageService } = require("../container");
const MessageDTO = require("../dto/message.dto");
const authenticate = require("../middleware/auth.middleware");

const streamClients = new Map();

function respondError(res, e) {
  const status = e.status || (e.message === "Forbidden" ? 403 : (e.message === "Unauthorized" ? 401 : (/(not found)/i.test(e.message) ? 404 : 400)));
  return res.status(status).json({ error: e.message });
}

function sendStreamEvent(res, event, payload) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function addStreamClient(userId, res) {
  const clients = streamClients.get(userId) || new Set();
  clients.add(res);
  streamClients.set(userId, clients);

  return () => {
    clients.delete(res);
    if (clients.size === 0) {
      streamClients.delete(userId);
    }
  };
}

function notifyUser(userId, event, payload) {
  const clients = streamClients.get(userId);
  if (!clients) {
    return;
  }

  clients.forEach((res) => sendStreamEvent(res, event, payload));
}

function notifyParticipants(event, message) {
  const payload = new MessageDTO(message);
  const participantIds = new Set([message.sender_id, message.receiver_id]);

  participantIds.forEach((userId) => notifyUser(userId, event, payload));
}

function authenticateStream(req, res, next) {
  const header = req.headers.authorization;
  const token = req.query.token || (header ? header.split(" ")[1] : null);

  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

/**
 * @swagger
 * tags:
 *   name: Messages
 *   description: User messages
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     MessageDTO:
 *       type: object
 *       properties:
 *         message_id:
 *           type: integer
 *           example: 1
 *         sender_id:
 *           type: integer
 *           example: 2
 *         receiver_id:
 *           type: integer
 *           example: 3
 *         ad_id:
 *           type: integer
 *           example: 10
 *         content:
 *           type: string
 *           example: "Hello, I'm interested in the item!"
 *         sent_at:
 *           type: string
 *           format: date-time
 *           example: "2026-03-21T15:30:00Z"
 */

/**
 * @swagger
 * /api/messages:
 *   get:
 *     summary: Get user messages
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of messages
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/MessageDTO'
 *       401:
 *         description: Unauthorized
 */
router.get("/", authenticate, async (req, res) => {
  const messages = await messageService.getUserMessages(req.user.userId);
  res.json(messages.map(m => new MessageDTO(m)));
});

router.get("/stream", authenticateStream, (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();

  sendStreamEvent(res, "connected", { userId: req.user.userId });
  const removeClient = addStreamClient(req.user.userId, res);
  const keepAlive = setInterval(() => {
    sendStreamEvent(res, "ping", { now: Date.now() });
  }, 30000);

  req.on("close", () => {
    clearInterval(keepAlive);
    removeClient();
    res.end();
  });
});

/**
 * @swagger
 * /api/messages/{id}:
 *   get:
 *     summary: Get message by ID
 *     tags: [Messages]
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
 *         description: Message found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageDTO'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Message not found
 */
router.get("/:id", authenticate, async (req, res) => {
  try {
    const message = await messageService.getMessage(Number(req.params.id), req.user.userId);
    res.json(new MessageDTO(message));
  } catch {
    res.status(404).json({ error: "Message not found" });
  }
});

/**
 * @swagger
 * /api/messages:
 *   post:
 *     summary: Create a new message
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MessageDTO'
 *     responses:
 *       201:
 *         description: Message created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageDTO'
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 */
router.post("/", authenticate, async (req, res) => {
  try {
    const message = await messageService.createMessage({
      ...req.body,
      sender_id: req.user.userId,
    });
    const dto = new MessageDTO(message);
    notifyParticipants("message:created", message);
    res.status(201).json(dto);
  } catch (e) {
    respondError(res, e);
  }
});

/**
 * @swagger
 * /api/messages/{id}:
 *   patch:
 *     summary: Partial update message
 *     tags: [Messages]
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
 *               content:
 *                 type: string
 *     responses:
 *       200:
 *         description: Message updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageDTO'
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Message not found
 */
router.patch("/:id", authenticate, async (req, res) => {
  try {
    const message = await messageService.updateMessage(Number(req.params.id), req.body, req.user.userId);
    const dto = new MessageDTO(message);
    notifyParticipants("message:updated", message);
    res.json(dto);
  } catch (e) {
    respondError(res, e);
  }
});

/**
 * @swagger
 * /api/messages/{id}:
 *   delete:
 *     summary: Delete message by ID
 *     tags: [Messages]
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
 *         description: Message deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Deleted
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Message not found
 */
router.delete("/:id", authenticate, async (req, res) => {
  try {
    const message = await messageService.deleteMessage(Number(req.params.id), req.user.userId);
    notifyParticipants("message:deleted", message);
    res.json({ message: "Deleted" });
  } catch (e) {
    respondError(res, e);
  }
});

module.exports = router;
