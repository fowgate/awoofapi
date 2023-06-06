//middlewares
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");
const super_admin = require("../middleware/superAdmin");
const validateObjectId = require("../middleware/validateObjectId");

//models
const { Admin } = require("../models/admin");
const { User, validateUser } = require("../models/user");
const { Giveaway } = require("../models/giveaway");
const { Participant } = require("../models/participants");
const { Token } = require("../models/token");
const { PasswordResetToken } = require("../models/passwordResetToken");
const { Notifications } = require("../models/notifications");
const { ReferralBonus } = require("../models/referral-bonus");
const { WalletTopup } = require("../models/walletTopupByCard");
const { Transfer } = require("../models/transfer");
const { WiningsHistory } = require("../models/winingsHistory");
const { AirtimeTopup } = require("../models/airtimeTopup");
const { FreeWithdrawal } = require("../models/freeWithdrawal");
const { PendingTransfer } = require("../models/PendingTransfer");

const {
  sendGeneralNotification,
  sendNotification,
  sendSurpriseNotification,
  sendNotificationAdmin,
} = require("../Helpers/sendFirebaseNotification");

//plugins
const uniqid = require("uniqid");
const util = require("util");
const mongoose = require("mongoose");
const _ = require("lodash");
const moment = require("moment");
const bcrypt = require("bcryptjs");
const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const uniqueRandom = require("unique-random");
const random = uniqueRandom(0, 10);
const { celebrate, Joi } = require("celebrate");
const Helpers = require("../Helpers/helpers");
const Fawn = require("fawn");

//sendgrid
const sgMail = require("@sendgrid/mail");
const sendgrid_key = process.env.sendgrid;
sgMail.setApiKey(sendgrid_key);

mongoose.set("useFindAndModify", false);

// Image Upload things
const aws = require("aws-sdk");
const multer = require("multer");
const multerS3 = require("multer-s3");
const { ReservedUsername } = require("../models/reservedUsername");
const { OutsideWinners } = require("../models/outsideWinners");
const { SupriseHistory } = require("../models/supriseHistory");
const { SocialAccount } = require("../models/socialAccount");
const { ObjectId } = require("mongodb");

aws.config.update({
  secretAccessKey: process.env.aws_secret_key,
  accessKeyId: process.env.aws_access_key,
  region: "us-east-1",
});

const s3 = new aws.S3();

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === "image/jpeg" ||
    file.mimetype === "image/png" ||
    file.mimetype === "image/jpg" ||
    file.mimetype === "application/pdf"
  ) {
    cb(null, true);
  } else {
    cb(new Error("Only jpeg/png/jpg/pdf are allowed!"), false);
  }
};

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./uploads/users/");
  },
  filename: function (req, file, cb) {
    cb(null, new Date().toISOString() + file.originalname);
  },
});

const upload = multer({
  storage: multerS3({
    acl: "public-read",
    s3: s3,
    bucket: "awoof-users",
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
      cb(null, Date.now().toString());
    },
  }),
  limits: { fileSize: 1024 * 1024 * 5 },
  //fileFilter: fileFilter,
});

// get all users in the data base

// Get all users in DB; all user endpoint for Admin view
router.get("/get_all_users", [auth, admin], async (req, res) => {
  const users = await User.find().sort("signupDate").select("-__v -password");
  let result = { status: "success", error: false, data: users };
  res.send(result);
});

// Get all transfer requests
router.get("/transfer_requests", [auth, admin], async (req, res) => {
  var jointArray=[]
  const pending= await PendingTransfer.find().sort("signupDate");
  const freePending= await FreeWithdrawal.find().sort("signupDate"); 
  for(one of pending){
    const user= await User.findById(one.user).select("-__v -password"); 
    jointArray= [...jointArray, 
      {transfer: one, user: user, type: 'Instant'}
    ]
  }
  for(one of freePending){
    const user= await User.findById(one.user).select("-__v -password"); 
    jointArray= [...jointArray, 
      {transfer: one, user: user, type: 'Standard'}
    ]
  }
  let result = { status: "success", error: false, data: jointArray };
  res.send(result);
});

// Get one transfer request
router.get("/get_transfer_request/:id", [auth, admin], async (req, res) => {
  const pending= await PendingTransfer.findById(req.params.id);
  const user= await User.findById(pending.user).select("-__v -password");
  const jointObject= {
    transfer: pending,
    user: user
  }
  let result = { status: "success", error: false, data: jointObject };
  res.send(result);
});

//confirm transfer for instant withdrawal
router.get("/confirm_transfer_request/:id", [auth, admin], async (req, res) => {
  
  const updatedTransfer = await PendingTransfer.findByIdAndUpdate(
    req.params.id,
    {
      $set: {
        pending: false,
      },
    },
    { new: true }
  );
  let result = { status: "success", error: false, data: updatedTransfer };
  res.send(result);
});

//confirm transfer for free withdrawal
router.get("/confirm_transfer_request_free/:id", [auth, admin], async (req, res) => {
  
  const updatedTransfer = await FreeWithdrawal.findByIdAndUpdate(
    req.params.id,
    {
      $set: {
        pending: false,
        paid: true
      },
    },
    { new: true }
  );
  let result = { status: "success", error: false, data: updatedTransfer };
  res.send(result);
});


// Delete one transfer request
router.get("/delete_transfer_request/:id", [auth, admin], async (req, res) => {
  const deleted= await PendingTransfer.deleteOne({_id: req.params.id});
  let result = { status: "success", error: false, data: deleted };
  res.send(result);
});

// Get all admins in DB;
router.get("/get_all_admins", [auth, admin], async (req, res) => {
  const admins = await Admin.find().sort("signupDate").select("-__v -password");
  let result = { status: "success", error: false, data: admins };
  res.send(result);
});

// Get all signup total in DB by date
router.get("/data", [auth, admin], async (req, res) => {
  const signupHistories = await User.find().select("-__v -password");

  // this gives an object with dates as keys
  const groups = signupHistories.reduce((groups, user) => {
    let date = moment(user.signupDate).startOf("day").format("LL");
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push({ date: user.signupDate });
    return groups;
  }, {});

  // Edit: to add it in the array format instead
  const groupArrays = Object.keys(groups).map((date) => {
    let total = 0;
    let finalSum = 0;
    let dailySignup = [];

    for (am of groups[date]) {
      total = total + 1;
      dailySignup.push(total);
      finalSum = dailySignup.reduce((a, b) => a + b, 0);
      total = 0;
    }

    return {
      date,
      usersCount: finalSum,
    };
  });

  let result = { status: "success", error: false, data: groupArrays };
  res.send(result);
});

// Get the currently logged-in admin; logged-in admin endpoint
router.get("/me", auth, async (req, res) => {
  const admin = await Admin.findById(req.admin._id).select("-password -__v");

  let result = { status: "success", error: false, data: admin };
  res.send(result);
});

// Create a new admin
router.post(
  "/create_admin",
  [auth,super_admin],
  celebrate({
    body: Joi.object({
      firstName: Joi.string().required(),
      lastName: Joi.string().required(),
      email: Joi.string().required().email(),
      phoneNumber: Joi.string().required(),
      role: Joi.string().required(),
      username: Joi.string().required(),
    }),
  }),
  async (req, res) => {
    req.body.isSuperAdmin = req.body.role == "super_admin" ? true : false;
    req.body.isAdmin = req.body.role == "admin" ? true : false;









    try {
      //generate an initial password for the admin
      const initial_password = Math.floor(100000 + Math.random() * 900000);
      const password = await Helpers.hashPassword(initial_password.toString());
      console.log(initial_password)

      //email and phone validation
      let emailCheck = await Admin.findOne({ email: req.body.email });
      if (emailCheck)
        return res.status(400).send({
          error: true,
          message:
            "Admin exists with this email exists, please pick a different email",
        });
      let phone = await Admin.findOne({ phoneNumber: req.body.phoneNumber });
      if (phone)
        return res.status(400).send({
          error: true,
          message: "Phone number exists, please pick a different phone number",
        });

      let isAdmin = true;
      let isSuperAdmin = false;

      if (req.body.role == "super_admin") {
        isAdmin = false;
        isSuperAdmin = true;
      }

      //   create a new admin
      const admin = new Admin({
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email,
        phoneNumber: req.body.phoneNumber,
        isAdmin: isAdmin,
        isSuperAdmin: isSuperAdmin,
        password: password,
        role: req.body.role,
        username: req.body.username,
      });


      await admin.save();

      let msg = "Admin successfully created,";
      console.log("Admin successfully created,")

      //send a mail of the password to the new admin
      var transporter = await nodemailer.createTransport({
        service: "SendGrid",
        auth: {
          user: "apikey",
          pass: process.env.sendgrid,
        },
      });
      var mailOptions = {
        from: "hello@awoofapp.com", // @awoofapp.com => please check this
        name: "Awoof Admin",
        to: admin.email,
        subject: "Admin Password",
        text:
          `Hello ${admin.firstName},\n\n` +
          `Your Awoof account has been successfully created. Sign in to your account Kindly login to your account using the password - ${initial_password}. If you have any questions you can reply to this email at support@awoofapp.com. if you believe this email was not for you, kindly disregard this email.`,
      };
      transporter.sendMail(mailOptions, function (err) {
        if (err) {
          msg += err.message;
        } else {
          msg += "An email has been sent to " + admin.email + ".";
        }
      });

      return res.status(200).send({
        error: false,
        message: msg,
        data: admin,
      });
    } catch (e) {
      console.log(e);
      return res.status(500).send({
        error: false,
        message: "Admin Could not be created",
      });
    }
  }
);

//toggle admin status

router.put("/toggle_admin/:id", [auth, super_admin], async (req, res) => {
  try {
    let admin = await Admin.findOne({ _id: req.params.id });

    status = admin.isActive ? false : true;

    const new_admin = await Admin.findByIdAndUpdate(req.params.id, {
      $set: {
        isActive: status,
      },
    });

    return res.send({
      status: "success",
      error: false,
      message: "Admin status successfully toggled",
    });
  } catch (e) {
    console.log(e);
    return res.send({
      status: "failed",
      error: true,
      message: "Admin status could not toggled",
    });
  }
});

// user forget-password endpoint
router.post("/forget-password", async (req, res) => {
  if (!req.body.email)
    return res.status(400).send({ error: true, message: "Email is required" });

  let admin = await Admin.findOne({ email: req.body.email });
  if (!admin)
    return res
      .status(400)
      .send({ error: true, message: "This Email does not exist on Awoof" });

  let randomStringToken = "";
  for (i = 0; i < 4; i++) {
    randomStringToken += Math.floor(Math.random() * 9 + 1);
  }

  var token = new PasswordResetToken({
    _adminId: admin._id,
    token: randomStringToken,
  });
  token.save(function (err) {
    if (err) {
      return res.status(500).send({ msg: err.message });
    }

    // Send the email
    var transporter = nodemailer.createTransport({
      service: "SendGrid",
      auth: {
        admin: "apikey",
        pass: process.env.sendgrid,
      },
    });
    var mailOptions = {
      from: {
        email: "support@awoofapp.com",
        name: "Awoof App",
      }, // awoof
      to: admin.email,
      subject: "Password Reset Link",
      text:
        `Hello ${admin.firstName},\n\n` +
        "You have just requested that your password be reset. Kindly reset by entering " +
        token.token +
        " in the application when prompted" +
        "\n",
    };
    transporter.sendMail(mailOptions, function (err) {
      if (err) {
        return res.status(500).send({ msg: err.message, error: true });
      }
      res.status(200).send({
        status: 200,
        error: false,
        message: "A verification email has been sent to " + admin.email + ".",
      });
    });
  });
});

/************* Begin Reset Password Endpoint ***********/
router.post("/reset-password", async (req, res) => {
  if (!req.body.email)
    return res
      .status(400)
      .send({ error: true, message: "Ensure to set a new password" });
  if (!req.body.password)
    return res.status(400).send({ error: true, message: "Token is required" });
  if (!req.body.token)
    return res.status(400).send({ error: true, message: "Token is required" });

  const salt = await bcrypt.genSalt(10);
  const userNewPassword = await bcrypt.hash(req.body.password, salt);

  // Find a matching token
  PasswordResetToken.findOne({ token: req.body.token }, function (err, token) {
    if (!token)
      return res.status(400).send({
        status: 400,
        error: true,
        message:
          "We were unable to find a valid token. Your token may have expired.",
      });

    // If we found a token, find a matching admin
    Admin.findOne(
      { _id: token._adminId, email: req.body.email },
      function (err, admin) {
        if (!admin)
          return res.status(400).send({
            error: true,
            message:
              "We were unable to find a admin that matches this particular request.",
          });

        // Update admin password and save the admin update
        admin.password = adminNewPassword;
        admin.save(function (err) {
          if (err) {
            return res.status(400).send({ error: true, message: err.message });
          }
          res.status(200).send({
            status: 200,
            error: false,
            message: "Password Reset Successful",
          });
        });
      }
    );
  });
});
/************* End of Reset Password Endpoint **********/

// admin update password endpoint
router.put("/password", [auth, admin], async (req, res) => {
  if (!req.body.password)
    return res
      .status(400)
      .send({ error: true, message: "Old Password is required" });
  if (!req.body.newPassword)
    return res
      .status(400)
      .send({ error: true, message: "New Password is required" });

  // const { error } = validateUser(req.body);
  // if (error)
  //   return res
  //     .status(400)
  //     .send({ error: true, message: error.details[0].message });

  const admin = await Admin.findById(req.user._id);
  const validPassword = await bcrypt.compare(req.body.password, admin.password);

  if (!validPassword)
    return res
      .status(400)
      .send({ error: true, message: "Old Password doesn't match" });

  const salt = await bcrypt.genSalt(10);

  const updatedAdmin = await Admin.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        password: await bcrypt.hash(req.body.newPassword, salt),
      },
    },
    { new: true }
  );

  if (!updatedAdmin)
    return res.status(404).send({
      error: true,
      message: "The admin with the given ID was not found.",
    });

  res
    .status(200)
    .send({ error: false, message: "Password Updated Successfully :)" });
});

// (delete, not needed)
// router.put("/set-admin", async (req, res) => {
//   let user = await User.findOne({ email: req.body.email });
//   if (!user)
//     return res.status(400).send({ error: true, message: "user doesn't exist" });

//   let up = await User.findOneAndUpdate(
//     {
//       email: req.body.email,
//     },
//     {
//       isAdmin: true,
//     }
//   );

//   return res.status(200).send({ error: false, data: up });
// });

// Fund user wallet: This action is only allowed to be performed by Super Admin
router.put(
  "/fund/:id",
  [auth, super_admin, validateObjectId],
  async (req, res) => {
    const { error } = validateUser(req.body);
    if (error)
      return res
        .status(400)
        .send({ error: true, message: error.details[0].message });

    const user = await User.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          balance: req.body.balance,
        },
      },
      { new: true }
    );

    if (!user)
      return res.status(404).send({
        error: true,
        message: "The user with the given ID was not found.",
      });

    res.send(_.pick(user, ["_id", "phoneNumber", "email", "balance"]));
  }
);

// Admin Priviledge (delete not needed)
// router.put(
//   "/is-admin/:id",
//   [auth, admin, validateObjectId],
//   async (req, res) => {
//     const user = await User.findByIdAndUpdate(
//       req.params.id,
//       {
//         $set: {
//           isAdmin: req.body.isAdmin,
//         },
//       },
//       { new: true }
//     );

//     if (!user)
//       return res.status(404).send("The user with the given ID was not found.");

//     res.send({
//       error: false,
//       data: _.pick(user, [
//         "_id",
//         "phoneNumber",
//         "email",
//         "fullName",
//         "isAdmin",
//       ]),
//     });
//   }
// );

// Get user by email
router.get("/get_by_email/:email", [auth, admin], async (req, res) => {
  const user = await User.findOne({ email: req.params.email });

  let result = { status: "success", error: false, data: user };
  res.send(result);
});

//Get all giveaways
router.get("/get_all_users", [auth, admin], async (req, res) => {
  const users = await User.find().sort("signupDate").select("-__v -password");
  let result = { status: "success", error: false, data: users };
  res.send(result);
});

// delete user endpoint (change to disable user instead)
router.delete("/:id", [auth, admin, validateObjectId], async (req, res) => {
  const user = await User.findByIdAndRemove(req.params.id);

  if (!user)
    return res.status(404).send({
      error: true,
      message: "The user with the given ID was not found.",
    });
  let result = { status: "success", error: false, data: user };
  res.send(result);
  res.send(user);
});

// Dashboard parameters
router.get("/dashboard_params", [auth, admin], async (req, res) => {
  try {
    dashboard_params = {};

    //amount processed
    const wallet_top_ups = await WalletTopup.aggregate([
      {
        $match: {
          payment_status: "success",
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
        },
      },
    ]);
    const transfers = await Transfer.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
        },
      },
    ]);
    const airtime = await AirtimeTopup.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
        },
      },
    ]);

    let amount_processed =
      (wallet_top_ups.length ? wallet_top_ups[0].total : 0) +
      (transfers.length ? transfers[0].total : 0) +
      (airtime.length ? airtime[0].total : 0);

    dashboard_params.amount_processed = amount_processed;

    //bills payment
    //should be data and airtime top up
    dashboard_params.bills_payment = airtime.length ? airtime[0].total : 0;

    //total givers
    const total_giveaways = await Giveaway.distinct("user").exec(function (
      err,
      user_ids
    ) {
      dashboard_params.givers = user_ids.length;
    });

    // total users
    const total_givers = await User.distinct("_id").exec(function (
      err,
      user_ids
    ) {
      dashboard_params.awoofwers = user_ids.length;
    });

    // current giveaways
    let current_giveaways = await Giveaway.aggregate([
      {
        $match: {
          endAt: {
            $gte: new Date(),
          },
        },
      },
      {
        $count: "current_giveaway",
      },
    ]);

    dashboard_params.current_giveaways = current_giveaways.length
      ? current_giveaways[0].current_giveaway
      : 0;

    //completed giveaways
    const completed_giveaways = await Giveaway.aggregate([
      {
        $match: {
          endAt: {
            $lte: new Date(),
          },
        },
      },
      {
        $count: "completed_giveaways",
      },
    ]);
    dashboard_params.completed_giveaways = completed_giveaways.length
      ? completed_giveaways[0].completed_giveaways
      : 0;

    //winners
    const winners = await Giveaway.aggregate([
      {
        $match: {
          endAt: {
            $lte: new Date(),
          },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$numberOfWinners" },
        },
      },
    ]);

    //winners outside
    let outsideWinners = await OutsideWinners.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: "$winners" },
        },
      },
    ]);

    dashboard_params.winners = winners.length ? winners[0].total : 0;

    const new_outsideWinners = outsideWinners.length
      ? outsideWinners[0].total
      : 0;

    dashboard_params.winners += new_outsideWinners;

    // star giveaway
    const star_giveaways = await Giveaway.aggregate([
      {
        $match: {
          type: "star",
        },
      },
      {
        $count: "star_giveaways",
      },
    ]);
    dashboard_params.star_giveaways = star_giveaways.length
      ? star_giveaways[0].star_giveaways
      : 0;

    return res.status(200).send({
      status: "success",
      error: false,
      data: dashboard_params,
      message: "successfully retrieved",
    });
  } catch (e) {
    console.log(e);
    return res.send({
      status: "failed",
      error: true,
      message: "Could not be retrieved",
    });
  }
});

// charts of amount processed
router.get("/chart", [auth, admin], async (req, res) => {
  try {
    const wallet_top_ups = await WalletTopup.aggregate([
      {
        $match: {
          payment_status: "success",
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$transaction_date" },
            month: { $month: "$transaction_date" },
            day: { $dayOfMonth: "$transaction_date" },
          },
          total: { $sum: "$amount" },
        },
      },
    ]);

    return res.status(200).send({
      status: "success",
      error: false,
      data: wallet_top_ups,
      message: "successfully retrieved",
    });
  } catch (e) {
    console.log(e);
    return res.send({
      status: "failed",
      error: true,
      message: "Could not be retrieved",
    });
  }
});

// Get all giveaway winners
router.get("/get_giveaway_winners", [auth], async (req, res) => {
  try {
    const s = await Participant.find({
      win: true,
    });

    let winners = [];

    await Participant.populate(participants, {
      path: "giveaway_id user",
    }).then((parts) => {
      winners = parts;
    });

    return res.status(200).send({
      status: "success",
      error: false,
      data: winners,
      message: "successfully retrieved",
    });
  } catch (e) {
    console.log(e);
    return res.send({
      status: "failed",
      error: true,
      message: "Could not be retrieved",
    });
  }
});

//Referrals
router.get("/get_all_refferals", [auth], async (req, res) => {
  try {
    const users = await User.aggregate([
      {
        $match: {
          refCodeUsage: {
            $gt: 0,
          },
        },
      },
    ]);

    return res.status(200).send({
      status: "success",
      error: false,
      data: users,
      message: "sucessfully retrieved",
    });
  } catch (e) {
    console.log(e);
    return res.send({
      status: "failed",
      error: true,
      message: "Could not be retrieved",
    });
  }
});

//Referrals by id
router.get("/get_refferal/:id", [auth], async (req, res) => {
  try {
    const users = await User.findById(req.params.id);

    await User.populate(users, {
      path: "usersReffered",
    }).then((parts) => {
      return res.send(parts);
    });

    return res.status(200).send({
      status: "success",
      error: false,
      data: users,
      message: "sucessfully retrieved",
    });
  } catch (e) {
    console.log(e);
    return res.send({
      status: "failed",
      error: true,
      message: "Could not be retrieved",
    });
  }
});

/////TRANSACTIONS

//get bank transfers
router.get("/bank_transfers", [auth, admin], async (req, res) => {
  try {
    const transfers = await Transfer.find();

    return res.status(200).send({
      status: "success",
      error: false,
      data: transfers,
      message: "sucessfully retrieved",
    });
  } catch (e) {
    console.log(e);
    return res.send({
      status: "failed",
      error: true,
      message: "Could not be retrieved",
    });
  }
});

router.get("/bank_transfers/:id", [auth, admin], async (req, res) => {
  try {
    const transfers = await Transfer.findOne({ _id: req.params.id });

    return res.status(200).send({
      status: "success",
      error: false,
      data: transfers,
      message: "sucessfully retrieved",
    });
  } catch (e) {
    console.log(e);
    return res.send({
      status: "failed",
      error: true,
      message: "Could not be retrieved",
    });
  }
});

// get wallet top ups
router.get("/wallet_top_ups", [auth, admin], async (req, res) => {
  try {
    const wallet = await WalletTopup.find();

    return res.status(200).send({
      status: "success",
      error: false,
      data: wallet,
      message: "sucessfully retrieved",
    });
  } catch (e) {
    console.log(e);
    return res.send({
      status: "failed",
      error: true,
      message: "Could not be retrieved",
    });
  }
});

router.get("/wallet_top_ups/:id", [auth, admin], async (req, res) => {
  try {
    const wallet = await WalletTopup.findOne({ _id: req.params.id });

    return res.status(200).send({
      status: "success",
      error: false,
      data: wallet,
      message: "sucessfully retrieved",
    });
  } catch (e) {
    console.log(e);
    return res.send({
      status: "failed",
      error: true,
      message: "Could not be retrieved",
    });
  }
});

//get airtime top up
router.get("/airtime_top_up", [auth, admin], async (req, res) => {
  try {
    const airtime = await AirtimeTopup.find();

    return res.status(200).send({
      status: "success",
      error: false,
      data: airtime,
      message: "sucessfully retrieved",
    });
  } catch (e) {
    console.log(e);
    return res.send({
      status: "failed",
      error: true,
      message: "Could not be retrieved",
    });
  }
});

router.get("/airtime_top_up/:id", [auth, admin], async (req, res) => {
  try {
    const airtime = await AirtimeTopup.findOne({ _id: req.params.id });

    return res.status(200).send({
      status: "success",
      error: false,
      data: airtime,
      message: "sucessfully retrieved",
    });
  } catch (e) {
    console.log(e);
    return res.send({
      status: "failed",
      error: true,
      message: "Could not be retrieved",
    });
  }
});

router.get("/free_withdrawals", [auth, admin], async (req, res) => {
  try {
    const transaction = await FreeWithdrawal.find().sort({ createdAt: -1 });

    return res.status(200).send({
      status: "success",
      error: false,
      data: transaction,
      message: "sucessfully retrieved",
    });
  } catch (e) {
    console.log(e);
    return res.send({
      status: "failed",
      error: true,
      message: "Could not be retrieved",
    });
  }
});
////Giveaway

//create giveaway
router.post(
  "/create_giveaway",
  [auth, admin],
  util.promisify(upload.single("image")),
  async (req, res) => {
    // if (req.file && req.file.size > 5242880)
    //     return res.status(400).send('Ad Image can only be 5MB max');

    // const { error } = validateGiveaway(req.body);
    // if (error) return res.status(400).send(error.details[0].message);

    // if (!req.body.minimumstars) {
    //   res
    //     .status(400)
    //     .send({ error: "true", message: "Minimum stars required" });
    // }

    const giveaway_ref = uniqid("GV|").toUpperCase();

    const amount = parseFloat(req.body.amount);
    const amountPerWinner = parseFloat(req.body.amountPerWinner);

    const numberOfWinners = amount / amountPerWinner;

    const completed = req.body.completed == true ? true : false;

    min_stars = req.body.minimumstars ? req.body.minimumstars : 0;
    giveaway_type = req.body.type ? req.body.type : "normal";

    const user_id = req.body.user_id ? req.body.user_id : null;

    const giveaway = new Giveaway({
      user: user_id,
      admin: req.user._id,
      type: giveaway_type,
      minimumstars: min_stars,
      amount: req.body.amount,
      amountPerWinner: req.body.amountPerWinner,
      numberOfWinners: numberOfWinners,
      isAnonymous: req.body.isAnonymous,
      message: req.body.message,
      likeTweet: req.body.likeTweet,
      followTwitter: req.body.followTwitter,
      likeInstagram: req.body.likeInstagram,
      followInstagram: req.body.followInstagram,
      likeFacebook: req.body.likeFacebook,
      likeFacebookLink: req.body.likeFacebookLink,
      likeTweetLink: req.body.likeTweetLink,
      followTwitterLink: req.body.followTwitterLink,
      likeInstagramLink: req.body.likeInstagramLink,
      followInstagramLink: req.body.followInstagramLink,
      giveaway_ref: giveaway_ref,
      image: req.file,
      expiry: req.body.expiry,
      endAt: req.body.endAt,
      completed: completed,
    });

    await giveaway.save();

    const new_giveaway = await Giveaway.findById(giveaway._id)
      .populate("user")
      .populate("admin");

    if (user_id) {
      sendNotification(user_id, new_giveaway);
    } else {
      sendNotification(req.user._id, new_giveaway);
    }

    if (completed) {
      OutsideWinners.create({
        giveaway_id: giveaway._id,
        winners: numberOfWinners,
      });
    }

    return res
      .status(200)
      .send({ message: "success", error: false, data: giveaway });
  }
);

//hide giveaway
router.post("/giveaway_visibility/:id", [auth, admin], async (req, res) => {
  try {
    const hide = req.body.hide == "yes" ? true : false;

    await Giveaway.findByIdAndUpdate(req.params.id, {
      $set: {
        hidden: hide,
        completed: true,
      },
    });

    res
      .status(200)
      .send({ error: false, message: "giveaway hidden successfully" });
  } catch (e) {
    console.log(e);
    return res.status(500).send({
      message: "could not hide giveaway :(",
      error: true,
    });
  }
});

//// Awoof referral bonus
//set referral bonus
router.post("/set_referral_bonus", [auth, super_admin], async (req, res) => {
  try {
    const referral_bonus = new ReferralBonus({
      created_by: req.user._id,
      amount: req.body.amount,
    });

    await referral_bonus.save();

    return res.status(200).send({
      message: "successfully updated referral bonus :)",
      error: false,
      data: referral_bonus,
    });
  } catch (e) {
    console.log(e);
    return res.status(400).send({
      message: "referral bonus could not be updated :(",
      error: true,
    });
  }
});

//get current referral bonus
router.get("/referral_bonus", [auth, super_admin], async (req, res) => {
  try {
    let referral_bonus = await ReferralBonus.findOne().sort({ createdAt: -1 });

    referral_bonus = referral_bonus ? referral_bonus : { amount: 0 };

    return res.status(200).send({
      message: "successfully retrieved referral giveaway bonus :)",
      error: false,
      data: referral_bonus,
    });
  } catch (e) {
    console.log(e);
    return res.status(400).send({
      message: "referral bonus could not get referral bonus :(",
      error: true,
    });
  }
});

//set giveaway winners manually
router.post("/set_giveaway_winners/:id", [auth, admin], async (req, res) => {
  try {
    const winners = req.body.winners;
    //check for amount of winners
    const giveaway = await Giveaway.findById(req.params.id);

    if (
      winners.length > giveaway.numberOfWinners ||
      winners.length < giveaway.numberOfWinners
    ) {
      return res.status(400).send({
        message:
          "please set the winners according to the number of winners in the giveaway",
        error: true,
      });
    }

    const user_ids = [];
    const winings = [];

    winners.map(async (winner) => {
      user_ids.push(winner.user_id);

      winings.push({
        user: winner.user_id,
        giveaway_id: giveaway._id,
        amount: giveaway.amountPerWinner,
      });
    });

    //update giveaway participants and set winners
    await Participant.updateMany(
      {
        giveaway_id: req.params.id,
        user: { $in: user_ids },
      },
      { $set: { win: true } }
    );
    await User.updateMany(
      {
        _id: { $in: user_ids },
      },
      {
        $inc: {
          balance: +giveaway.amountPerWinner,
          giveawaysWon: +1,
          giveawaysAmountWon: +giveaway.amountPerWinner,
        },
      }
    );

    //create wining histories
    await WiningsHistory.create(winings);

    await Giveaway.findByIdAndUpdate(req.params.id, {
      $set: {
        completed: true,
      },
    });

    sendGeneralNotification(giveaway);

    return res.status(200).send({
      message: "Giveaway winners set successfully :)",
      error: false,
    });
  } catch (e) {
    console.log(e);
    return res.status(400).send({
      message: "An error occurred, could not set winners :(",
      error: true,
    });
  }
});

//create surprise
router.post("/create_surprise/:id", [auth, super_admin], async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.params.id });
    const new_balance = user.balance + parseFloat(req.body.amount);

    await User.findByIdAndUpdate(req.params.id, {
      $set: {
        balance: new_balance,
      },
    });

    //send a mail to the user
    // const msg = {
    //   to: user.email,
    //   from: "no-reply@awoofapp.com",
    //   templateId: "d-5bc2acfc58e24404b8bab7b8b6f5f98e",
    //   dynamic_template_data: {
    //     name: user.firstName,
    //     amount: new_balance,
    //   },
    // };
    // sgMail.send(msg, (err, result) => {
    //   if (err) {
    //     // return res
    //     //   .status(200)
    //     //   .send({ error: "false", message: "email didn't send" });
    //   }
    // });
    const suprise = await SupriseHistory.create({
      user: req.params.id,
      amount: req.body.amount,
      type: "cash suprise",
      createdBy: req.user._id,
    });
    sendSurpriseNotification(req.params.id, user.username, req.body.amount);
    return res.status(200).send({
      message: "Awoof surprise was sent successfully",
      error: false,
    });
  } catch (e) {
    console.log(e);
    return res.send({
      status: "failed",
      error: true,
      message: "An error occured, could not create a surprise",
    });
  }
});

// send stars to users
router.post("/send_stars/:id", [auth, super_admin], async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    const new_balance = user.stars + parseInt(req.body.stars);
    const stars = new_balance > 30 ? 30 : new_balance;

    await User.findByIdAndUpdate(req.params.id, {
      $set: {
        stars: stars,
      },
    });

    await SupriseHistory.create({
      user: req.params.id,
      amount: req.body.stars,
      type: "star surprise",
      createdBy: req.user._id,
    });

    await sendSurpriseNotification(
      req.params.id,
      user.username,
      req.body.stars,
      true
    );
    return res.status(200).send({
      message: "Awoof surprise was sent successfully",
      error: false,
    });
  } catch (e) {
    console.log(e);
    return res.send({
      status: "failed",
      error: true,
      message: "An error occurred, could not create a surprise",
    });
  }
});

//get all surprise
router.get("/get_suprise", [auth, admin], async (req, res) => {
  const suprise = await SupriseHistory.find().populate("user");

  return res
    .status(200)
    .send({ error: false, message: "success", data: suprise });
});

//get total balance of surprize given to a user
router.get("/get_surprise_amount/:id", [auth, admin], async (req, res) => {
  //   const pre_data = await SupriseHistory.find({ user: req.params.id });
  const data = await SupriseHistory.aggregate([
    {
      $match: {
        user: ObjectId(req.params.id),
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$amount" },
      },
    },
  ]);

  let new_data = data.length ? { amount: data[0].total } : { amount: 0 };

  res.status(200).json({
    error: false,
    message: "successfully retrieved",
    // pre_data: pre_data,
    data: new_data,
  });
});

//Get participants in a giveaway
router.get("/get_participants/:id", [auth], async (req, res) => {
  try {
    const participants = await Participant.find({
      giveaway_id: req.params.id,
    }).populate("user");

    return res.status(200).send({
      error: false,
      message: "Successfully fetched participants",
      data: participants,
    });
  } catch (e) {
    console.log(e);
    return res.send({
      status: "failed",
      error: true,
      message: "Something went wrong, could not get participants",
    });
  }
});

//Reserve username
router.post("/reserve_username", [auth, admin], async (req, res) => {
  try {
    let userName = await User.findOne({ username: req.body.username });
    let reservedUserName = await ReservedUsername.findOne({
      username: req.body.username,
    });
    if (userName || reservedUserName)
      return res.status(400).send({
        error: true,
        message: "Username exists, please pick a different username",
      });

    const user = new ReservedUsername({
      username: req.body.username,
    });

    await user.save();

    return res.send({
      status: "success",
      error: false,
      message: "username reserved successfully",
      data: user,
    });
  } catch (e) {
    console.log(e);
    return res.send({
      status: "failed",
      error: true,
      message: "Something went wrong, could not reserve username",
    });
  }
});

//get reserved username
router.get("/get_reserved_usernames", [auth, admin], async (req, res) => {
  await ReservedUsername.find()
    .sort({ createdAt: -1 })
    .exec((err, usernames) => {
      if (err) {
        return res
          .status(500)
          .send({ error: true, message: "Database operation failed" });
      }
      return res.status(200).send({
        error: false,
        message: "Sucessfully fetched history",
        data: usernames,
      });
    });
});

//get social accounts
router.get("/get_social_accounts", [auth, admin], async (req, res) => {
  await SocialAccount.find()
    .sort({ createdAt: -1 })
    .populate("user")
    .exec((err, social_accounts) => {
      if (err) {
        return res
          .status(500)
          .send({ error: true, message: "Database operation failed" });
      }
      return res.status(200).send({
        error: false,
        message: "Successfully fetched social accounts",
        data: social_accounts,
      });
    });
});

//get social accounts by user id
router.get("/get_social_account/:id", [auth, admin], async (req, res) => {
  SocialAccount.find({ user: req.params.id }).exec((err, social_accounts) => {
    if (err) {
      return res
        .status(500)
        .send({ error: true, message: "Database operation failed" });
    }

    return res.status(200).send({
      error: false,
      message: "Successfully fetched social accounts",
      data: social_accounts,
    });
  });
});

//create notifications
router.post("/create_notification", [auth, admin], async (req, res) => {
  try {
    const message = {
      title: req.body.title,
      body: req.body.body,
    };

    const notification = await sendNotificationAdmin(message);

    return res.status(200).send(notification);
  } catch (e) {
    console.log(e);
    return res.status(404).send({
      status: 404,
      error: true,
      message: "could not send notifications",
    });
  }
});

//deduct balance for manual withdrawals
router.post("/deduct_balance/:id", [auth, admin], async (req, res) => {
  try {
    //deduct user balance
    const deduct = await User.findByIdAndUpdate(
      req.params.id,
      {
        $inc: {
          balance: -req.body.amount,
        },
      },
      {
        new: true,
      }
    );

    const order_ref = uniqid("BT|").toUpperCase();

    let transfer = await Transfer.create({
      amount: req.body.amount,
      accountNumber: req.body.accountNumber,
      bankName: req.body.bankName,
      accountName: req.body.accountName,
      order_ref: order_ref,
      transaction_message: "wallet withdrawal",
      user: deduct.email,
    });

    return res.status(200).send({
      error: false,
      message: "Amount deducted successfully",
      data: deduct,
    });
  } catch (e) {
    console.log(e);
    return res.status(404).send({
      status: 404,
      error: true,
      message: "could not send deduct user balance",
    });
  }
});
module.exports = router;
