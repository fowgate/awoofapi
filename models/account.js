const mongoose = require('mongoose');
const Joi = require('joi');

const Account = mongoose.model(
  'Account',
  new mongoose.Schema({
    accountName: {
      type: String,
    },
    accountNumber: {
      type: String,
    },
    bankName: {
      type: String,
    },
    bankCode: {
      type: String,
    },
    user: {
      type: String,
    },
    newPin: {
      type: String,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  })
);

function validateAccount(account) {
  const schema = {
    accountName: Joi.string().required(),
    accountNumber: Joi.string().required(),
    bankName: Joi.string().required(),
    bankCode: Joi.string().required(),
    newPin: Joi.string().min(4).max(4),
  };

  return Joi.validate(account, schema);
}

module.exports.Account = Account;
module.exports.validateAccount = validateAccount;
