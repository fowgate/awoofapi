const auth = require("../middleware/auth");
const admin = require("../middleware/admin");
const util = require("util");
const { Giveaway, validateGiveaway } = require("../models/giveaway");
const { EnterGiveaway } = require("../models/enterGiveaway");
const { User } = require("../models/user");
const { Admin } = require("../models/admin");
const { Participant } = require("../models/participants");
const {
  sendNotification,
  sendPersonalNotification,
} = require("../Helpers/sendFirebaseNotification");
const { WiningsHistory } = require("../models/winingsHistory");
const { OutsideWinners } = require("../models/outsideWinners");

const moment = require("moment");
const Fawn = require("fawn");

const express = require("express");
const router = express.Router();
const uniqid = require("uniqid");

const request = require("request");
const axios = require("axios");

//sendgrid
const sgMail = require("@sendgrid/mail");
const sendgrid_key = process.env.sendgrid;
sgMail.setApiKey(sendgrid_key);

// Image Upload things
const aws = require("aws-sdk");
const multer = require("multer");
const multerS3 = require("multer-s3");

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
    cb(null, "./uploads/giveaways/");
  },
  filename: function (req, file, cb) {
    cb(null, new Date().toISOString() + file.originalname);
  },
});

const upload = multer({
  storage: multerS3({
    acl: "public-read",
    s3: s3,
    bucket: "awoof-giveaways",
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

// Get the Giveaway history for currently logged-in user
router.get("/me", auth, async (req, res) => {
  await Giveaway.find({ user: req.user._id })
    .populate("user")
    .populate("admin")
    .sort({ createdAt: -1 })
    .exec((err, giveaway) => {
      if (err) {
        return res
          .status(500)
          .send({ error: true, message: "Database operation failed" });
      }
      return res.status(200).send({
        error: false,
        message: "Sucessfully fetched history",
        data: giveaway,
      });
    });
});

//get all giveaways won
router.get("/get_my_wins", auth, async (req, res) => {
  const preWinnings = await WiningsHistory.find({ user: req.user._id }).sort({
    createdAt: -1,
  });

  const winnings = await WiningsHistory.populate(preWinnings, {
    path: "user giveaway_id",
    populate: {
      path: "user",
    },
  });

  return res
    .status(200)
    .send({ status: "success", error: false, data: winnings });
});

// Send giveaway payment email
router.get("/send_mail/:id", auth, async (req, res) => {
  const user= await User.findById(req.user._id)
     const msg = {
       to: user.email,
       from: {
         email: "support@awoofapp.com",
         name: "Awoof App",
       }, //awoofapp.com
       html: `<!DOCTYPE html>
        <html>
        <body>
        <p>Dear ${user.firstName},</p>
        <p>Thank you for your request to Bless Others by doing a Giveaway in Awoof. Please kindly use the details below to make a direct transfer and complete the final steps.</p>
        <p>
          Account Name: Philantro Technologies<br/>
          Account Number: 5402045534<br/>
          Bank: Providus Bank
        </p>
        <p>Note: Awoof will not ask you for your personal details and DO NOT pay into any other account other than the one stated above.</p>
        <p>
          Best regards,<br/>
          Ibrahim Alabi<br/>
          Customer Service<br/>
        </p>
        <body>
        </html>
        `,
        subject: 'Giveaway Payment'
       //html: htmlTemplate,
       //content: [{type: 'text/html', value: htmlTemplate}],
       //templateId: "d-5bc2acfc58e24404b8bab7b8b6f5f98e",
       // dynamic_template_data: {
       //   name: user.firstName,
       //   value: amount,
       //   date: moment(Date.now()).startOf("day").format("LL"),
       // },
     };
     console.log(msg)
     
     sgMail.send(msg, (err, result) => {
       console.log(result);
       if (err) {
         console.log(err);
         console.log(err.message);
         // return res
         //   .status(200)
         //   .send({ error: "false", message: "email didn't send" });
       }
     });
 });

// Get all Giveaway History in DB
router.get("/", auth, async (req, res) => {
  await Giveaway.find()
    .populate("user admin")
    .sort({ createdAt: -1 })
    .exec((err, giveaway) => {
      if (err) {
        return res
          .status(500)
          .send({ error: true, message: "Database operation failed" });
      }
      return res.status(200).send({
        error: false,
        message: "Sucessfully fetched history",
        data: giveaway,
      });
    });
});

// Get all Giveaway history in DB by date
router.get("/data", auth, async (req, res) => {
  await Giveaway.find()
    .populate("user")
    .select("-__v")
    .exec((err, giveawayHistories) => {
      if (err) {
        return res
          .status(500)
          .send({ error: true, message: "Database operation failed" });
      }
      // this gives an object with dates as keys
      const groups = giveawayHistories.reduce((groups, giveaway) => {
        let date = moment(giveaway.createdAt).startOf("day").format("LL");

        if (!groups[date]) {
          groups[date] = [];
        }
        groups[date].push({
          amount: giveaway.amount,
          date: giveaway.createdAt,
        });
        return groups;
      }, {});

      // Edit: to add it in the array format instead
      const groupArrays = Object.keys(groups).map((date) => {
        let total = 0;
        let finalSum = 0;
        let dailyTransaction = [];

        for (am of groups[date]) {
          total = total + am.amount;
          dailyTransaction.push(total);
          finalSum = dailyTransaction.reduce((a, b) => a + b, 0);
          total = 0;
        }

        return {
          date,
          giveaways: finalSum,
        };
      });
      let result = { message: "success", error: false, data: groupArrays };
      res.send(result);
    });
});

// get current running giveaways
router.get("/current/normalGiveaways", [auth, admin], async (req, res) => {
  await Giveaway.find({ type: "normal" })
    .populate("user")
    .exec((err, giveaways) => {
      if (err) {
        return res
          .status(500)
          .send({ error: true, message: "Database operation failed" });
      }
      return res.status(200).send({
        error: false,
        message: "Sucessfully fetched giveaways",
        data: giveaways,
      });
    });
});

// get star giveaways
router.get("/current/starGiveaways", [auth, admin], async (req, res) => {
  await Giveaway.find({ type: "star" })
    .populate("user")
    .exec((err, giveaways) => {
      if (err) {
        return res
          .status(500)
          .send({ error: true, message: "Database operation failed" });
      }
      return res.status(200).send({
        error: false,
        message: "Sucessfully fetched giveaways",
        data: giveaways,
      });
    });
});

// create a new giveaway endpoint
router.post(
  "/",
  auth,
  util.promisify(upload.single("image")),
  async (req, res) => {
    try {
      // if (req.file && req.file.size > 5242880)
      //     return res.status(400).send('Ad Image can only be 5MB max');

      // const { error } = validateGiveaway(req.body);
      // if (error) return res.status(400).send(error.details[0].message);
      const users= await User.find({_id: {$nin: req.user._id}})
      const giveaway_ref = uniqid("GV|").toUpperCase();

      const amount = parseFloat(req.body.amount);
      const amountPerWinner = parseFloat(req.body.amountPerWinner);

      const numberOfWinners = amount / amountPerWinner;

      // if (req.body.payment_type.toLowerCase() != "wallet") {
      //   const verify = await axios.get(
      //     `https://api.paystack.co/transaction/verify/${req.body.payment_reference}`,
      //     {
      //       headers: {
      //         Authorization: `Bearer ${process.env.paystack}`,
      //         "Content-type": "application/json",
      //       },
      //     }
      //   );
      //   if (verify.data.status == false) {
      //     return res.status(400).json({
      //       error: true,
      //       message:
      //         "We are having some trouble posting your giveaway right now, please try again later",
      //     });
      //   }

      //   if (verify.data.data.status != "success") {
      //     return res.status(400).json({
      //       error: true,
      //       message:
      //         "We are having some trouble depositing your funds right now, please try again later",
      //     });
      //   }
      // }

      const giveaway = new Giveaway({
        user: req.user._id,
        type: req.body.type,
        amount: req.body.amount,
        amountPerWinner: req.body.amountPerWinner,
        numberOfWinners: numberOfWinners,
        isAnonymous: req.body.isAnonymous,
        frequency: req.body.frequency,
        message: req.body.message,
        payment_type: req.body.payment_type,
        likeTweet: req.body.likeTweet,
        followTwitter: req.body.followTwitter,
        likeInstagram: req.body.likeInstagram,
        followInstagram: req.body.followInstagram,
        likeFacebook: req.body.likeFacebook,
        likeTweetLink: req.body.likeTweetLink,
        followTwitterLink: req.body.followTwitterLink,
        likeInstagramLink: req.body.likeInstagramLink,
        followInstagramLink: req.body.followInstagramLink,
        likeFacebookLink: req.body.likeFacebookLink,
        giveaway_ref: giveaway_ref,
        payment_reference: req.body.payment_reference,
        payment_status: req.body.payment_status,
        gateway_response: req.body.gateway_response,
        image: req.file,
        expiry: req.body.expiry,
        endAt: Date.parse(req.body.endAt),
      });

      await giveaway.save();

      var parts=[]
      for(i=0; i<users.length; i++){
        parts=[...parts, users[i]._id]
        console.log(parts)
          const participant = await new Participant({
            user: users[i]._id,
            giveaway_id: giveaway._id,
          });
          await participant.save();
          let giveawaysParticipated = users[i].giveawaysParticipated + 1;
          await User.findByIdAndUpdate(
            users[i]._id,
            {
              $set: {
                giveawaysParticipated: giveawaysParticipated,
              },
            },
            { new: true }
          );
          
      }


      await User.findByIdAndUpdate(req.user._id, {
        $inc: {
          giveawaysDone: +1,
        },
      });

      //send email thanking the user
      // const msg = {
      //   to: user.email,
      //   from: {
      //     email: "support@awoofapp.com",
      //     name: "Awoof App",
      //   }, //awoofapp.com
      //   templateId: "d-5bc2acfc58e24404b8bab7b8b6f5f98e",
      //   dynamic_template_data: {
      //     name: user.firstName,
      //     value: amount,
      //     date: moment(Date.now()).startOf("day").format("LL"),
      //   },
      // };
      // sgMail.send(msg, (err, result) => {
      //   if (err) {
      //     console.log(err.message);
      //     // return res
      //     //   .status(200)
      //     //   .send({ error: "false", message: "email didn't send" });
      //   }
      // });

      const new_giveaway = await Giveaway.findById(giveaway._id)
        .populate("user")
        .populate("admin");

      //send firebase notification
      sendNotification(req.user._id, new_giveaway);
      // sendPersonalNotification(req.user._id, new_giveaway);
      const user= await User.findById(req.user._id)
      const msg = {
        to: user.email,
        from: {
          email: "support@awoofapp.com",
          name: "Awoof App",
        }, //awoofapp.com
        html: `<!DOCTYPE html>
         <html>
         <body>
         <p>Dear ${user.firstName},</p>
         <p>Thank you for your request to Bless Others by doing a Giveaway in Awoof. Please kindly use the details below to make a direct transfer and complete the final steps.</p>
         <p>
           Account Name: Philantro Technologies<br/>
           Account Number: 5402045534<br/>
           Bank: Providus Bank
         </p>
         <p>Note: Awoof will not ask you for your personal details and DO NOT pay into any other account other than the one stated above.</p>
         <p>
           Best regards,<br/>
           Ibrahim Alabi<br/>
           Customer Service<br/>
         </p>
         <body>
         </html>
         `,
         subject: 'Giveaway Payment'
        //html: htmlTemplate,
        //content: [{type: 'text/html', value: htmlTemplate}],
        //templateId: "d-5bc2acfc58e24404b8bab7b8b6f5f98e",
        // dynamic_template_data: {
        //   name: user.firstName,
        //   value: amount,
        //   date: moment(Date.now()).startOf("day").format("LL"),
        // },
      };
      console.log(msg)
      
      sgMail.send(msg, (err, result) => {
        console.log(result);
        if (err) {
          console.log(err);
          console.log(err.message);
        }
      });

      return res
        .status(200)
        .send({ message: "success", error: false, data: giveaway });
    } catch (e) {
      // await User.findByIdAndUpdate(req.user._id, {
      //   $inc: {
      //     balance: +req.body.amount,
      //   },
      // });
      return res.status(400).json({
        error: false,
        message: "sorry your giveaway could not be posted, please try again",
      });
    }
  }
);

// confirm giveaway payment
router.get("/confirm_manual_pay/:id", auth, async (req, res) => {
  console.log(req.params.id)
  const giveaway = await Giveaway.findByIdAndUpdate(
    req.params.id,
    {
      $set: {
        manualPaid: true,
      },
    },
    { new: true }
  );

  
  res.send({ error: false, status: "success", data: giveaway});
});

// set giveaway winners
router.get("/preset_giveaway_winners/:id", auth, async (req, res) => {
  const giveaway = await Giveaway.findById(req.params.id);
  const participants = await Participant.find({giveaway_id: req.params.id});

  // if (giveaway.minimumstars > user.stars) {
  //   return res.status(400).send({
  //     error: true,
  //     message: "Sorry you don't have enough stars to join this giveaway",
  //   });
  // }

  // if (Date.now() > Date.parse(giveaway.endAt) == true) {
  //   console.log('expired')
  //   return res
  //     .status(400)
  //     .send({ error: true, message: "This Giveaway has expired" });
  // }
  // if (giveaway.user == req.user._id)
  //   return res
  //     .status(401)
  //     .send({ error: true, message: "You cannot join this giveaway 🌚" });

  if (!giveaway)
    return res.status(404).send({
      error: true,
      message: "The Giveaway with the given ID was not found.",
    });
  
  var parts=[]
  var checkIt= (num, arr)=>{
    return arr.find(one=>{
     return one == num
    })
  }


  var winners= []
  var randoms= []
  var winings= []
  var temp=[]
  var checkMaxedOut= (num, arr)=>{
    var temp= true
    for (let index = 0; index < num; index++) {
      if(arr.find(ar=>index==ar)>=0){
        continue 
      } else {
        temp= false
      }
    }
    return temp
  }
  for (let index = 0; index < giveaway.numberOfWinners; index++) {
    console.log(index+' before before before')
    var newRandom= Math.floor(Math.random()*participants.length)
    if(!checkIt(newRandom, randoms)){
      console.log(index+' before b4')
      randoms= [...randoms, newRandom]
    } else {
      console.log(index+' before')
      if(checkMaxedOut(giveaway.numberOfWinners, randoms)){
        continue
      } else {
        index= index-1
      }
      console.log(index+' after')
    }  
  }

  for (let index = 0; index < randoms.length; index++) {
    winners= [...winners, participants[randoms[index]]._id]
    temp= [...temp, participants[randoms[index]].user] 
  }
  console.log(winners)
  await Participant.updateMany(
    {
      _id: { $in: winners },
    },
    { $set: { win: true } }
  );
  await User.updateMany(
    {
      _id: { $in: temp },
    },
    {
      $inc: {
        balance: +giveaway.amountPerWinner,
        giveawaysWon: +1,
        giveawaysAmountWon: +giveaway.amountPerWinner,
      },
    }
  );
  temp.forEach(winner=>{
    winings.push({
      user: winner,
      giveaway_id: giveaway._id,
      amount: giveaway.amountPerWinner,
    });
  })
  
  if(giveaway.numberOfWinners>randoms.length){
    
    const giveaway2 = await Giveaway.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          winRemain: giveaway.numberOfWinners-randoms.length,
          done: true,
          completed: true
        },
      },
      { new: true }
    );
    console.log(giveaway2)
  } else {
    const giveaway1 = await Giveaway.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          done: true,
          completeWinners: true,
          completed: true
        },
      },
      { new: true }
    );
    console.log(giveaway1)
  }
 //update all participants and set winners
 

  //create winings histories
  await WiningsHistory.create(winings);

  console.log('yup')

  res.send({ error: false, status: "success", data: winners});

});
// complete set giveaway winners
router.get("/complete_giveaway_winners/:id", auth, async (req, res) => {
  const giveaway = await Giveaway.findById(req.params.id);
  var pre_parts= await Participant.find({giveaway_id: req.params.id});
  var pre_parts_arr= [giveaway.user]
  for (let index = 0; index < pre_parts.length; index++) {
    pre_parts_arr = [...pre_parts_arr, pre_parts[index].user]; 
  }
  const users = await User.find({_id: {$nin: pre_parts_arr}});


  var parts=[]
  var newParticipants=[]
  console.log(users.length)
  for(i=0; i<users.length; i++){
    parts=[...parts, users[i]._id]
    console.log(parts)
      const participant = await new Participant({
        user: users[i]._id,
        giveaway_id: giveaway._id,
      });
      await participant.save();
      newParticipants=[...newParticipants, participant._id]
      console.log(participant)
      let giveawaysParticipated = users[i].giveawaysParticipated + 1;
      await User.findByIdAndUpdate(
        users[i]._id,
        {
          $set: {
            giveawaysParticipated: giveawaysParticipated,
          },
        },
        { new: true }
      );
      console.log(participant)
      
  }

  var checkIt= (num, arr)=>{
    return arr.find(one=>{
     return one == num
    })
  }
  var winners= []
  var randoms= []
  var winings= []
  var temp=[]
  var checkMaxedOut= (num, arr)=>{
    var temp= true
    for (let index = 0; index < num; index++) {
      if(arr.find(index)>=0){
        continue 
      } else {
        temp= false
      }
    }
    return temp
  }
  for (let index = 0; index < giveaway.winRemain; index++) {
    console.log(index+' before before before')
    var newRandom= Math.floor(Math.random()*newParticipants.length)
    if(!checkIt(newRandom, randoms)){
      console.log(index+' before b4')
      randoms= [...randoms, newRandom]
    } else {
      console.log(index+' before')
      if(checkMaxedOut(giveaway.winRemain, randoms)){
        continue
      } else {
        index= index-1
      }
      console.log(index+' after')
    }  
  }
  console.log(parts)
  for (let index = 0; index < randoms.length; index++) {
    winners= [...winners, newParticipants[randoms[index]]]
    temp= [...temp, parts[randoms[index]]] 
  }
  temp.forEach(winner=>{
    winings.push({
      user: winner,
      giveaway_id: giveaway._id,
      amount: giveaway.amountPerWinner,
    });
  })
  if(giveaway.winRemain>randoms.length){
    
    const giveaway2 = await Giveaway.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          winRemain: giveaway.winRemain-randoms.length,
          done: true,
        },
      },
      { new: true }
    );
  } else {
    const giveaway1 = await Giveaway.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          done: true,
          completeWinners: true
        },
      },
      { new: true }
    );
  }
 //update all participants and set winners
 await Participant.updateMany(
    {
      _id: { $in: winners },
    },
    { $set: { win: true } }
  );
  await User.updateMany(
    {
      _id: { $in: temp },
    },
    {
      $inc: {
        balance: +giveaway.amountPerWinner,
        giveawaysWon: +1,
        giveawaysAmountWon: +giveaway.amountPerWinner,
      },
    }
  );

  //create winings histories
  await WiningsHistory.create(winings);

  console.log('yup')

  res.send({ error: false, status: "success", data: winners});



})


//endpoint to enter a search giveaways
router.post("/search", auth, async (req, res) => {
  if (!req.body.query)
    return res.status(400).send({ error: true, message: "query is required!" });

  await Giveaway.find({ message: { $regex: ".*" + req.body.query + ".*" } })
    .populate("user")
    .limit(15)
    .exec((err, giveaways) => {
      if (err) {
        return res
          .status(500)
          .send({ error: true, message: "Database operation failed" });
      }
      if (!giveaways) {
        return res.status(200).send({
          error: false,
          giveaways: "empty",
        });
      } else {
        return res.status(200).send({
          error: false,
          giveaways: giveaways,
        });
      }
    });
});

//endpoint to enter a specific giveaway
router.post("/enter/:id", auth, async (req, res) => {
  if (!req.body.giveawayID)
    return res
      .status(400)
      .send({ error: true, message: "giveawayID is required!" });
  if (!req.params.id)
    return res
      .status(400)
      .send({ error: true, message: "Account id is required!" });
  let user = await User.findOne({ _id: req.params.id });
  let giveaway = await Giveaway.findOne({ _id: req.body.giveawayID });
  if (!giveaway)
    return res
      .status(400)
      .send({ error: true, message: "Invalid giveaway id" });

  // check if user can participate in the giveaway

  let enterGiveaway = new EnterGiveaway({
    entererID: req.params.id,
    userID: giveaway.user,
    giveawayID: giveaway._id,
    amount: giveaway.amount,
    message: giveaway.message,
    isAnonymous: giveaway.isAnonymous,
    expiry: giveaway.expiry,
    createdAt: giveaway.createdAt,
  });

  await enterGiveaway.save();

  return res.status(200).send({
    error: false,
    data: enterGiveaway,
  });
});

//Admin can update a giveaway
router.put("/:id", [auth, admin], async (req, res) => {
  // const { error } = validateGiveaway(req.body);
  // if (error)
  //   return res
  //     .status(400)
  //     .send({ error: true, message: error.details[0].message });

  // const amount = (Number(req.body.amount) * 100) / 100;
  // const amountPerWinner = (Number(req.body.amountPerWinner) * 100) / 100;

  // const numberOfWinners = amount / amountPerWinner;

  const giveaway = await Giveaway.findByIdAndUpdate(req.params.id, {
    $set: {
      // minimumstars: Number(req.body.minimumstars),
      // amount: Number(req.body.amount),
      // amountPerWinner: Number(req.body.amountPerWinner),
      // numberOfWinners: numberOfWinners,
      // message: req.body.message,
      followPageOnFacebook: req.body.followPageOnFacebook,
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
    },
  });

  if (!giveaway)
    return res.status(404).send({
      error: true,
      message: "The Giveaway with the given ID was not found.",
    });

  let result = { message: "success", error: false, data: giveaway };
  res.send(result);
});

router.delete("/:id", [auth, admin], async (req, res) => {
  const giveaway = await Giveaway.findByIdAndRemove(req.params.id);

  if (!giveaway)
    return res.status(404).send({
      error: true,
      message: "The Giveaway with the given ID was not found.",
    });

  let user = await User.findById(giveaway.user);
  if (!user) {
    let admin = await Admin.findById(giveaway.admin);
    if (!admin) {
      return res.status(400).send({
        error: true,
        message: "The User that created this Giveaway no longer exist on Awoof",
      });
    }
  }

  try {
    new Fawn.Task()
      .update(
        "users",
        { _id: user._id },
        {
          $inc: { balance: +giveaway.amount, giveawaysWon: +1 },
        }
      )
      .run();

    let result = { message: "success", error: false, data: giveaway };
    res.send(result);
    res.end();
  } catch (ex) {
    res.status(500).send({ error: true, message: "Something went wrong." });
  }
});

// get the details of a Giveaway
router.get("/:id", [auth], async (req, res) => {
  await Giveaway.findById(req.params.id)
    .populate("user")
    .exec((err, giveaway) => {
      if (err)
        return res
          .status(500)
          .send({ error: true, message: "Database operation failed" });
      if (!giveaway)
        return res.status(404).send({
          error: true,
          message: "The Giveaway with the given ID was not found.",
        });

      return res.status(200).send({
        error: false,
        message: "Sucessfully fetched giveaway",
        data: giveaway,
      });
    });
});

// join a giveaway
router.get("/join/:id", auth, async (req, res) => {
  const giveaway = await Giveaway.findById(req.params.id);

  let user = await User.findOne({ _id: req.user._id });

  if (giveaway.minimumstars > user.stars) {
    return res.status(400).send({
      error: true,
      message: "Sorry you don't have enough stars to join this giveaway",
    });
  }

  if (Date.now() > Date.parse(giveaway.endAt) == true) {
    return res
      .status(400)
      .send({ error: true, message: "This Giveaway has expired" });
  }

  if (giveaway.user == req.user._id)
    return res
      .status(401)
      .send({ error: true, message: "You cannot join this giveaway 🌚" });

  if (!giveaway)
    return res.status(404).send({
      error: true,
      message: "The Giveaway with the given ID was not found.",
    });

  // check if user is already participating

  const part = await Participant.find({
    user: req.user._id,
    giveaway_id: req.params.id,
  });

  // console.log(part, part.length);

  if (part.length != 0)
    return res.status(400).send({
      error: true,
      message: "You are already participating in this giveaway 🌚 ",
    });

  const participant = new Participant({
    user: req.user._id,
    giveaway_id: req.params.id,
  });

  // reduce user's stars
  let new_stars = user.stars - giveaway.minimumstars;
  let giveawaysParticipated = user.giveawaysParticipated + 1;

  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        stars: new_stars,
        giveawaysParticipated: giveawaysParticipated,
      },
    },
    { new: true }
  );

  await participant.save();

  res.send({ error: false, status: "success", data: participant });
});


// check if a user is already participating in a giveaway
router.get("/checkParticipant/:id", auth, async (req, res) => {
  const part = await Participant.find({
    user: req.user._id,
    giveaway_id: req.params.id,
  });

  //if the user is the owner of this giveaway throw an error message below
  const giveaway = await Giveaway.findById(req.params.id);

  if (req.user._id == giveaway.user) {
    return res.status(200).send({
      error: false,
      message: "Unable to participate in own giveaway",
      data: true,
    });
  }

  if (part.length != 0) {
    return res.status(200).send({
      error: false,
      message: "You are already participating in this giveaway 🌚 ",
      data: true,
    });
  } else {
    return res.status(200).send({
      error: false,
      message: "You are not participating in this giveaway 🌚 ",
      data: false,
    });
  }
});

// get list of giveaway winners by giveaway
router.get("/winners/:id", auth, async (req, res) => {
  const giveaway = await Giveaway.findById(req.params.id).populate(
    "giveaway_id"
  );

  if (!giveaway)
    return res.status(404).send({
      error: true,
      message: "The Giveaway with the given ID was not found.",
    });

  // compare time to see if the giveaway has ended

  let winners = [];
  let msg = "This giveaway has not ended, there are no winners yet";

  if (giveaway.completed) {
    // giveaway has ended
    const participants = await Participant.find({
      giveaway_id: req.params.id,
      win: true,
    }).limit(giveaway.numberOfWinners);

    await Participant.populate(participants, { path: "user giveaway_id" }).then(
      (parts) => {
        winners = parts;
        msg = "This giveaway has ended";
      }
    );
  }
  return res
    .status(200)
    .send({ status: "success", error: false, data: winners, message: msg });
});

//get users joined
router.get("/users/joined", auth, async (req, res) => {
  await Participant.find({ user: req.user._id })
    .populate("user")
    .populate("admin")
    .exec(async (err, participants) => {
      if (err) {
        return res
          .status(500)
          .send({ error: true, message: "Database operation failed" });
      }
      let giveaways = [];

      participants.forEach((participant) => {
        giveaways.push(participant.giveaway_id);
      });

      await Giveaway.find({ _id: { $in: giveaways } })
        .populate("user")
        .populate("admin")
        .exec((err, giveaways) => {
          if (err) {
            return res
              .status(500)
              .send({ error: true, message: "Database operation failed" });
          }
          return res
            .status(200)
            .send({ status: "success", error: false, data: giveaways });
        });
    });
});

router.get("/get/latestandtop", auth, async (req, res) => {
  const preRecentWin = await Participant.find({ win: true }).sort({
    updatedAt: -1,
  });
  // .populate("user")
  // .populate("giveaway_id");
  const RecentWin = await Participant.populate(preRecentWin, {
    path: "user giveaway_id",
    populate: {
      path: "user admin",
    },
  });

  const topParticipants = await Participant.aggregate([
    {
      $match: {
        win: true,
      },
    },
    {
      $group: {
        _id: "$user",
        user: { $first: "$user" },
        giveaway_id: { $first: "$giveaway_id" },
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
  ]);
  let TopWin = await Participant.populate(topParticipants, {
    path: "user giveaway_id",
    populate: {
      path: "user admin",
    },
  });

  const users = await Participant.find({ win: true }).populate("giveaway_id");

  users.map((user) => {});

  let winners = { latest: RecentWin, top: TopWin };
  return res
    .status(200)
    .send({ status: "success", error: false, data: winners });
});

router.get("/get/totalgiveawaydetails", auth, async (req, res) => {
  let winners = await Giveaway.aggregate([
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

  const giveaways = await Giveaway.find({
    completed: true,
  }).countDocuments();

  winners = winners.length ? winners[0].total : 0;

  //winners outside
  let outsideWinners = await OutsideWinners.aggregate([
    {
      $group: {
        _id: null,
        total: { $sum: "$winners" },
      },
    },
  ]);

  const new_outsideWinners = outsideWinners.length
    ? outsideWinners[0].total
    : 0;

  winners += new_outsideWinners;

  let totalamount = 0;

  const giveaways1 = await Giveaway.find({
    completed: true,
  });

  giveaways1.forEach((giveaway) => {
    totalamount += giveaway.amount;
  });

  const result = {
    winners: winners,
    giveaways: giveaways,
    totalAmount: totalamount,
  };

  return res
    .status(200)
    .send({ error: false, message: "success", data: result });
});

//get all top givers
router.get("/get/topgivers", auth, async (req, res) => {
  const giveaways = await Giveaway.find({
    isAnonymous: false,
    user: { $ne: null },
  });
  var users = {};

  giveaways.forEach((giveaway) => {
    if (giveaway.user in users) {
      users[giveaway.user] = users[giveaway.user] + giveaway.amount;
    } else {
      users[giveaway.user] = giveaway.amount;
    }
  });

  // Create items array
  var items = Object.keys(users).map((key) => {
    return [key, users[key]];
  });

  // Sort the array based on the second element
  items.sort((first, second) => {
    return second[1] - first[1];
  });

  let topgivers = [];
  if (items.length > 50) {
    topgivers = items.slice(0, 5);
  } else {
    topgivers = items;
  }

  let result = [];
  for (const top of topgivers) {
    if (top[0] !== "undefined") {
      const user = await User.findById(top[0]);
      var details = {
        user: user,
        totalAmount: top[1],
      };
      if (user) {
        result.push(details);
      }
    }
  }

  return res
    .status(200)
    .send({ error: false, message: "success", data: result });
});

//get top givers and amount of give aways they've done
router.get("/get/top_givers_giveaways", auth, async (req, res) => {
  const giveaways = await Giveaway.find({
    isAnonymous: false,
    user: { $ne: null },
  });
  var users = {};
  var usersNum = {};

  giveaways.forEach((giveaway) => {
    if (giveaway.user in users) {
      usersNum[giveaway.user] = usersNum[giveaway.user] + 1;
      users[giveaway.user] = users[giveaway.user] + giveaway.amount;
    } else {
      if (!giveaway.isAnonymous) {
        usersNum[giveaway.user] = 1;
        users[giveaway.user] = giveaway.amount;
      }
    }
  });

  // Create items array
  var items = Object.keys(users).map((key) => {
    return [key, users[key]];
  });
  var itemsNum = Object.keys(usersNum).map((key) => {
    return [key, usersNum[key]];
  });

  // Sort the array based on the second element
  items.sort((first, second) => {
    return second[1] - first[1];
  });
  itemsNum.sort((first, second) => {
    return second[1] - first[1];
  });

  let total_result = [];

  let result = [];
  for (const top of items) {
    if (top[0] !== "undefined") {
      const user = await User.findById(top[0]);
      if (user) {
        var details = {
          user: user,
          totalAmount: top[1],
        };
        result.push(details);
      }
    }
  }

  total_result.push(result);

  let resultNum = [];
  for (const top of itemsNum) {
    if (top[0] !== "undefined") {
      const user = await User.findById(top[0]);
      if (user) {
        var details = {
          user: user,
          totalGiveaway: top[1],
        };
        resultNum.push(details);
      }
    }
  }

  total_result.push(resultNum);

  return res
    .status(200)
    .send({ error: false, message: "success", data: total_result });
});

module.exports = router;
