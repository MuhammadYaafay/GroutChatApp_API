const express = require("express");
const router = express.Router();
const { check } = require("express-validator");
const channelController = require("../controllers/channel.controller");
const auth = require("../middlewares/auth.middleware");

router.post(
  "/create",
  [auth, check("name", "Name is required").notEmpty()],
  channelController.createChannel
);

router.get("/", auth, channelController.getUserChannels);

router.get("/available", auth, channelController.getAvailabelChannels);

router.get("/:id", auth, channelController.getChannelById);

router.put("/:id", auth, channelController.updateChannel);

router.post(
  "/:id/members",
  [auth, check("userId", "User ID is required").notEmpty()],
  channelController.addMember
);

router.delete("/:id/members/:userId", auth, channelController.removeMember);

router.delete("/:id", auth, channelController.deleteChannel);

module.exports = router;
