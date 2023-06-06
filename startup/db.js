const mongoose = require("mongoose");
const Fawn = require("fawn");
const winston = require("winston");

module.exports = function () {
  const db = process.env.db;
  mongoose
    .connect(
      `mongodb+srv://${process.env.mongo_user}:${process.env.mongo_password}@awoofcluster-tetxw.mongodb.net/awoof?retryWrites=true&w=majority`,
      { useNewUrlParser: true, useUnifiedTopology: true }
    )
    .then(() => winston.info(`Connected to live database ...`));

  Fawn.init(mongoose, "pp_fawn");
};

//test Database
//"db": "mongodb+srv://awoof:passworded@awoof.xshqy.mongodb.net/test"

// live db
// `mongodb+srv://${process.env.mongo_user}:${process.env.mongo_password}@awoofcluster-tetxw.mongodb.net/awoof?retryWrites=true&w=majority`,
// { useNewUrlParser: true, useUnifiedTopology: true }
