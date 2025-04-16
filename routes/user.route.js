const express = require("express");
const router = express.Router();
const { check } = require("express-validator");
const userController = require("../controllers/user.controller");
const auth = require("../middlewares/auth.middleware");
const upload = require("../middlewares/upload.middleware");

router.get("/", auth, userController.getUsers);

router.get("/:id", auth, userController.getUserById);

router.put(
  "/profile",
  [auth, upload.single("avatar")],
  userController.updateProfile
);

router.put(
  "/password",
  auth,
  [
    auth,
    check("currentPassword", "Current password is required").exists(),
    check("newPassword", "New password must be at least 6 characters").isLength(
      {
        min: 6,
      }
    ),
  ],
  userController.updatePassword
);

module.exports = router;
