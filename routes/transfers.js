const auth = require("../middleware/auth");
const admin = require("../middleware/admin");
const { User } = require("../models/user");
const bcrypt = require("bcryptjs");
const { Transfer, validateTransfer } = require("../models/transfer");
const { PendingTransfer } = require("../models/PendingTransfer");
const axios = require("axios");

const _ = require("lodash");
const moment = require("moment");
const Fawn = require("fawn");

const express = require("express");
const router = express.Router();
const uniqid = require("uniqid");

const request = require("request");
const { FreeWithdrawal } = require("../models/freeWithdrawal");
const { createVerify } = require("crypto");

// Get the fund transfer history for currently logged-in user
router.get("/me", auth, async (req, res) => {
  const user = await User.findById(req.user._id).select("-password -__v");

  const userFundTransferHistories = await Transfer.find({
    user: user.email,
  })
    .sort("transaction_date")
    .select("-__v");
  res.status(200).send({ error: false, data: userFundTransferHistories });
});

// Get all fund transfer history in DB
router.get("/", [auth, admin], async (req, res) => {
  const transferHistories = await Transfer.find()
    .sort("transaction_date")
    .select("-__v");
  res.status(200).send({ error: false, data: transferHistories });
});

//get all free withdrawals done
router.get("/my_free_withdrawals", auth, async (req, res) => {
  const userFundTransferHistories = await FreeWithdrawal.find({
    user: req.user._id,
  })
    .sort({ transaction_date: -1 })
    .select("-__v");
  res.status(200).send({
    error: false,
    data: userFundTransferHistories ? userFundTransferHistories : [],
  });
});

//create a transfer recipient
router.post("/create", auth, async (req, res) => {
  const user = await User.findById(req.user._id).select("-password -__v");

  //   const { error } = validateTransfer(req.body);
  //   if (error)
  //     return res
  //       .status(400)
  //       .send({ error: true, message: error.details[0].message });

  var options = {
    method: "POST",
    url: "https://api.paystack.co/transferrecipient",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.paystack}`,
    },
    body: {
      type: "nuban",
      name: user.name,
      description: "Awoof-Wallet Withdrawal",
      account_number: req.body.accountNumber,
      bank_code: req.body.bankCode,
      currency: "NGN",
    },
    json: true,
  };

  const createTransferRecipient = (callback) => {
    request(options, function (error, response, body) {
      if (error) {
        return callback(error);
      }

      return callback(body);
    });
  };

  createTransferRecipient(async function (response) {
    if (response.status == false)
      return res.status(400).send({ error: true, message: response.message });

    let responseData = {
      error: response.status,
      message: response.message,
      recipient_code: response.data.recipient_code,
    };
    let result = { message: "success", error: false, data: responseData };
    res.status(200).send(result);
    // res.send(responseData);
  });
});

//for wallet withdrawals
router.post("/initiate", auth, async (req, res) => {
  //   const { error } = validateTransfer(req.body);
  //   if (error)
  //     return res
  //       .status(400)
  //       .send({ error: true, message: error.details[0].message });

  const transaction_pin = req.body.transaction_pin;
  const user = await User.findById(req.user._id).select("-password -__v");
  //const user = await User.findById('64677688968f7c22c8b01035').select("-password -__v");

  const amount = parseFloat(req.body.amount);
  //confirm transaction pin
  const validPin = await bcrypt.compare(transaction_pin, user.newPin);

  if (!validPin)
    return res
      .status(400)
      .send({ error: true, message: "Incorrect transaction PIN" });

  let convenienceFee = 0.05 * amount;

  convenienceFee = convenienceFee < 52.5 ? 52.5 : convenienceFee;

  // check if user has sufficient wallet balance
  if (amount > user.balance) {
    return res
      .status(400)
      .send({ error: true, message: "Insufficient wallet balance" });
  }

  const order_ref = uniqid("BT|").toUpperCase();
  const new_amount = (amount - convenienceFee) * 100;

  var options = {
    method: "POST",
    url: "https://api.paystack.co/transfer",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.paystack}`,
    },
    body: {
      source: "balance",
      amount: new_amount,
      reason: "Awoof-Wallet Withdrawal",
      recipient: req.body.recipient_code,
    },
    json: true,
  };

  const callTransferApi = (callback) => {
    // request(options, function (error, response, body) {
    //   if (error) {
    //     console.log(error);
    //     return res.status(401).json({
    //       message:
    //         "We are having some trouble depositing your funds right now, please try again later",
    //       error: true,
    //     });
    //   }

    //   return callback(body);
    // });
    return callback();
  };

  //callTransferApi(async function (response) {
  callTransferApi(async function () {
    // if (response.status != true) {
    //   console.log(response);
    //   return res.send({
    //     error: true,
    //     message:
    //       "We are having some trouble depositing your funds right now, please try again later",
    //   });
    // }

    let pendingTransfer = await PendingTransfer.create({
      amount: req.body.amount,
      bankCode: req.body.bankCode,
      accountNumber: req.body.accountNumber,
      bankName: req.body.bankName,
      accountName: req.body.accountName,
      order_ref: order_ref,
      user: user._id,
      email: user.email,
      longitude: req.body.longitude,
      latitude: req.body.latitude,
    });

    // let transfer = await Transfer.create({
    //   amount: req.body.amount,
    //   bankCode: req.body.bankCode,
    //   accountNumber: req.body.accountNumber,
    //   bankName: req.body.bankName,
    //   accountName: req.body.accountName,
    //   order_ref: order_ref,
    //   transaction_ref: response.data.reference,
    //   transaction_message: response.message,
    //   user: user.email,
    //   longitude: req.body.longitude,
    //   latitude: req.body.latitude,
    // });

    try {
      await User.updateOne(
        {
          _id: { $in: user._id },
        },
        {
          $inc: { balance: -parseFloat(req.body.amount) },
        }
      );

      let result = {
        message: `Your request to withdraw ${new_amount} has been submitted`, //`${new_amount} has been sent to your bank account and would be available within the next hour`,
        error: false,
        data: pendingTransfer,
      };
      res.status(200).send(result);
      res.end();
    } catch (ex) {
      return res
        .status(500)
        .send({ error: true, message: "payment request was unsuccessful" });
    }
  });
});

// router.post("/w2w", auth, async (req, res) => {
//   if (!req.body.phoneNumber)
//     return res
//       .status(400)
//       .send({ error: true, message: "phoneNumber is required" });

//   if (!req.body.transaction_pin)
//     return res
//       .status(400)
//       .send({ error: true, message: "Transaction PIN is required" });

//   const { error } = validateTransfer(req.body);
//   if (error)
//     return res
//       .status(400)
//       .send({ error: true, message: error.details[0].message });

//   const user = await User.findById(req.user._id).select("-password -__v");
//   const validPin = await bcrypt.compare(req.body.transaction_pin, user.newPin);

//   if (!validPin)
//     return res
//       .status(400)
//       .send({ error: true, message: "Incorrect transaction PIN" });

//   const toUser = await User.findOne(
//     { phoneNumber: req.body.phoneNumber },
//     "phoneNumber balance _id"
//   );

//   if (!toUser)
//     return res.status(400).send({
//       error: true,
//       message:
//         "Recipient account does not exist on Awoof! Check phone number again!",
//     });

//   const orderRef = uniqid("WT|").toUpperCase();

//   if (req.body.amount > user.balance)
//     return res.status(400).send({
//       error: true,
//       message: "Insufficient wallet balance to complete this transfer",
//     });
//   console.log(orderRef);
//   let transfer = new Transfer({
//     amount: req.body.amount,
//     phoneNumber: req.body.phoneNumber,
//     narration: req.body.narration,
//     order_ref: orderRef,
//     user: user.email,
//   });

//   const transferDetails = _.pick(transfer, [
//     "_id",
//     "phoneNumber",
//     "narration",
//     "amount",
//     "order_ref",
//     "user",
//     "transaction_date",
//   ]);

//   try {
//     new Fawn.Task()
//       .save("transfers", transfer)
//       .update(
//         "users",
//         { _id: user._id },
//         {
//           $inc: { balance: -req.body.amount },
//         }
//       )
//       .update(
//         "users",
//         { _id: toUser._id },
//         {
//           $inc: { balance: +req.body.amount },
//         }
//       )
//       .run();

//     let result = { message: "success", error: false, data: transferDetails };
//     res.status(200).send(result);
//   } catch (ex) {
//     res.status(500).send({ error: true, message: "Something went wrong." });
//   }
// });

//create payments by other means
router.post("/initiate_payment", auth, async (req, res) => {
  const user = await User.findById(req.user._id).select("-password -__v");

  const initialize = await axios.post(
    `https://api.paystack.co/transaction/initialize`,
    { amount: req.body.amount, email: user.email },
    {
      headers: {
        Authorization: `Bearer ${process.env.paystack}`,
        "Content-type": "application/json",
      },
    }
  );

  if (initialize.data.status == false) {
    return res.status(200).json({
      status: false,
      error: true,
      message:
        "We are having some trouble depositing your funds right now, please try again later",
    });
  }

  return res.status(200).json({
    status: true,
    error: false,
    message: "transaction initialized successfully",
    data: initialize.data.data,
  });
});

router.post("/verify_payment", auth, async (req, res) => {
  const verify = await axios.get(
    `https://api.paystack.co/transaction/verify/${req.body.reference}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.paystack}`,
        "Content-type": "application/json",
      },
    }
  );

  if (verify.data.status == false) {
    console.log(verify.data);
    return res.status(400).json({
      error: true,
      message:
        "We are having some trouble depositing your funds right now, please try again later",
    });
  }

  if (verify.data.data.status == "success") {
    return res.status(200).json({
      message: "successfully verified payment",
      error: false,
      data: {
        body: JSON.stringify(verify.data),
      },
    });
  } else {
    return res.status(400).send({
      error: true,
      message:
        "We are having some trouble verifying your payment right now, please try again later",
    });
  }
});

router.post("/free_withdrawal", auth, async (req, res) => {
  var curr_date = new Date();
  const payAt = curr_date.setDate(curr_date.getDate() + 3);
  const user = await User.findById(req.user._id).select("-password -__v");

  if (req.body.amount > user.balance) {
    return res
      .status(400)
      .send({ error: true, message: "Insufficient wallet balance" });
  }

  const request = await FreeWithdrawal.create({
    user: req.user._id,
    amount: req.body.amount,
    recipient_code: req.body.recipient_code,
    bankCode: req.body.bankCode,
    accountNumber: req.body.accountNumber,
    bankName: req.body.bankName,
    accountName: req.body.accountName,
    longitude: req.body.longitude,
    latitude: req.body.latitude,
    status: "pending",
    payAt: payAt,
  });

  await User.findByIdAndUpdate(req.user._id, {
    $inc: { balance: -req.body.amount },
  });

  return res.status(200).send({
    error: false,
    message: `${req.body.amount} has been sent to your bank account and would be available before end of the Fifth day`,
    data: request,
  });
});

module.exports = router;
