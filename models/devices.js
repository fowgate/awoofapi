const mongoose = require("mongoose");

const { Schema } = mongoose;

const devicesSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: "User" },
  token: { type: String },
  device_type: { type: String },
});

const Device = mongoose.model("Devices", devicesSchema);

module.exports.Device = Device;
