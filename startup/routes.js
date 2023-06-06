const express = require("express");
const users = require("../routes/users");
const admins = require("../routes/admins");
const auth = require("../routes/auth");
const accounts = require("../routes/accounts");
const banks = require("../routes/banks");
const bankAccountVerification = require("../routes/accountsVerification");
const transfers = require("../routes/transfers");
const walletTopupsByCard = require("../routes/walletTopupsByCard");
const airtimeTopups = require("../routes/airtimeTopups");
const giveaways = require("../routes/giveaways");
const giveaway_types = require("../routes/giveaway-types");
const giveaway_conditions = require("../routes/giveaway-conditions");
const socialAccount = require("../routes/socialAccount");
const getfirebaseToken = require("../routes/firebaseToken");

const error = require("../middleware/error");

module.exports = function (app) {
  app.use(express.json());

  app.use("/v1/users", users);
  app.use("/v1/admins", admins);
  app.use("/v1/auth", auth);
  app.use("/v1/accounts", accounts);
  app.use("/v1/banks", banks);
  app.use("/v1/accounts/verify", bankAccountVerification);
  app.use("/v1/transfers", transfers);
  app.use("/v1/wallet-topups", walletTopupsByCard);
  app.use("/v1/airtime-topups", airtimeTopups);
  app.use("/v1/giveaways", giveaways);
  app.use("/v1/giveaway-types", giveaway_types);
  app.use("/v1/giveaway-conditions", giveaway_conditions);
  app.use("/v1/socialAccount", socialAccount);
  app.use("/v1/firebase", getfirebaseToken);

  // Express Error Middleware function is passed after all the existing middleware functions
  app.use(error);
};
