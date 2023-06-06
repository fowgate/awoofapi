const Joi = require('joi');
const mongoose = require('mongoose');

const AirtimeTopup = mongoose.model(
  'AirtimeTopup',
  new mongoose.Schema({
    accessToken: {
      type: String,
    },
    operatorId: {
      type: Number,
    },
    amount: {
      type: Number,
      required: true,
    },
    recipientPhoneNumber: {
      type: String,
    },
    recipientPhoneCountryCode: {
      type: String,
    },
    transactionId: {
      type: String,
    },
    operatorTransactionId: {
      type: String,
    },
    operatorName: {
      type: String,
    },
    requestedAmount: {
      type: String,
    },
    deliveredAmount: {
      type: String,
    },
    requestedAmountCurrencyCode: {
      type: String,
    },
    deliveredAmountCurrencyCode: {
      type: String,
    },
    transactionDate: {
      type: Date,
      default: Date.now,
    },
    user: {
      type: String,
      required: true,
    },
  })
);

function validateAirtimeTopup(topup) {
  const schema = {
    operatorId: Joi.number(),
    amount: Joi.number().required(),
    recipientPhoneNumber: Joi.string(),
    recipientPhoneCountryCode: Joi.string(),
    accessToken: Joi.string(),
  };

  return Joi.validate(topup, schema);
}

module.exports.AirtimeTopup = AirtimeTopup;
module.exports.validateAirtimeTopup = validateAirtimeTopup;
