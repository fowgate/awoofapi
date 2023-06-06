const winston = require("winston");
const express = require("express");
const http = require("http");
const app = express();
var cors = require("cors");
const dotenv = require("dotenv");

app.use("/uploads", express.static("uploads"));

var Fingerprint = require("express-fingerprint");

dotenv.config({
  path: ".env",
});

const auth = require("./middleware/auth");

app.use(
  Fingerprint({
    parameters: [
      // Defaults
      Fingerprint.useragent,
      Fingerprint.acceptHeaders,
      Fingerprint.geoip,
    ],
  })
);
const corsOptions ={
  origin:'*', 
  credentials:true,            //access-control-allow-credentials:true
  optionSuccessStatus:200,
}

app.use(cors(corsOptions));

app.use((req, res, next) => {
  const allowedOrigins = ['https://effortless-manatee-0697fc.netlify.app', 'http://localhost:3000'];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
       res.setHeader('Access-Control-Allow-Origin', origin);
  }
  //res.header('Access-Control-Allow-Origin', 'http://127.0.0.1:8020');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', true);
  return next();
});
require("./startup/logging")();
require("./startup/routes")(app);
require("./startup/db")();
require("./startup/cron");

require("./startup/config")();
require("./startup/validation")();
require("./startup/prod")(app);

app.get("/", auth, (req, res) => {
  res.send("Awoof server is live...");
});

const serverr = http.createServer(app);

const port = process.env.PORT || 10000;
const server = serverr.listen(port, () =>
  winston.info(`Listening on port ${port}...`)
);

module.exports = server;
