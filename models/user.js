const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const Joi = require("joi");

mongoose.set("useCreateIndex", true);

const userSchema = new mongoose.Schema({
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
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  phoneNumber: {
    type: String,
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
  balance: {
    type: Number,
    default: 0,
    min: 0,
  },
  isSuspended: {
    type: Boolean,
    default: false
  },
  previous_suspensions: {
    type: Number,
    default: 0,
  },
  suspended_at: {type: Date},
  stars: {
    type: Number,
    min: 0,
    max: 30,
  },
  following: {
    type: Number,
    default: 0,
  },
  followers: {
    type: Number,
    default: 0,
  },
  referralCode: {
    type: String,
  },
  roles: [{ type: "String" }],
  isVerified: { type: Boolean, default: false },
  isActive: { type: Boolean, default: false },
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
  userRef: {
    type: String,
  },
  refCodeUsage: {
    type: Number,
    default: 0,
  },
  usersReffered: [{ type: "String", ref: "User" }],
  giveawaysParticipated: {
    type: Number,
    default: 0,
  },
  giveawaysWon: {
    type: Number,
    default: 0,
  },
  giveawaysDone: {
    type: Number,
    default: 0,
  },
  giveawaysAmountWon: {
    type: Number,
    default: 0,
  },
  signupDate: {
    type: Date,
    default: Date.now,
  },
  isAdmin: {
    type: Boolean,
    default: false,
  },
  isSuperAdmin: {
    type: Boolean,
    default: false,
  },
  isPinSet: {
    type: Boolean,
    default: false,
  },
  isAccountSet: {
    type: Boolean,
    default: false,
  },
  twofaId: {
    type: String,
  },
  image: {
    type: Object,
    default: {},
  },
});

userSchema.methods.generateAuthToken = function () {
  const token = jwt.sign(
    {
      _id: this._id,
      firstName: this.firstName,
      lastName: this.lastName,
      username: this.username,
      email: this.email,
      phoneNumber: this.phoneNumber,
      balance: this.balance,
      userRef: this.userRef,
      twofaId: this.twofaId,
      isAdmin: this.isAdmin,
    },
    process.env.jwtPrivateKey,
    {}
  );
  return token;
};

const User = mongoose.model("User", userSchema);

function validateUser(user) {
  const schema = {
    firstName: Joi.string().min(3).max(255),
    lastName: Joi.string().min(3).max(255),
    username: Joi.string(),
    email: Joi.string().email(),
    password: Joi.string().min(6).max(255),
    newPassword: Joi.string().min(6).max(255),
    referralCode: Joi.string(),
    phoneNumber: Joi.string(),
    dateOfBirth: Joi.string(),
    location: Joi.string(),
    gender: Joi.string(),
    newPin: Joi.string().min(4).max(4),
    oldPin: Joi.string().min(4).max(4),
    balance: Joi.number(),
  };

  return Joi.validate(user, schema);
}

function validateUserUpdate(user) {
  const schema = {
    firstName: Joi.string().min(3).max(255),
    lastName: Joi.string().min(3).max(255),
    username: Joi.string(),
    email: Joi.string().email(),
    phoneNumber: Joi.string(),
    dateOfBirth: Joi.string(),
    location: Joi.string(),
    gender: Joi.string(),
  };
  return Joi.validate(user, schema);
}


module.exports.User = User;
module.exports.validateUser = validateUser;
module.exports.validateUserUpdate = validateUserUpdate;
