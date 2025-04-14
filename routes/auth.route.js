const express = require("express");
const router = express.Router();
const { check } = require("express-validator");
const authController = require("../controllers/auth.controller");
const auth = require("../middlewares/auth.middleware");

router.post(
  "/register",
  [
    check("username", "Name is required").not().isEmpty(),
    check("email", "Please include a valid email").isEmail(),
    check(
      "password",
      "Please enter a password with 6 or more characters"
    ).isLength({
      min: 6,
    }),
  ],
  authController.register
);

router.post(
  "/login",
  [
    check("email", "Please include a valid email").isEmail(),
    check("password", "Password is required").exists(),
  ],
  authController.login
);

router.get("/user", auth, authController.getUser);

router.post("/logout", auth, authController.logout);

module.exports = router;
