module.exports = function (req, res, next) {
  if (!process.env.requiresAuth) return next();

  if (!req.user.isAdmin && !req.user.isSuperAdmin)
    return res
      .status(403)
      .send("Access denied, only admins can perform this operation.");

  next();
};
