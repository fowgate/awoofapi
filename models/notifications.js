const mongoose = require("mongoose");

mongoose.set("useCreateIndex", true);

const notificationsSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  message: { type: String, required: true },
  seen: { type: Boolean, required: true, default: false },
  type: { type: String },
  giveaway: { type: mongoose.Schema.Types.ObjectId, ref: "Giveaway" },
  createdAt: { type: Date, required: true, default: Date.now },
});

const Notifications = mongoose.model("Notifications", notificationsSchema);

module.exports.Notifications = Notifications;
