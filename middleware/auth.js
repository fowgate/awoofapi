const jwt = require("jsonwebtoken");

module.exports = function (req, res, next) {
  if (!process.env.requiresAuth) return next();

  const token = req.header("x-auth-token");
  if (!token) return res.status(401).send("Access denied! No token provided");

  try {
    const decodedPayload = jwt.verify(token, process.env.jwtPrivateKey);
    req.user = decodedPayload;
    next();
  } catch (ex) {
    res.status(400).send("Invalid token.");
  }
};
