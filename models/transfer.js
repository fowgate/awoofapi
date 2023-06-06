const Joi = require("joi");
const mongoose = require("mongoose");

const Transfer = mongoose.model(
  "Transfer",
  new mongoose.Schema({
    amount: {
      type: Number,
      required: true,
    },
    phoneNumber: {
      type: String,
      minlength: 11,
      maxlength: 11,
    },
    narration: {
      type: String,
    },
    bankName: {
      type: String,
    },
    bankCode: {
      type: String,
    },
    accountNumber: {
      type: String,
    },
    accountName: {
      type: String,
    },
    order_ref: {
      type: String,
    },
    transaction_ref: {
      type: String,
    },
    transaction_pin: {
      type: String,
    },
    transaction_message: {
      type: String,
    },
    transaction_date: {
      type: Date,
      default: Date.now,
    },
    user: {
      type: String,
      required: true,
    },
    recipient_code: {
      type: String,
    },
    longitude: {
      type: String,
    },
    latitude: {
      type: String,
    },
  })
);

function validateTransfer(transfer) {
  const schema = {
    phoneNumber: Joi.string().min(11).max(11),
    narration: Joi.string(),
    amount: Joi.number(),
    bankCode: Joi.string(),
    accountNumber: Joi.string(),
    bankName: Joi.string(),
    accountName: Joi.string(),
    transaction_pin: Joi.string(),
    recipient_code: Joi.string(),
  };

  return Joi.validate(transfer, schema);
}

module.exports.Transfer = Transfer;
module.exports.validateTransfer = validateTransfer;
