const mongoose = require('mongoose');
const Joi = require('joi');

const giveawayConditionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const GiveawayCondition = mongoose.model(
  'GiveawayCondition',
  giveawayConditionSchema
);

function validateGiveawayCondition(giveawayCondition) {
  const schema = {
    name: Joi.string().required(),
  };

  return Joi.validate(giveawayCondition, schema);
}

module.exports.GiveawayCondition = GiveawayCondition;
module.exports.giveawayConditionSchema = giveawayConditionSchema;
module.exports.validateGiveawayCondition = validateGiveawayCondition;
