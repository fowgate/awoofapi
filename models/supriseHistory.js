const mongoose = require("mongoose");

const SupriseHistory = mongoose.model(
  "SupriseHistory",
  new mongoose.Schema({
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    naration: {
      type: String,
      default: "Awoof Surprise",
    },
    amount: {
      type: Number,
    },
    type: {
      type: String,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  })
);

module.exports.SupriseHistory = SupriseHistory;
