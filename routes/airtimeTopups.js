const auth = require("../middleware/auth");
const admin = require("../middleware/admin");
const { User } = require("../models/user");
const bcrypt = require("bcryptjs");
const {
  AirtimeTopup,
  validateAirtimeTopup,
} = require("../models/airtimeTopup");

const moment = require("moment");
const Fawn = require("fawn");

const express = require("express");
const router = express.Router();
const uniqid = require("uniqid");

const request = require("request");
const axios = require("axios");

// Get the Airtime Topup history for currently logged-in user
router.get("/me", auth, async (req, res) => {
  const user = await User.findById(req.user._id).select("-password -__v");

  const userAirtimeTopupHistories = await AirtimeTopup.find({
    user: user.email,
  })
    .sort("transactionDate")
    .select("-__v");
  let result = {
    status: "success",
    error: false,
    data: userAirtimeTopupHistories,
  };
  res.send(result);
});

// Get all Airtime Topup History in DB
router.get("/", [auth, admin], async (req, res) => {
  const airtimeTopupHistories = await AirtimeTopup.find()
    .sort("transactionDate")
    .select("-__v");
  let result = { status: "success", error: false, data: airtimeTopupHistories };
  res.send(result);
});

// Get all Airtime Topup history in DB by date
router.get("/data", [auth, admin], async (req, res) => {
  const airtimeTopupHistories = await AirtimeTopup.find().select("-__v");

  // this gives an object with dates as keys
  const groups = airtimeTopupHistories.reduce((groups, topup) => {
    let date = moment(topup.transactionDate).startOf("day").format("LL");

    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push({ amount: topup.amount, date: topup.transactionDate });
    return groups;
  }, {});

  // Edit: to add it in the array format instead
  const groupArrays = Object.keys(groups).map((date) => {
    let total = 0;
    let finalSum = 0;
    let dailyTransaction = [];

    for (am of groups[date]) {
      total = total + am.amount;
      dailyTransaction.push(total);
      finalSum = dailyTransaction.reduce((a, b) => a + b, 0);
      total = 0;
    }

    return {
      date,
      airtimeTopups: finalSum,
    };
  });

  let result = { status: "success", error: false, data: groupArrays };

  res.send(result);
});

//Get Access Token From Reloadly
router.get("/token", auth, async (req, res) => {
  const options = {
    method: "POST",
    url: "https://auth.reloadly.com/oauth/token",
    headers: {
      "content-type": "application/json",
    },
    body: {
      client_id: `${process.env.reloady_client_id}`,
      client_secret: `${process.env.reloadly_client_secret}`,
      grant_type: "client_credentials",
      audience: "https://topups.reloadly.com",
    },
    json: true,
  };

  const getReloadlyAccessToken = (callback) => {
    request(options, function (error, response, body) {
      if (error) {
        return callback(error);
      }

      return callback(body);
    });
  };

  getReloadlyAccessToken(async function (response) {
    if (response.message == "Access Denied")
      return res.send({ error: true, message: response.errorCode });

    let responseData = {
      access_token: response.access_token,
      token_type: response.token_type,
    };
    let result = { message: "success", error: false, data: responseData };
    res.send(result);
  });
});

// Topup a phone number
router.post("/", auth, async (req, res) => {
  const { error } = validateAirtimeTopup(req.body);
  if (error)
    return res
      .status(400)
      .send({ error: true, message: error.details[0].message });

  const user = await User.findById(req.user._id).select("-password -__v");

  const headers = {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${req.body.accessToken}`,
    },
  };

  const result = await axios.post(
    "https://topups.reloadly.com/topups",
    {
      operatorId: req.body.operatorId,
      amount: req.body.amount,
      recipientPhone: {
        countryCode: req.body.recipientPhoneCountryCode,
        number: req.body.recipientPhoneNumber,
      },
    },
    headers
  );

  const response = result.data;

  //if (response.errorCode) return res.send(response.errorCode);

  let topup = new AirtimeTopup({
    recipientPhoneNumber: response.recipientPhone,
    recipientPhoneCountryCode: response.countryCode,
    requestedAmount: response.requestedAmount,
    deliveredAmount: response.deliveredAmount,
    deliveredAmountCurrencyCode: response.deliveredAmountCurrencyCode,
    requestedAmountCurrencyCode: response.requestedAmountCurrencyCode,
    amount: req.body.amount,
    transactionId: response.transactionId,
    operatorTransactionId: response.operatorTransactionId,
    operatorId: response.operatorId,
    operatorName: response.operatorName,
    user: user.email,
  });

  let responseData = {
    recipientPhoneNumber: response.recipientPhone,
    recipientPhoneCountryCode: response.countryCode,
    requestedAmount: response.requestedAmount,
    deliveredAmount: response.deliveredAmount,
    deliveredAmountCurrencyCode: response.deliveredAmountCurrencyCode,
    requestedAmountCurrencyCode: response.requestedAmountCurrencyCode,
    amount: req.body.amount,
    transactionId: response.transactionId,
    operatorTransactionId: response.operatorTransactionId,
    operatorId: response.operatorId,
    operatorName: response.operatorName,
    user: user.email,
  };

  try {
    new Fawn.Task()
      .save("airtimetopups", topup)
      .update(
        "users",
        { _id: user._id },
        {
          $inc: { balance: -req.body.amount },
        }
      )
      .run();
    let result = { status: "success", error: false, data: responseData };
    res.send(result);
  } catch (e) {
    res.status(500).send({
      status: "error",
      error: true,
      message: "Something went wrong.",
      data: e,
    });
  }
});

// AutoDetect Operator using the recipient phone number
router.post("/operators/auto-detect", auth, async (req, res) => {
  const recipientPhone = req.body.recipientPhoneNumber;

  const options = {
    method: "GET",
    url: `https://topups.reloadly.com/operators/auto-detect/phone/${recipientPhone}/countries/NG?suggestedAmountsMap=true&SuggestedAmounts=true`,
    headers: {
      Authorization: `Bearer ${req.body.accessToken}`,
    },
  };

  const getOperatorInfo = (callback) => {
    request(options, function (error, response, body) {
      if (error) {
        return callback(error);
      }

      return callback(body);
    });
  };

  getOperatorInfo(async function (response) {
    const result = await JSON.parse(response);

    let responseData = {
      operatorId: result.operatorId,
      operatorName: result.name,
      bundle: result.bundle,
      data: result.data,
      pin: result.pin,
      supportsLocalAmounts: result.supportsLocalAmounts,
      denominationType: result.denominationType,
      senderCurrencyCode: result.senderCurrencyCode,
      senderCurrencySymbol: result.senderCurrencySymbol,
      destinationCurrencyCode: result.destinationCurrencyCode,
      minAmount: result.minAmount,
      maxAmount: result.maxAmount,
    };

    let rest = { status: "success", error: false, data: responseData };
    res.send(rest);
  });
});

// Get list of Operators on Reloadly
router.get("/countries", auth, async (req, res) => {
  const options = {
    method: "GET",
    url: "https://topups.reloadly.com/countries",
  };

  const callReloadlyCountriesApi = (callback) => {
    request(options, function (error, response, body) {
      if (error) {
        return callback(error);
      }

      return callback(body);
    });
  };

  callReloadlyCountriesApi(async function (response) {
    let result = { status: "success", error: false, data: response };
    res.send(result);
    res.end();
  });
});

// Get list of operators By Country
router.post("/operators/countries", auth, async (req, res) => {
  const options = {
    method: "GET",
    url: `https://topups.reloadly.com/operators/countries/${req.body.countryCode}`,
    headers: {
      Authorization: `Bearer ${req.body.accessToken}`,
    },
  };

  const getOperatorsByCountry = (callback) => {
    request(options, function (error, response, body) {
      if (error) {
        return callback(error);
      }

      return callback(body);
    });
  };

  getOperatorsByCountry(async function (response) {
    if (response.errorCode)
      return res.send({ error: true, message: response.errorCode });
    let result = { status: "success", error: false, data: response };
    res.send(result);
  });
});

module.exports = router;
