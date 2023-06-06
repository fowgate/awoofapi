const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const Joi = require("joi");

mongoose.set("useCreateIndex", true);

const participantSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    giveaway_id: {
      type: String,
      ref: "Giveaway",
    },
    win: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const Participant = mongoose.model("Participant", participantSchema);

module.exports.Participant = Participant;
