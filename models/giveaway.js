const Joi = require("joi");
const mongoose = require("mongoose");

const Giveaway = mongoose.model(
  "Giveaway",
  new mongoose.Schema({
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
    },
    type: {
      type: String,
      enum: ["normal", "star"],
      default: "normal",
    },
    minimumstars: {
      type: Number,
      default: 0,
    },
    amount: {
      type: Number,
    },
    amountPerWinner: {
      type: Number,
    },
    numberOfWinners: {
      type: Number,
    },
    isAnonymous: {
      type: Boolean,
      default: false,
    },
    frequency: {
      type: String,
    },
    message: {
      type: String,
    },
    likeTweet: {
      type: Boolean,
      default: false,
    },
    followTwitter: {
      type: Boolean,
      default: false,
    },
    likeInstagram: {
      type: Boolean,
      default: false,
    },
    followInstagram: {
      type: Boolean,
      default: false,
    },
    likeFacebook: {
      type: Boolean,
      default: false,
    },
    likeTweetLink: {
      type: String,
    },
    followTwitterLink: {
      type: String,
    },
    likeInstagramLink: {
      type: String,
    },
    followInstagramLink: {
      type: String,
    },
    likeFacebookLink: {
      type: String,
    },
    platformOfEngagement: {
      type: String,
    },
    likePostOnFacebook: {
      type: Boolean,
      default: false,
    },
    postLinkOnFacebook: {
      type: String,
    },
    followPageOnFacebook: {
      type: Boolean,
      default: false,
    },
    payment_reference: {
      type: String,
    },
    gateway_response: {
      type: String,
    },
    payment_status: {
      type: String,
    },
    payment_type: {
      type: String,
    },
    giveaway_ref: {
      type: String,
    },
    image: {
      type: Object,
      default: {},
    },
    expiry: {
      type: String,
    },
    hidden: {
      type: Boolean,
      default: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    endAt: {
      type: Date,
    },
    completed: {
      type: Boolean,
      default: false,
    },
    done: {
      type: Boolean,
      default: false,
    },
    manualPaid: {
      type: Boolean,
      default: false,
    },
    completeWinners: {
      type: Boolean,
      default: false,
    },
    winRemain: {
      type: Number,
      default: 0,
    },
  })
);

function validateGiveaway(giveaway) {
  const schema = {
    amount: Joi.number(),
    amountPerWinner: Joi.number(),
    isAnonymous: Joi.boolean(),
    frequency: Joi.string(),
    message: Joi.string(),
    payment_type: Joi.string(),
    likeTweet: Joi.boolean(),
    followTwitter: Joi.boolean(),
    likeInstagram: Joi.boolean(),
    followInstagram: Joi.boolean(),
    likeFacebook: Joi.boolean(),
    likeTweetLink: Joi.string(),
    followTwitterLink: Joi.string(),
    likeInstagramLink: Joi.string(),
    followInstagramLink: Joi.string(),
    likeFacebookLink: Joi.string(),
    expiry: Joi.string(),
    platformOfEngagement: Joi.string(),
    likePostOnFacebook: Joi.boolean(),
    postLinkOnFacebook: Joi.string(),
    followPageOnFacebook: Joi.boolean(),
    payment_reference: Joi.string(),
    payment_status: Joi.string(),
    gateway_response: Joi.string(),
  };

  return Joi.validate(giveaway, schema);
}

module.exports.Giveaway = Giveaway;
module.exports.validateGiveaway = validateGiveaway;
