const auth = require("../middleware/auth");
const {
  validateBankAccountVerification,
} = require("../models/accountVerification");

const express = require("express");
const router = express.Router();

const request = require("request");

router.post("/", auth, async (req, res) => {
  const { error } = validateBankAccountVerification(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  var options = {
    method: "GET",
    url: "https://api.paystack.co/bank/resolve",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.paystack}`,
    },
    qs: {
      account_number: req.body.accountNumber,
      bank_code: req.body.bankCode,
    },
    json: true,
  };

  const callBankAccountVerificationApi = (callback) => {
    request(options, function (error, response, body) {
      if (error) {
        return callback(error);
      }

      return callback(body);
    });
  };

  callBankAccountVerificationApi(async function (response) {
    //if (response.status !== 200) return res.send(response.message);
    let result = { status: "success", error: false, data: response };
    res.send(result);
  });
});

module.exports = router;
