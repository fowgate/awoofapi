const auth = require("../middleware/auth");
const admin = require("../middleware/admin");
const { User } = require("../models/user");
const { Account, validateAccount } = require("../models/account");
const bcrypt = require("bcryptjs");

const _ = require("lodash");

const Fawn = require("fawn");

const express = require("express");
const router = express.Router();

//all accounts list
router.get("/", [auth, admin], async (req, res) => {
  const accounts = await Account.find().sort("createdAt");
  let result = { status: "success", error: false, data: accounts };
  res.send(result);
});

// Get the account lists for currently logged-in user
router.get("/me", auth, async (req, res) => {
  const user = await User.findById(req.user._id).select("-password -__v");

  const userAccounts = await Account.find({
    user: user.email,
  })
    .sort("createdAt")
    .select("-__v");

  let result = { status: "success", error: false, data: userAccounts };
  res.send(result);
});

// add an account
router.post("/", [auth], async (req, res) => {
  if (!req.body.newPin)
    return res
      .status(400)
      .send({ error: true, message: "Transaction PIN is required" });

  const { error } = validateAccount(req.body);
  if (error)
    return res
      .status(400)
      .send({ error: true, message: error.details[0].message });

  const user = await User.findById(req.user._id).select("-password -__v");

  const validPin = await bcrypt.compare(req.body.newPin, user.newPin);

  if (!validPin)
    return res.status(400).send({ error: true, message: "Pin does not match" });

  const account = new Account({
    bankName: req.body.bankName,
    bankCode: req.body.bankCode,
    accountName: req.body.accountName,
    accountNumber: req.body.accountNumber,
    user: user.email,
  });

  const accountDetails = _.pick(account, [
    "_id",
    "bankName",
    "bankCode",
    "accountName",
    "accountNumber",
    "user",
    "createdAt",
  ]);

  try {
    new Fawn.Task()
      .save("accounts", account)
      .update(
        "users",
        { _id: user._id },
        {
          $set: {
            isAccountSet: true,
          },
        }
      )
      .run();
    let result = { status: "success", error: false, data: accountDetails };
    res.send(result);
  } catch (ex) {
    res
      .status(500)
      .send({ status: "error", error: true, message: "Something went wrong." });
  }
});

router.delete("/:id", [auth], async (req, res) => {
  const account = await Account.findByIdAndRemove(req.params.id);

  if (!account)
    return res
      .status(404)
      .send({
        error: true,
        message: "The Account with the given ID was not found.",
      });
  let result = { status: "success", error: false, data: account };
  res.send(result);
});

router.get("/:id", auth, async (req, res) => {
  const account = await Account.findById(req.params.id);

  if (!account)
    return res
      .status(404)
      .send({
        error: true,
        message: "The Account with the given ID was not found.",
      });
  let result = { status: "success", error: false, data: account };
  res.send(result);
});

module.exports = router;
