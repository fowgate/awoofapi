const mongoose = require("mongoose");

const OutsideWinners = mongoose.model(
  "OutsideWinners",
  new mongoose.Schema({
    giveaway_id: {
      type: String,
      ref: "Giveaway",
    },
    winners: {
      type: Number,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  })
);

module.exports.OutsideWinners = OutsideWinners;
