const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

mongoose.set("useCreateIndex", true);

const adminSchema = new mongoose.Schema({
  firstName: {
    type: String,
    minlength: 3,
    maxlength: 255,
  },
  lastName: {
    type: String,
    minlength: 3,
    maxlength: 255,
  },
  username: {
    type: String,
    default: "Awoof Admin",
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  phoneNumber: {
    type: String,
    minlength: 11,
    maxlength: 11,
  },
  gender: {
    type: String,
  },
  location: {
    type: String,
  },
  dateOfBirth: {
    type: String,
  },
  role: { type: "String" },
  isVerified: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  passwordResetToken: String,
  passwordResetExpires: Date,
  password: {
    type: String,
    required: true,
    minlength: 6,
    maxlength: 255,
  },
  newPassword: {
    type: String,
    minlength: 6,
    maxlength: 255,
  },
  newPin: {
    type: String,
  },
  oldPin: {
    type: String,
  },
  securityQuestion: {
    type: String,
  },
  securityAnswer: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  createdBy: {
    type: String,
  },
  isAdmin: {
    type: Boolean,
    default: false,
  },
  isSuperAdmin: {
    type: Boolean,
    default: false,
  },
  image: {
    type: Object,
    default: {},
  },
});

adminSchema.methods.generateAuthToken = function () {
  const token = jwt.sign(
    {
      _id: this._id,
      firstName: this.firstName,
      lastName: this.lastName,
      email: this.email,
      phoneNumber: this.phoneNumber,
      isAdmin: this.isAdmin,
      isSuperAdmin: this.isSuperAdmin,
      isActive: this.isActive,
    },
    process.env.jwtPrivateKey,
    {}
  );
  return token;
};

const Admin = mongoose.model("Admin", adminSchema);

module.exports.Admin = Admin;
