const Joi = require("joi");
const _ = require("lodash");
const bcrypt = require("bcryptjs");
const { User } = require("../models/user");
const { Admin } = require("../models/admin");
const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");

// twillo
const accountSid = "AC55ebdf70ec5f7664d63b9155e844205d";
const authToken = "915c0dd3e4884edffe2b1aeb0cb8ef26";
const client = require("twilio")(accountSid, authToken);

const { TwoFA } = require("../models/twoFA");

//sendgrid
const sgMail = require("@sendgrid/mail");
const sendgrid_key = process.env.sendgrid;
sgMail.setApiKey(sendgrid_key);

var authy = require("authy")(process.env.authy);

router.post("/", async (req, res) => {
  const { error } = validate(req.body);
  if (error)
    return res
      .status(400)
      .send({ error: true, message: error.details[0].message });

  let user = await User.findOne({ email: req.body.email });
  if (!user)
    return res
      .status(400)
      .send({ error: true, message: "User does not exist" });

  const validPassword = await bcrypt.compare(req.body.password, user.password);

  if (!validPassword)
    return res.status(400).send({ error: true, message: "Invalid passsword" });

  // /twilio auth (review this when the twilio account is provided)
  //   let num = user.phoneNumber;
  //   console.log(num);
  //   let num1 = num.substring(1);
  //   num1 = `+234${num1}`;
  //   console.log(num1);

  //   client.verify
  //     .services("VA8df62e91595513d7b429cdfb12b28363")
  //     .verifications.create({ to: num1, channel: "sms" })
  //     .then((verification) => console.log(verification));
  //   let randomStringToken = Math.floor(100000 + Math.random() * 900000);

  //   const salt = await bcrypt.genSalt(10);
  //   const twofaId = await bcrypt.hash(randomStringToken.toString(), salt);

  //   await User.findByIdAndUpdate(user._id, {
  //     $set: {
  //       twofaId: twofaId,
  //     },
  //   });

  //   await client.messages
  //     .create({
  //       body: `Your Awoof verification code is ${randomStringToken}`,
  //       from: "+1 213 516 9881",
  //       to: num,
  //     })
  //     .then((message) => {
  //       console.log("got here", message.sid);
  //     });

  const token = user.generateAuthToken();
  const result = {
    idToken: token,
    _id: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    username: user.username,
    email: user.email,
    phoneNumber: user.phoneNumber,
    gender: user.gender,
    location: user.location,
    userRef: user.userRef,
    balance: user.balance,
    isPinSet: user.isPinSet,
    isAccountSet: user.isAccountSet,
    isVerified: user.isVerified,
    isAdmin: user.isAdmin,
  };

  // Make sure the user has been verified
  // if (!user.isVerified) {
  //   res.status(401).send(result);
  //   authy.register_user(user.email, user.phoneNumber, '+234', function (
  //     regErr,
  //     regRes
  //   ) {
  //     if (regErr) {
  //       //console.log(regErr);
  //     } else if (regRes) {
  //       //console.log(regRes);
  //       user.twofaId = regRes.user.id;
  //       user.save(function (err) {
  //         if (err) {
  //         } else {
  //         }
  //       });
  //       authy.request_sms(regRes.user.id, function (smsErr, smsRes) {
  //         if (smsErr) {
  //         } else if (smsRes) {
  //         }
  //       });
  //     }
  //   });
  // }

  // to be used later when 2fa is added
  // authy.request_sms(user.twofaId, function (smsErr, smsRes) {
  //   if (smsErr) {
  //     return res.status(400).send({
  //       status: false,
  //       message: 'Unable to send OTP code',
  //     });
  //   } else if (smsRes) {
  //     // res.status(200).send({
  //     //   status: true,
  //     //   message: 'OTP send to cellphone attached to this account',
  //     // });
  //     res.send(result);
  //   }
  // });

  return res
    .status(200)
    .send({ error: false, message: "success", data: result });
});

// login admin
router.post("/admin", async (req, res) => {
  if (!req.body.email)
    return res.status(400).send({ error: true, message: "email is required" });
  if (!req.body.password)
    return res
      .status(400)
      .send({ error: true, message: "password is required" });
console.log(req.body )
console.log('req.body')
  let emailCheck = await Admin.findOne({ email: req.body.email });

  if (!emailCheck) {
    return res.status(400).send({
      error: true,
      message:
        "Admin with this email does not exist, please pick a different email",
    });
  }

  let user = await Admin.findOne({ email: req.body.email });
   console.log(user)
   console.log('user')
  if (!user.isAdmin && !user.isSuperAdmin) {
    return res.status(400).send({
      error: true,
      message: "email is not registered to an admin account",
    });
  }

  if (!user.isActive) {
    return res.status(400).send({
      error: true,
      message:
        "your account is inactive please contact the super administrator",
    });
  }

  const validPassword = await bcrypt.compare(req.body.password, user.password);
  console.log(validPassword)
  console.log('validPassword')
  if (!validPassword)
    return res.status(400).send({ error: true, message: "Invalid passsword" });

  const token = user.generateAuthToken();
  console.log(token)
  console.log('token')
  const result = {
    idToken: token,
    _id: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    username: user.username,
    email: user.email,
    phoneNumber: user.phoneNumber,
    gender: user.gender,
    location: user.location,
    userRef: user.userRef,
    balance: user.balance,
    isPinSet: user.isPinSet,
    isAccountSet: user.isAccountSet,
    isVerified: user.isVerified,
    isAdmin: user.isAdmin,
  };
  console.log(result)
  console.log('result')

  return res
    .status(200)
    .send({ error: false, message: "success", data: result });
});

//validates user pin
router.post("/verify_pin", auth, async (req, res) => {
  let user = await User.findOne({ _id: req.user._id });
  if (!user)
    return res.status(400).send({ error: true, message: "User not found" });

  //use pin here
  const validPassword = await bcrypt.compare(req.body.pin, user.newPin);

  if (!validPassword)
    return res
      .status(400)
      .send({ error: true, message: "Invalid pin, please try again" });

  return res.status(200).send({ error: false, message: "success" });
});

//twofa
router.post("/resend_two_fa", async (req, res) => {
  let num = req.body.phoneNumber;

  let num1 = num.substring(1);
  //   num1 = `+234${num1}`;

  //   client.verify
  //     .services("VA8df62e91595513d7b429cdfb12b28363")
  //     .verifications.create({ to: num1, channel: "sms" })
  //     .then((verification) => {
  //       console.log(verification.status);
  //     });

  let randomStringToken = Math.floor(100000 + Math.random() * 900000);

  const salt = await bcrypt.genSalt(10);
  const twofaId = await bcrypt.hash(randomStringToken.toString(), salt);

  await TwoFA.create({
    phone: num,
    code: twofaId,
  });

  client.messages
    .create({
      body: `Your Awoof verification code is ${randomStringToken}, if you already verified your account, kindly ignore this`,
      from: "+1 213 516 9881",
      to: num,
    })
    .then((message) => console.log(message.sid));

  res.status(200).send({ error: false, message: "2fa code sent successfully" });
});

router.post("/resend_email_two_fa", async (req, res) => {
  let num = req.body.phoneNumber;

  let randomStringToken = Math.floor(100000 + Math.random() * 900000);

  const salt = await bcrypt.genSalt(10);
  const twofaId = await bcrypt.hash(randomStringToken.toString(), salt);

  await TwoFA.create({
    phone: num,
    code: twofaId,
  });

  const msg = {
    to: req.body.email,
    from: {
      email: "support@awoofapp.com",
      name: "Awoof App",
    }, //awoofapp.com
    templateId: "d-4940b022c5ea400799d3dea17904cd38",
    dynamic_template_data: {
      token: randomStringToken,
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

  res.status(200).send({ error: false, message: "2fa code sent successfully" });
});

router.post("/verify_two_fa", async (req, res) => {
  try {
    let num = req.body.phoneNumber;

    let user = await TwoFA.findOne({ phone: req.body.phoneNumber }).sort({
      createdAt: -1,
    });

    const validToken = await bcrypt.compare(
      req.body.token.toString(),
      user.code
    );
    if (!validToken) {
      return res.status(401).send({ error: true, message: "incorrect token" });
    }

    // await User.findByIdAndUpdate(user._id, {
    //   $set: {
    //     isVerified: true, //I'm changing this i the user's model to always be true since I'm using another model for verification and user is created afterwards
    //   },
    // });

    return res
      .status(200)
      .send({ error: false, message: "2fa token was correct" });

    // client.verify
    //   .services("VA8df62e91595513d7b429cdfb12b28363")
    //   .verificationChecks.create({ to: num1, code: req.body.code })
    //   .then((verification) => {
    //
    //     res.send({
    //       error: false,
    //       message: verification.status,
    //     });
    //   });
  } catch (e) {
    console.log(e);
    res.status(500).send({ error: true, message: "could not verify 2fa" });
  }
});

function validate(req) {
  const schema = {
    email: Joi.string().required(),
    password: Joi.string().min(6).max(255).required(),
  };

  return Joi.validate(req, schema);
}

module.exports = router;
