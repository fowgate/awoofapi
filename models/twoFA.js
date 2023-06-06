const mongoose = require("mongoose");

const TwoFA = mongoose.model(
  "TwoFA",
  new mongoose.Schema(
    {
      phone: {
        type: String,
      },
      code: {
        type: String,
      },
    },
    {
      timestamps: true,
    }
  )
);

module.exports.TwoFA = TwoFA;
