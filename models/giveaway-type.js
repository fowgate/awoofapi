const mongoose = require('mongoose');
const Joi = require('joi');

const giveawayTypeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  // expireAt
});

const GiveawayType = mongoose.model('GiveawayType', giveawayTypeSchema);

function validateGiveawayType(giveawayType) {
  const schema = {
    name: Joi.string().required(),
  };

  return Joi.validate(giveawayType, schema);
}

module.exports.GiveawayType = GiveawayType;
module.exports.giveawayTypeSchema = giveawayTypeSchema;
module.exports.validateGiveawayType = validateGiveawayType;
