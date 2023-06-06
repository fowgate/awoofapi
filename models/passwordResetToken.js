const mongoose = require('mongoose');

mongoose.set('useCreateIndex', true);

const passwordResetTokenSchema = new mongoose.Schema({
  _userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User',
  },
  token: { type: String, required: true },
  createdAt: { type: Date, required: true, default: Date.now, expires: 43200 },
});

const PasswordResetToken = mongoose.model(
  'PasswordResetToken',
  passwordResetTokenSchema
);

module.exports.PasswordResetToken = PasswordResetToken;
