const mongoose = require("mongoose");

const FreeWithdrawal = mongoose.model(
  "FreeWithdrawal",
  new mongoose.Schema({
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    amount: {
      type: Number,
    },
    recipient_code: {
      type: String,
    },
    accountName: {
      type: String,
    },
    accountNumber: {
      type: String,
    },
    bankName: {
      type: String,
    },
    bankCode: {
      type: String,
    },
    paid: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      Default: "completed",
    },
    payAt: {
      type: Date,
    },
    longitude: {
      type: String,
    },
    latitude: {
      type: String,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  })
);

module.exports.FreeWithdrawal = FreeWithdrawal;
