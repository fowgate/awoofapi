const mongoose = require("mongoose");

const referralBonusSchema = new mongoose.Schema({
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Admin",
    required: true,
  },
  amount: {
    type: Number,
    default: 0,
  },
  createdAt: { type: Date, required: true, default: Date.now },
});

const ReferralBonus = mongoose.model("ReferralBonus", referralBonusSchema);

module.exports.ReferralBonus = ReferralBonus;
