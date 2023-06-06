const auth = require("../middleware/auth");
const admin = require("../middleware/admin");
const validateObjectId = require("../middleware/validateObjectId");
const _ = require("lodash");
const moment = require("moment");
const bcrypt = require("bcryptjs");
const { User, validateUser, validateUserUpdate } = require("../models/user");
const { Participant } = require("../models/participants");
const { Token } = require("../models/token");
const { PasswordResetToken } = require("../models/passwordResetToken");
const { Notifications } = require("../models/notifications");
const { ReferralBonus } = require("../models/referral-bonus");
const mongoose = require("mongoose");
const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const uniqueRandom = require("unique-random");
const random = uniqueRandom(0, 10);
const {
  sendReferralNotification,
} = require("../Helpers/sendFirebaseNotification");

mongoose.set("useFindAndModify", false);

//sendgrid
const sgMail = require("@sendgrid/mail");
const sendgrid_key = process.env.sendgrid;
sgMail.setApiKey(sendgrid_key);

// twillo
const accountSid = "AC55ebdf70ec5f7664d63b9155e844205d";
const authToken = "915c0dd3e4884edffe2b1aeb0cb8ef26";
const client = require("twilio")(accountSid, authToken);

// Image Upload things
const aws = require("aws-sdk");
const multer = require("multer");
const multerS3 = require("multer-s3");
const { ReservedUsername } = require("../models/reservedUsername");
const { SupriseHistory } = require("../models/supriseHistory");
const { Device } = require("../models/devices");
const { response } = require("express");
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

//get all phone numbers on awoof
router.get("/get_phone_numbers", async (req, res) => {
  const phone = await User.find().select("phoneNumber");

  return res.status(200).json({
    error: false,
    message: "retrieved successfully",
    data: phone,
  });
});

// Get the currently logged-in user; logged-in user endpoint
router.get("/me", auth, async (req, res) => {
  const user = await User.findById(req.user._id).select("-password -__v");

  let result = { status: "success", error: false, data: user };
  res.send(result);
});

// user sign-up endpoint
router.post("/", upload.single("image"), async (req, res) => {
  console.log(req.body)
  if (!req.body.firstName)
    return res
      .status(400)
      .send({ error: true, message: "First name is required" });
  if (!req.body.lastName)
    return res
      .status(400)
      .send({ error: true, message: "Last name is required" });
  if (!req.body.username)
    return res
      .status(400)
      .send({ error: true, message: "Username is required!" });
  if (!req.body.email)
    return res.status(400).send({ error: true, message: "Email is required" });
  // if (!req.body.location) return res.status(400).send({error: true, message: 'Location is required'});
  if (!req.body.phoneNumber)
    return res
      .status(400)
      .send({ error: true, message: "Phone Number is required" });
  if (!req.body.password)
    return res
      .status(400)
      .send({ error: true, message: "Password is required" });

  if (req.file && req.file.size > 5242880)
    return res
      .status(400)
      .send({ error: true, message: "Profile Image can only be 5MB max" });

  //   const { error } = validateUser(req.body);
  //   if (error)
  //     return res
  //       .status(400)
  //       .send({ error: true, message: error.details[0].message });

  let emailCheck = await User.findOne({ email: req.body.email });
  if (emailCheck)
    return res.status(400).send({
      error: true,
      message:
        "User exists with this email exists, please pick a different mail",
    });
  let phoneNumberCheck = await User.findOne({
    phoneNumber: req.body.phoneNumber,
  });
  if (phoneNumberCheck)
    return res.status(400).send({
      error: true,
      message: "Phone number exists, please pick a different phone number",
    });
  let userName = await User.findOne({ username: req.body.username });
  let reservedUserName = await ReservedUsername.findOne({
    username: req.body.username,
  });
  console.log(userName+reservedUserName)
  console.log('name')
  if (userName || reservedUserName)
    return res.status(400).send({
      error: true,
      message: "Username exists, please pick a different username",
    });

  // user = new User(
  //     _.pick(req.body, [
  //         'fullName',
  //         'username',
  //         'email',
  //         'phoneNumber',
  //         'gender',
  //         'dateOfBirth',
  //         'referralCode',
  //         'securityQuestion',
  //         'securityAnswer',
  //         'password',
  //         'userRef',
  //         'twofaId',
  //         'image',
  //     ])
  // );

  const location = req.body.location ? req.body.location : "not stated";

  const user = new User({
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    username: req.body.username,
    email: req.body.email,
    phoneNumber: req.body.phoneNumber,
    gender: req.body.gender,
    location: location,
    dateOfBirth: req.body.dateOfBirth,
    referralCode: req.body.referralCode, //replaces referred by (the)
    securityQuestion: req.body.securityQuestion,
    securityAnswer: req.body.securityAnswer,
    image: req.file,
  });

  //set initial 10 stars for a user
  user.stars = 10;

  let lastUser = await User.find().limit(1).sort({ $natural: -1 });

  let userRef = lastUser.length
    ? parseInt(
        lastUser[0].userRef.split("awoof")[1].replace(/[^\d]*/, ""),
        10
      ) + 1
    : "0001";

  userRef = "" + userRef;
  if (userRef.length < 4) {
    let initialDiff = 4 - userRef.length;
    for (i = 0; i < initialDiff; i++) {
      userRef = "0" + userRef;
    }
  }
  userRef = "awoof" + userRef;

  user.userRef = userRef;

  //if userRef is someone valid, add stars, referral bonus and notify
  let userReferrer = await User.findOne({ userRef: req.body.referralCode });

  let referral_bonus = await ReferralBonus.findOne().sort({ createdAt: -1 });
  referral_bonus = referral_bonus ? referral_bonus.amount : 1;
  if (userReferrer) {
    sendReferralNotification(
      userReferrer._id,
      req.body.username,
      req.body.token
    );
    let newStars =
      parseInt(userReferrer.stars, 10) + parseInt(referral_bonus, 10);

    let newrefCodeUsage = parseInt(userReferrer.refCodeUsage) + 1;
    userReferrer.stars = newStars < 30 ? newStars : 30;
    userReferrer.refCodeUsage = newrefCodeUsage;
    userReferrer.usersReffered.push(user._id);
    await userReferrer.save();

    //adds 1 extra star for a user that used referral code
    user.stars += 1;
  }

  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(req.body.password, salt);
  user.image = req.file;

  // When authy is added, we uncomment this!

  // authy.register_user(req.body.email, req.body.phoneNumber, '+234', function (
  //   regErr,
  //   regRes
  // ) {
  //   if (regErr) {
  //   } else if (regRes) {
  //     user.twofaId = regRes.user.id;
  //     user.save(function (err) {
  //       if (err) {
  //       } else {
  //       }
  //     });
  //     authy.request_sms(regRes.user.id, function (smsErr, smsRes) {
  //       if (smsErr) {
  //       } else if (smsRes) {
  //       }
  //     });

  //     const auth_token = user.generateAuthToken();

  //     let result = {
  //       idToken: auth_token,
  //       _id: user._id,
  //       phoneNumber: user.phoneNumber,
  //       fullName: user.fullName,
  //       email: user.email,
  //       balance: user.balance,
  //       twofaId: user.twofaId,
  //     };

  //     res
  //       .header('x-auth-token', auth_token)
  //       .header('access-control-expose-headers', 'x-auth-token')
  //       .send(result);
  //   }
  // });

  const auth_token = user.generateAuthToken();

  let result = {
    idToken: auth_token,
    _id: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    username: user.username,
    email: user.email,
    phoneNumber: user.phoneNumber,
    gender: user.gender,
    location: user.location,
    dateOfBirth: user.dateOfBirth,
    userRef: user.userRef,
    balance: user.balance,
    stars: user.stars,
    following: user.following,
    followers: user.following,
    twofaId: user.twofaId,
    image: user.image,
  };

  await user.save();

  //save notifcations
  //   var notification = new Notifications({
  //     user: user._id,
  //     message:
  //       req.body.username +
  //       " successfully signed up using your referral link, Awoof Star ⭐ Received, thanks for the referral.",
  //     seen: false,
  //   });
  //   notification.save();

  //send a mail to the user
  const msg = {
    to: user.email,
    from: {
      email: "support@awoofapp.com",
      name: "Awoof App",
    }, //awoofapp.com
    templateId: "d-08697b3ba6f74db2be18a7b726cd4edf",
    dynamic_template_data: {
      name: user.firstName,
    },
  };
  sgMail.send(msg, (err, result) => {
    if (err) {
      console.log(err.message);
      // return res
      //   .status(200)
      //   .send({ error: "false", message: "email didn't send" });
    }
  });

  //get firebase device token
  const new_device = new Device({
    user_id: user._id,
    token: req.body.token,
  });

  await new_device.save();

  // send two F.A
  //   let num = req.body.phoneNumber;

  //   let randomStringToken = Math.floor(100000 + Math.random() * 900000);

  //   const twofaId = await bcrypt.hash(randomStringToken.toString(), salt);

  //   await User.findByIdAndUpdate(user._id, {
  //     $set: {
  //       twofaId: twofaId,
  //     },
  //   });

  //   client.messages
  //     .create({
  //       body: `Your Awoof verification code is ${randomStringToken}`,
  //       from: "+1 213 516 9881",
  //       to: num,
  //     })
  //     .then((message) => console.log(message.sid));

  res
    .header("x-auth-token", auth_token)
    .header("access-control-expose-headers", "x-auth-token")
    .send({ status: "success", error: false, data: result });
});

router.post("/confirmation", async (req, res) => {
  if (!req.body.email) return res.status(400).send("Email is required!");
  if (!req.body.token) return res.status(400).send("Token cannot be blank!");

  // Find a matching token
  Token.findOne({ token: req.body.token }, function (err, token) {
    if (!token)
      return res.status(400).send({
        status: 400,
        error: true,
        type: "not-verified",
        message:
          "We were unable to find a valid token. Your token may have expired.",
      });

    // If we found a token, find a matching user
    User.findOne(
      { _id: token._userId, email: req.body.email },
      function (err, user) {
        if (!user)
          return res.status(400).send({
            status: 400,
            error: true,
            message: "We were unable to find a user for this token.",
          });
        if (user.isVerified)
          return res.status(400).send({
            status: 400,
            error: true,
            type: "already-verified",
            msg: "This user has already been verified.",
          });

        // Verify and save the user
        user.isVerified = true;
        user.save(function (err) {
          if (err) {
            return res.status(500).send({ msg: err.message });
          }
          res.status(200).send({
            status: 200,
            error: false,
            message: "The account has been verified.",
          });
        });
      }
    );
  });
});

//deduct user balance
router.post("/deduct-balance/:id", auth, async (req, res) => {
  if (!req.body.amount) return res.status(400).send("amount is required!");
  if (!req.params.id) return res.status(400).send("Account id is required!");
  let user = await User.findOne({ _id: req.params.id });
  if (req.body.amount < 1)
    return res
      .status(400)
      .send({ status: 400, error: false, message: "Invalid amount" });
  if (!user)
    return res
      .status(400)
      .send({ status: 400, error: false, message: "Invalid ID" });
  user.balance -= req.body.amount;
  await user.save();
  return res.status(200).send({
    status: 200,
    error: false,
    data: user,
  });
});

//check if email is free
router.post("/email-check", async (req, res) => {
  if (!req.body.email) return res.status(400).send("email is required!");
  let emailCheck = await User.findOne({ email: req.body.email });
  if (emailCheck)
    return res.status(400).send({
      status: 400,
      error: true,
      message: "Email already exists, please pick a new one",
    });
  return res.status(200).send({
    status: 200,
    error: false,
    message: "This email is free",
  });
});

//check if username is free
router.post("/username-check", async (req, res) => {
  if (!req.body.username)
    return res
      .status(400)
      .send({ error: true, message: "Username is required!" });

  let userName = await User.findOne({ username: req.body.username });
  if (userName)
    return res.status(400).send({
      error: true,
      message: "Username already exists, please pick a new one",
    });
  return res.status(200).send({
    status: 200,
    error: false,
    message: "This username is free",
  });
});

//check if phoneNumber is free
router.post("/phone-check", async (req, res) => {
  if (!req.body.phoneNumber)
    return res
      .status(400)
      .send({ error: true, message: "Phone number required" });

  let phone = await User.findOne({ phoneNumber: req.body.phoneNumber });
  if (phone)
    return res.status(400).send({
      error: true,
      message: "Phone number already exist, Please pick a different one",
    });
  return res.status(200).send({
    status: 200,
    error: false,
    message: "This phone number is free",
  });
});

//check if list of phoneNumbers are signed up
router.post("/contacts-check", auth, async (req, res) => {
  if (!req.body.phoneNumbers)
    return res
      .status(400)
      .send({ error: true, message: "PhoneNumbers is required!" });
  let phoneNumbers = req.body.phoneNumbers.split(",");
  if (phoneNumbers.length > 20)
    return res.status(400).send({
      error: true,
      message: "Maximum of 20 phone numbers allowed at once",
    });
  let proccessedPhoneNumbers = {};
  for (const phoneNumber of phoneNumbers) {
    let phoneNumberCheck = await User.findOne({ phoneNumber: phoneNumber });
    if (phoneNumberCheck) {
      proccessedPhoneNumbers[phoneNumber] = true;
    } else {
      proccessedPhoneNumbers[phoneNumber] = false;
    }
  }
  return res.status(200).send({
    status: 200,
    error: false,
    message: proccessedPhoneNumbers,
  });
});

//get User notifications
router.get("/notifications", auth, async (req, res) => {
  // if (!req.params.id)
  //   return res
  //     .status(400)
  //     .send({ error: true, message: "Account Id is required" });

  const preNotification = await Notifications.find({ user: req.user._id }).sort(
    { createdAt: -1 }
  );
  // .limit(15)
  //   populate(preNotification, {
  //     path: "giveaway",
  //     populate: {
  //       path: "user",
  //     },
  //   });

  const notifications = await Notifications.populate(preNotification, {
    path: "user giveaway",
    populate: {
      path: "user",
    },
  });

  let allNotifications = [];
  for (var notification of notifications) {
    allNotifications.push({
      user: notification.user,
      new: !notification.seen,
      message: notification.message,
      type: notification.type,
      giveaway: notification.giveaway,
      createdAt: notification.createdAt,
    });
    if (!notification.seen) {
      let theNotification = await Notifications.findOne({
        _id: notification.id,
      });
      theNotification.seen = true;
      await theNotification.save();
    }
  }

  return res.status(200).send({
    status: 200,
    error: false,
    message: "done",
    data: allNotifications,
  });
});

//get user suprise history
router.get("/get_my_suprise", auth, async (req, res) => {
  const suprise = await SupriseHistory.find({ user: req.user._id });

  return res
    .status(200)
    .send({ error: false, message: "success", data: suprise });
});

//delete user notifications
router.delete("/delete_notification/:id", auth, async (req, res) => {
  try {
    await Notifications.findByIdAndDelete(req.params.id);

    res
      .status(200)
      .send({ error: false, message: "notification deleted successfully" });
  } catch (e) {
    res
      .status(500)
      .send({ error: false, message: "notification could not deleted" });
  }
});

router.post("/resend", async (req, res) => {
  if (!req.body.email)
    return res.status(400).send({ error: true, message: "Email is required" });
  if (!req.body.token)
    return res.status(400).send({ error: true, message: "Token is required" });

  User.findOne({ email: req.body.email }, function (err, user) {
    if (!user)
      return res.status(400).send({
        error: true,
        msg: "We were unable to find a user with that email.",
      });
    if (user.isVerified)
      return res.status(400).send({
        error: true,
        message: "This account has already been verified. Please log in.",
      });

    // Create a verification token, save it, and send email
    var token = new Token({
      _userId: user._id,
      token: crypto.randomBytes(16).toString("hex"),
    });

    // Save the token
    token.save(function (err) {
      if (err) {
        return res.status(500).send({ msg: err.message });
      }

      // Send the email
      // var transporter = nodemailer.createTransport({
      //   service: "SendGrid",
      //   auth: {
      //     user: "apikey",
      //     pass: process.env.sendgrid,
      //   },
      // });
      // var mailOptions = {
      //   from: "no-reply@awoofapp.com",
      //   to: user.email,
      //   subject: "Account Verification Token",
      //   text:
      //     "Hello,\n\n" +
      //     "Please verify your account by clicking the link: \nhttp://" +
      //     "dashboard.awoofapp.com" +
      //     "/confirmation/" +
      //     token.token +
      //     ".\n",
      // };
      // transporter.sendMail(mailOptions, function (err) {
      //   if (err) {
      //     return res.status(500).send({ msg: err.message, error: true });
      //   }
      //   res.status(200).send({
      //     error: false,
      //     message: "A verification email has been sent to " + user.email + ".",
      //   });
      // });

      const msg = {
        to: user.email,
        from: {
          email: "support@awoofapp.com",
          name: "Awoof App",
        }, //awoofapp.com
        templateId: "d-1a175868b59c48eca6231bf39a6e5512",
        dynamic_template_data: {
          name: user.firstName,
          email: user.email,
          verify_link: `http://admin.awoofapp.com/confirmation/${token.token}`, //checkhere
        },
      };
      sgMail.send(msg, (err, result) => {
        if (err) {
          console.log(err.message);
          return res
            .status(200)
            .send({ error: "false", message: "email didn't send" });
        } else {
          return res.status(200).send({
            error: "false",
            message:
              "A verification email has been sent to " + user.email + ".",
          });
        }
      });
    });
  });
});

/************** Forget Password Endpoint *********/
// user forget-password endpoint
router.post("/forget-password", async (req, res) => {
  if (!req.body.email)
    return res.status(400).send({ error: true, message: "Email is required" });

  let user = await User.findOne({ email: req.body.email });
  if (!user)
    return res
      .status(400)
      .send({ error: true, message: "This Email does not exist on Awoof" });

  let randomStringToken = "";
  for (i = 0; i < 4; i++) {
    randomStringToken += Math.floor(Math.random() * 9 + 1);
  }
  const salt = await bcrypt.genSalt(10);

  //the word is either password or pin
  const word = req.body.word ? req.body.word : "password";

  var token = new PasswordResetToken({
    _userId: user._id,
    token: await bcrypt.hash(randomStringToken.toString(), salt),
  });
  token.save(function (err) {
    if (err) {
      return res.status(500).send({ msg: err.message });
    }

    const template_id =
      word == "pin"
        ? "d-751b48206d6643b9a7a85734c18e169c"
        : "d-a919961a98c04dbf80ed654c15345a44";

    // Send the email
    const msg = {
      to: user.email,
      from: {
        email: "support@awoofapp.com",
        name: "Awoof App",
      }, //change this when they change their name
      templateId: template_id,
      dynamic_template_data: {
        name: user.firstName,
        token: randomStringToken,
      },
    };
    sgMail.send(msg, (err, result) => {
      if (err) {
        console.log(err);
        return res
          .status(200)
          .send({ error: true, message: "email didn't send" });
      }
      return res
        .status(200)
        .send({ error: false, message: "email sent successfully" });
    });
  });
});

/************** End of Forget Password  **********/

/************* Begin Reset Password Endpoint ***********/
router.post("/reset-password", async (req, res) => {
  if (!req.body.email)
    return res.status(400).send({ error: true, message: "Email is required" });
  if (!req.body.password)
    return res
      .status(400)
      .send({ error: true, message: "Ensure to set a new password" });
  if (!req.body.token)
    return res.status(400).send({ error: true, message: "Token is required" });

  const salt = await bcrypt.genSalt(10);
  const userNewPassword = await bcrypt.hash(req.body.password, salt);

  let new_user = await User.findOne({ email: req.body.email });

  if (!new_user) {
    return res.status(400).send({ error: true, message: "User not found" });
  }

  // Find a matching token
  await PasswordResetToken.findOne(
    { _userId: new_user._id },
    async function (err, token) {
      if (!token)
        return res.status(400).send({
          status: 400,
          error: true,
          message:
            "We were unable to find a valid token. Your token may have expired.",
        });

      let compare_token = await bcrypt.compare(req.body.token, token.token);

      if (!compare_token) {
        return res
          .status(400)
          .send({ error: true, message: "Token is invalid" });
      }

      // If we found a token, find a matching user
      User.findOne(
        { _id: token._userId, email: req.body.email },
        function (err, user) {
          if (!user)
            return res.status(400).send({
              error: true,
              message:
                "We were unable to find a user that matches this particular request.",
            });

          // Update user password and save the user update
          user.password = userNewPassword;
          user.save(function (err) {
            if (err) {
              return res
                .status(400)
                .send({ error: true, message: err.message });
            }
            res.status(200).send({
              status: 200,
              error: false,
              message: "Password Reset Successful",
            });
          });
        }
      );
    }
  ).sort({ $natural: -1 });
});
/************* End of Reset Password Endpoint **********/

// user update password endpoint
router.put("/password/:id", [auth, validateObjectId], async (req, res) => {
  if (!req.body.password)
    return res
      .status(400)
      .send({ error: true, message: "Old Password is required" });
  if (!req.body.newPassword)
    return res
      .status(400)
      .send({ error: true, message: "New Password is required" });

  const { error } = validateUser(req.body);
  if (error)
    return res
      .status(400)
      .send({ error: true, message: error.details[0].message });

  const user = await User.findById(req.user._id);
  const validPassword = await bcrypt.compare(req.body.password, user.password);

  if (!validPassword)
    return res
      .status(400)
      .send({ error: true, message: "Old Password doesn't match" });

  const salt = await bcrypt.genSalt(10);

  const updatedUser = await User.findByIdAndUpdate(
    req.params.id,
    {
      $set: {
        password: await bcrypt.hash(req.body.newPassword, salt),
      },
    },
    { new: true }
  );

  if (!updatedUser)
    return res.status(404).send({
      error: true,
      message: "The user with the given ID was not found.",
    });

  res
    .status(200)
    .send({ error: false, message: "Password Updated Successfully" });
});

/************* Begin Reset Pin Endpoint ***********/
router.post("/reset_pin", auth, async (req, res) => {
  if (!req.body.email)
    return res.status(400).send({ error: true, message: "Email is required" });
  if (!req.body.token)
    return res.status(400).send({ error: true, message: "Token is required" });
  if (!req.body.pin)
    return res
      .status(400)
      .send({ error: true, message: "Transaction PIN is required" });

  // const { error } = validateUser(req.body);
  // if (error)
  //   return res
  //     .status(400)
  //     .send({ error: true, message: error.details[0].message });

  const salt = await bcrypt.genSalt(10);
  const userNewPin = await bcrypt.hash(req.body.pin, salt);
  const userOldPin = await bcrypt.hash(req.body.pin, salt);

  let new_user = await User.findOne({ email: req.body.email });

  if (!new_user) {
    return res.status(400).send({ error: true, message: "User not found" });
  }

  // Find a matching token
  await PasswordResetToken.findOne(
    { _userId: new_user._id },
    async function (err, token) {
      if (!token)
        return res.status(400).send({
          rror: true,
          message:
            "We were unable to find a valid token. Your token may have expired.",
        });

      let compare_token = await bcrypt.compare(req.body.token, token.token);

      if (!compare_token) {
        return res
          .status(400)
          .send({ error: true, message: "Token is invalid" });
      }

      // If we found a token, find a matching user
      User.findOne({ _id: token._userId }, function (err, user) {
        if (!user)
          return res.status(400).send({
            error: true,
            message:
              "We were unable to find a user that matches this particular request.",
          });

        if (req.user._id != user._id)
          return res.status(400).send({
            error: true,
            message:
              "We were unable to find a user that matches this particular token",
          });

        if (!user.oldPin)
          return res.status(400).send({
            error: true,
            message: "Sorry you don't have a pin, please create a new one",
          });

        // Update user pin and save the user update
        user.newPin = userNewPin;
        user.oldPin = userOldPin;
        user.save(function (err) {
          if (err) {
            return res.status(400).send({ error: true, message: err.message });
          }
          res
            .status(200)
            .send({ error: false, message: "Pin Reset Successful" });
        });
      });
    }
  ).sort({ $natural: -1 });
});
/************* End of Reset Pin Endpoint **********/

// set bank account details
router.put("/bank/:id", [auth, validateObjectId], async (req, res) => {
  if (!req.body.newPin)
    return res
      .status(400)
      .send({ error: true, message: "Transaction PIN is required" });

  if (!req.body.bankName)
    return res
      .status(400)
      .send({ error: true, message: "Bank Name is required" });
  if (!req.body.bankCode)
    return res
      .status(400)
      .send({ error: true, message: "Bank Code is required" });
  if (!req.body.accountName)
    return res
      .status(400)
      .send({ error: true, message: "Account Name is required" });
  if (!req.body.accountNumber)
    return res
      .status(400)
      .send({ error: true, message: "Account Number is required" });

  const { error } = validateUser(req.body);
  if (error)
    return res
      .status(400)
      .send({ error: true, message: error.details[0].message });

  const user = await User.findById(req.user._id);
  if (!user.isPinSet) {
    return res.status(400).send({
      error: true,
      message: "You need to set your transaction pin first",
    });
  }
  const validPin = await bcrypt.compare(req.body.newPin, user.newPin);

  if (!validPin)
    return res
      .status(400)
      .send({ error: true, message: "Pin does not match", error: true });

  const updatedUser = await User.findByIdAndUpdate(
    req.params.id,
    {
      $set: {
        bankName: req.body.bankName,
        bankCode: req.body.bankCode,
        accountName: req.body.accountName,
        accountNumber: req.body.accountNumber,
        isAccountSet: true,
      },
    },
    { new: true }
  );

  if (!updatedUser)
    return res.status(404).send({
      error: true,
      message: "The user with the given ID was not found.",
    });

  res.send({
    status: 200,
    isAccountSet: true,
    error: false,
    message: "Bank Info Added Successfully",
  });
});

// set transaction PIN
router.put("/oldpin/:id", [auth, validateObjectId], async (req, res) => {
  if (!req.body.oldPin)
    return res
      .status(400)
      .send({ error: true, message: "Transaction PIN is required" });

  const { error } = validateUser(req.body);
  if (error)
    return res
      .status(400)
      .send({ error: true, message: error.details[0].message });

  const salt = await bcrypt.genSalt(10);

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        newPin: await bcrypt.hash(req.body.oldPin, salt),
        oldPin: await bcrypt.hash(req.body.oldPin, salt),
        isPinSet: true,
      },
    },
    { new: true }
  );

  if (!user)
    return res.status(404).send({
      error: true,
      message: "The user with the given ID was not found.",
    });

  res.send({
    status: 200,
    isPinSet: true,
    error: false,
    message: "Transaction PIN Created Successfully",
  });
});

// update transaction PIN
router.put("/pin/:id", [auth, validateObjectId], async (req, res) => {
  if (!req.body.oldPin)
    return res
      .status(400)
      .send({ error: true, message: "Old transaction PIN is required" });
  if (!req.body.newPin)
    return res
      .status(400)
      .send({ error: true, message: "New Transaction PIN is required" });

  const { error } = validateUser(req.body);
  if (error)
    return res
      .status(400)
      .send({ error: true, message: error.details[0].message });

  const user = await User.findById(req.user._id);

  if (!user.oldPin) {
    return res.status(400).send({
      error: true,
      message: "Sorry you don't have a pin, please create a new one",
    });
  }
  const validPin = await bcrypt.compare(req.body.oldPin, user.oldPin);
  //const validPin = req.body.oldPin === user.oldPin;

  if (!validPin)
    return res
      .status(400)
      .send({ error: true, message: "Old Pin does not match" });

  const salt = await bcrypt.genSalt(10);

  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        oldPin: await bcrypt.hash(req.body.newPin, salt),
        newPin: await bcrypt.hash(req.body.newPin, salt),
        //oldPin: req.body.newPin,
        //newPin: req.body.newPin
      },
    },
    { new: true }
  );

  if (!updatedUser)
    return res.status(404).send({
      error: true,
      message: "The user with the given ID was not found.",
    });

  res.send({
    status: 200,
    error: false,
    message: "Transaction PIN Updated Successfully",
  });
});

//user update profile endpoint
router.post("/:id", [auth, validateObjectId], async (req, res) => {
  console.log(req)
  const { error } = validateUserUpdate(req.body);
  console.log(error+'err')
  console.log('yh')
  if (error)
    return res
      .status(400)
      .send({ error: true, message: error.details[0].message });

  const user = await User.findByIdAndUpdate(req.params.id, {
    $set: {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      username: req.body.username,
    },
  });
  console.log(user)

  if (!user)
    return res.status(404).send({
      error: true,
      message: "The user with the given ID was not found.",
    });

  res.send({
    error: false,
    data: _.pick(user, [
      "_id",
      "fullName",
      "username",
      "phoneNumber",
      "email",
      "balance",
    ]),
  });
});

//user update profile endpoint
router.post("/update/:id", [auth],
upload.single("image"), async (req, res) => {
  req.body.dateOfBirth= req.body.dateOfBirth.toString()
  console.log(req)
  const { error } = validateUserUpdate(req.body);
  if (error)
    return res
      .status(400)
      .send({ error: true, message: error.details[0].message });
  
  let img
  User.findById(req.params.id,(user)=> {
    img= user.image
  })

  if(req.file){
    img= req.file
  }

  const user = await User.findByIdAndUpdate(req.params.id, {
    $set: {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      username: req.body.username,
      email: req.body.email,
      phoneNumber: req.body.phoneNumber,
      gender: req.body.gender,
      username: req.body.username,
      location: req.body.location,
      dateOfBirth: req.body.dateOfBirth.toString()
    },
  });
  console.log(user)

  if (!user)
    return res.status(404).send({
      error: true,
      message: "The user with the given ID was not found.",
    });

  res.send({
    error: false,
    data: _.pick(user, [
      "_id",
      "fullName",
      "username",
      "phoneNumber",
      "email",
      "balance",
    ]),
  });
});

//suspend user
router.get(
  "/suspend_user/:id",
  [auth],
  async (req, res) => {
    var user1= {}
    User.findById(req.user._id,(user)=> {
      user1= user
    }).catch((err)=>{
      return res.status(404).send({
        error: true,
        message: "The user with the given ID was not found.",
      });
    });

    const user2= await User.findByIdAndUpdate(req.params.id, {
      $set: {
        isSuspended: true,
        suspended_at: Date.now(),
        suspensions: user1.suspensions+1
        }
      }, {upsert: true}
      )


    return res
      .status(200)
      .send({ error: false, message: "User suspended" });
    }
);

//lift suspension
router.get(
  "/reinstate_user/:id",
  [auth],
  async (req, res) => {

    const user2= await User.findByIdAndUpdate(req.params.id, {
      $set: {
        isSuspended: false,
        }
      }, {upsert: true}
      )


    return res
      .status(200)
      .send({ error: false, message: "User reinstated" });
    }
);

//delete user
router.get(
  "/delete_user/:id",
  [auth],
  async (req, res) => {
  const user = await User.deleteOne({_id: req.params.id});

    if (!user)
      return res.status(404).send({
        error: true,
        message: "The user with the given ID was not found.",
      });

    return res
      .status(200)
      .send({ error: false, message: "Successfully deleted user" });
  }
);

//user update profile picture endpoint
router.post(
  "/changePicture",
  [auth],
  upload.single("image"),
  async (req, res) => {
    const user = await User.findByIdAndUpdate(req.user._id, {
      image: req.file,
    });

    if (!user)
      return res.status(404).send({
        error: true,
        message: "The user with the given ID was not found.",
      });

    return res
      .status(200)
      .send({ error: false, message: "Successfully updated profile picture" });
  }
);

//get a user
router.get("/:id", auth, async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user)
    return res.status(404).send({
      error: true,
      message: "The user with the given ID was not found.",
    });

  let result = { status: "success", error: false, data: user };
  res.send(result);
});

module.exports = router;
