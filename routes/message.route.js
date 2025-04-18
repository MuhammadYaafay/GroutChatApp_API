const express = require("express");
const router = express.Router();
const { check } = require("express-validator");
const messageController = require("../controllers/message.controller");
const auth = require("../middlewares/auth.middleware");
const upload = require("../middlewares/upload.middleware");

router.post(
  "/direct",
  [
    auth,
    upload.array("attachments", 5),
    check("recipientId", "Recipient ID is required").notEmpty(),
    check("content", "Content is required").notEmpty(),
  ],
  messageController.sendDirectMessage
);

router.get("/direct/:userId", auth, messageController.getDirectMessages);

router.post(
  "/channel",
  [
    auth,
    upload.array("attachments", 5),
    check("channelId", "Channel ID is required").notEmpty(),
    check("content", "Content is required").notEmpty(),
  ],
  messageController.sendChannelMessage
);

router.get("/channel/:channelId", auth, messageController.getChannelMessages);

router.get("/attachments/:id", auth, messageController.downloadAttachments);

module.exports = router;
