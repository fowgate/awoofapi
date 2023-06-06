const mongoose = require('mongoose');
const Joi = require('joi');

const SocialAccount = mongoose.model(
  'SocialAccount',
  new mongoose.Schema({
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    twitter: {
      type: String,
    },
    facebook: {
      type: String,
    },
    instagram: {
      type: String,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  })
);

function validateAccount(socialAccount) {
  const schema = {
    twitter: Joi.string(),
    facebook: Joi.string(),
    instagram: Joi.string()
  };

  return Joi.validate(socialAccount, schema);
}

module.exports.SocialAccount = SocialAccount;
module.exports.validateAccount = validateAccount;
