const Joi = require('joi');
const mongoose = require('mongoose');

const BankAccountVerification = mongoose.model(
  'BankAccountVerification',
  new mongoose.Schema({
    accountNumber: {
      type: String,
      required: true,
    },
    bankCode: {
      type: String,
      required: true,
    },
  })
);

function validateBankAccountVerification(accountVerification) {
  const schema = {
    accountNumber: Joi.string().min(10).max(10).required(),
    bankCode: Joi.string().required(),
  };

  return Joi.validate(accountVerification, schema);
}

module.exports.BankAccountVerification = BankAccountVerification;
module.exports.validateBankAccountVerification = validateBankAccountVerification;
