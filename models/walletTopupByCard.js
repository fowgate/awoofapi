const mongoose = require('mongoose');
const Joi = require('joi');

const WalletTopup = mongoose.model(
  'WalletTopup',
  new mongoose.Schema({
    user_email: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
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
    order_ref: {
      type: String,
    },
    transaction_date: {
      type: Date,
      default: Date.now,
    },
  })
);

function validateWalletTopup(topup) {
  const schema = {
    amount: Joi.number(),
    payment_reference: Joi.string(),
    payment_status: Joi.string(),
    gateway_response: Joi.string(),
  };

  return Joi.validate(topup, schema);
}

module.exports.WalletTopup = WalletTopup;
module.exports.validateWalletTopup = validateWalletTopup;
