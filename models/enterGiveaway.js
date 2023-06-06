const Joi = require("joi");
const mongoose = require("mongoose");

const EnterGiveaway = mongoose.model(
  "EnterGiveaway",
  new mongoose.Schema({
    entererID: {
      type: String,
      ref: "User",
    },
    userID: {
      type: String,
      ref: "User",
    },
    giveawayID: {
      type: String,
      ref: "Giveaway",
    },
    amount: {
      type: Number,
    },
    message: {
      type: Number,
    },
    isAnonymous: {
      type: Boolean,
      default: false,
    },
    expiry: {
      type: String,
    },
    createdAt: {
      type: Date,
    },
  })
);

function validateEnterGiveaway(enterGiveaway) {
  const schema = {
    userID: Joi.string(),
    amount: Joi.number(),
    entererID: Joi.string(),
    giveawayID: Joi.string(),
    isAnonymous: Joi.boolean(),
    message: Joi.string(),
    expiry: Joi.string(),
  };

  return Joi.validate(enterGiveaway, schema);
}

module.exports.EnterGiveaway = EnterGiveaway;
module.exports.validateEnterGiveaway = validateEnterGiveaway;
