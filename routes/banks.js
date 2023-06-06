const auth = require("../middleware/auth");

const express = require("express");
const router = express.Router();

const request = require("request");
const config = require("config");

router.get("/", auth, async (req, res) => {
  var options = {
    method: "GET",
    url: "https://api.paystack.co/bank",
    headers: {
      authorization: `Bearer ${process.env.paystack}`,
    },
  };

  const callBanksApi = (callback) => {
    request(options, function (error, response, body) {
      if (error) {
        return callback(error);
      }

      return callback(body);
    });
  };

  callBanksApi(async function (response) {
    let result = { status: "success", error: false, data: response };
    res.send(result);
    res.end();
  });
});

module.exports = router;
