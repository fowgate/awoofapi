const auth = require("../middleware/auth");
const admin = require("../middleware/admin");
const { User } = require("../models/user");
const { SocialAccount, validateAccount } = require("../models/socialAccount");
const express = require("express");
const router = express.Router();

//Admin can retrieve all the users social accounts
router.get("/getAll", [auth, admin], async (req, res) => {
  const accounts = await SocialAccount.find().select("-__v").sort("createdAt");
  return res
    .status(200)
    .send({ status: "success", error: false, data: accounts });
});

//User retrieve social accounts
router.get("/me", [auth], async (req, res) => {
  const account = await SocialAccount.find({ user: req.user._id })
    .select("-__v")
    .sort({ createdAt: -1 });
  if (!account)
    return res.status(200).send({
      status: "success",
      error: true,
      message: "The User with the given ID was not found.",
    });

  return res
    .status(200)
    .send({ status: "success", error: false, data: account });
});

// User can add social account
router.post("/add", [auth], async (req, res) => {
  //   const { error } = validateAccount(req.body);
  //   if (error)
  //     return res
  //       .status(422)
  //       .send({ error: true, message: error.details[0].message });

  const account = new SocialAccount({
    user: req.user._id,
    twitter: req.body.twitter,
    facebook: req.body.facebook,
    instagram: req.body.instagram,
  });
  await account.save();

  return res
    .status(200)
    .send({ status: "success", error: false, data: account });
});

//User can update social account
router.put("/update", [auth], async (req, res) => {
  //   const { error } = validateAccount(req.body);
  //   if (error)
  //     return res
  //       .status(400)
  //       .send({ error: true, message: error.details[0].message });

  const account = await SocialAccount.findOneAndUpdate(
    { user: req.user._id },
    {
      twitter: req.body.twitter,
      facebook: req.body.facebook,
      instagram: req.body.instagram,
    }
  );

  if (!account) {
    const account = new SocialAccount({
      user: req.user._id,
      twitter: req.body.twitter,
      facebook: req.body.facebook,
      instagram: req.body.instagram,
    });
    await account.save();

    return res.status(200).send({
      status: "success",
      error: false,
      message: "Successfully updated social account",
    });
  }
  // return res.status(404).send({
  //   status: "error",
  //   error: true,
  //   message: "The User with the given ID was not found.",
  // });

  return res.status(200).send({
    status: "success",
    error: false,
    message: "Successfully updated social account",
  });
});

module.exports = router;
