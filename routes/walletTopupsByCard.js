const auth = require("../middleware/auth");
const admin = require("../middleware/admin");
const { User } = require("../models/user");
const {
  WalletTopup,
  validateWalletTopup,
} = require("../models/walletTopupByCard");

const _ = require("lodash");

const Fawn = require("fawn");

const express = require("express");
const router = express.Router();
const uniqid = require("uniqid");
const axios = require("axios");

//all card payment to topup wallet fund
// router.get("/", [auth, admin], async (req, res) => {
//   const walletTopupsByCard = await WalletTopup.find().sort("transaction_date");
//   let result = { status: "success", error: false, data: walletTopupsByCard };
//   res.send(result);
// });

// Get the card topup history for currently logged-in user
router.get("/me", auth, async (req, res) => {
  const user = await User.findById(req.user._id).select("-password -__v");

  const userCardTopupHistories = await WalletTopup.find({
    user_email: user.email,
  })
    .sort("transaction_date")
    .select("-__v");
  let result = {
    status: "success",
    error: false,
    data: userCardTopupHistories,
  };
  res.send(result);
});

// add a new topup to Awoof db if payment successful
router.post("/", [auth], async (req, res) => {
  const { error } = validateWalletTopup(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  const user = await User.findById(req.user._id).select("-password -__v");

  const order_ref = uniqid("WTU|").toUpperCase();

  const amount = (req.body.amount * 100) / 100;

  const verify = await axios.get(
    `https://api.paystack.co/transaction/verify/${req.body.payment_reference}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.paystack}`,
        "Content-type": "application/json",
      },
    }
  );

  if (verify.data.status == false) {
    return res.status(400).json({
      error: true,
      message:
        "We are having some trouble depositing your funds right now, please try again later",
    });
  }

  if (verify.data.data.status != "success") {
    return res.status(400).json({
      error: true,
      message:
        "We are having some trouble depositing your funds right now, please try again later",
    });
  }

  const walletTopup = new WalletTopup({
    amount: amount,
    user_email: user.email,
    order_ref: order_ref,
    payment_reference: req.body.payment_reference,
    payment_status: req.body.payment_status,
    gateway_response: req.body.gateway_response,
  });

  const walletTopupDetails = _.pick(walletTopup, [
    "_id",
    "user_email",
    "amount",
    "order_ref",
    "payment_reference",
    "payment_status",
    "gateway_response",
    "transaction_date",
  ]);

  try {
    new Fawn.Task()
      .save("wallettopups", walletTopup)
      .update(
        "users",
        { _id: user._id },
        {
          $inc: {
            balance: +req.body.amount,
          },
        }
      )
      .run();
    let result = { message: "success", error: false, data: walletTopupDetails };
    res.send(result);
  } catch (ex) {
    res.status(500).send({ error: true, message: "Something went wrong." });
  }
});

router.get("/:id", auth, async (req, res) => {
  const walletTopup = await WalletTopup.findById(req.params.id);

  if (!walletTopup)
    return res.status(404).send({
      status: "error",
      error: true,
      message: "The Wallet Topup Detail with the given ID was not found.",
    });
  let result = { message: "success", error: false, data: walletTopup };
  res.send(result);
});

module.exports = router;
