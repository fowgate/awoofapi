const dayjs = require("dayjs");
const bcrypt = require("bcryptjs");

const getCurrentTimeStamp = (day = 0) => {
  let old_date = new Date();

  let date = new Date(old_date.setDate(old_date.getDate() + day));

  return dayjs(date, "YYYY-MM-DD HH:mm:ss.SSS").toDate();
};

const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  const hashed_password = await bcrypt.hash(password, salt);
  return hashed_password;
};

const verifyPassword = async (hashed_password, password) => {
  const verify_password = await bcrypt.compare(password, hashed_password);
  return verify_password;
};

module.exports = {
  getCurrentTimeStamp,
  hashPassword,
  verifyPassword,
};
