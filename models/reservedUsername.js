const mongoose = require("mongoose");

const ReservedUsername = mongoose.model(
  "ReservedUsername",
  new mongoose.Schema({
    username: {
      type: String,
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },
  })
);

module.exports.ReservedUsername = ReservedUsername;
