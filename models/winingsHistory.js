const mongoose = require("mongoose");

const WiningsHistory = mongoose.model(
  "WiningsHistory",
  new mongoose.Schema({
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    giveaway_id: {
      type: String,
      ref: "Giveaway",
    },
    naration: {
      type: String,
      default: "giveaway won",
    },
    amount: {
      type: Number,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  })
);

module.exports.WiningsHistory = WiningsHistory;
