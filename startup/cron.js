const cron = require("node-cron");
const {
  sendPersonalNotification,
  sendGeneralNotification,
} = require("../Helpers/sendFirebaseNotification");
const { Giveaway } = require("../models/giveaway");
const { Participant } = require("../models/participants");
const { User } = require("../models/user");
const { WiningsHistory } = require("../models/winingsHistory");
const moment = require("moment");
const uniqid = require("uniqid");
const request = require("request");

//sendgrid
const sgMail = require("@sendgrid/mail");
const { FreeWithdrawal } = require("../models/freeWithdrawal");
const { Transfer } = require("../models/transfer");
const sendgrid_key = process.env.sendgrid;
sgMail.setApiKey(sendgrid_key);

// schedule task to be run on the server every minute
module.exports = cron.schedule("* * * * *", function () {
  // search all giveaways, if any is complete, change the completed to true
  //   console.log("yes yes i'm working!!!");
  giveaway();
  makePayments();
});

async function giveaway() {
  const giveaways = await Giveaway.find();
  //   console.log(giveaways, "ayy");

  const giveaway_ids = [];

  for (const giveaway of giveaways) {
    // console.log(
    //   giveaway,
    //   "incomplete",
    //   Date.now() > Date.parse(giveaway.endAt)
    // );
    // console.log(giveaway);
    // console.log(Date.now() > Date.parse(giveaway.endAt));

    if (giveaway.completed == false) {
      if (Date.now() > Date.parse(giveaway.endAt) === true) {
        // console.log(giveaway);
        setWinners(giveaway._id, giveaway.numberOfWinners);

        if (giveaway.user) {
          const new_giveaway = await Giveaway.findById(giveaway._id);
          sendPersonalNotification(giveaway.user, new_giveaway);
        } else {
          const new_giveaway = await Giveaway.findById(giveaway._id);
          sendGeneralNotification(new_giveaway);
        }

        giveaway_ids.push(giveaway._id);

        //send thank you mail
        // const msg = {
        //   to: user.email,
        //   from: "support@awoofapp.com",
        //   templateId: "d-5bc2acfc58e24404b8bab7b8b6f5f98e",
        //   dynamic_template_data: {
        //     name: user.firstName,
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
      }
    }
  }

  //set completed as true
  await Giveaway.updateMany(
    {
      _id: { $in: giveaway_ids },
    },
    { $set: { completed: true } }
  );
}

async function setWinners(giveaway_id, num) {
  const pre_participants = await Participant.find({
    giveaway_id: giveaway_id,
  }).populate("user");

  let lim = 0;
  const participants = [];
  pre_participants.map((new_data) => {
    if (new_data.user.giveawaysWon < 1 && lim < num) {
      participants.push(new_data);
      lim += 1;
    } else if (new_data.user.giveawaysWon >= 1 && lim < num) {
      participants.push(new_data);
      lim += 1;
    }
  });

  const new_giveaway = await Giveaway.findOne({ _id: giveaway_id });

  const participant_ids = [];
  const user_ids = [];
  const winings = [];

  for (const part of participants) {
    participant_ids.push(part._id);
    user_ids.push(part.user);
    winings.push({
      user: part.user,
      giveaway_id: new_giveaway._id,
      amount: new_giveaway.amountPerWinner,
    });
  }

  //update all participants and set winners
  await Participant.updateMany(
    {
      _id: { $in: participant_ids },
    },
    { $set: { win: true } }
  );
  await User.updateMany(
    {
      _id: { $in: user_ids },
    },
    {
      $inc: {
        balance: +new_giveaway.amountPerWinner,
        giveawaysWon: +1,
        giveawaysAmountWon: +new_giveaway.amountPerWinner,
      },
    }
  );

  //create winings histories
  await WiningsHistory.create(winings);
}

async function makePayments() {
  const payments = await FreeWithdrawal.find();
  //   console.log(payments);
  const transfers = [];

  payments.map((payment) => {
    if (
      Date.now() > payment.payAt &&
      payment.paid != true &&
      payment.status == "pending"
    ) {
      payNow(payment);
    }
  });
}

const payNow = async (data) => {
  const user = await User.findById(data.user).select("-password -__v");
  console.log(data);
  const order_ref = uniqid("BT|").toUpperCase();
  const amount = data.amount * 100;
  var options = {
    method: "POST",
    url: "https://api.paystack.co/transfer",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.paystack}`,
    },
    body: {
      source: "balance",
      amount: amount,
      reason: "Awoof-Wallet Withdrawal",
      recipient: data.recipient_code,
    },
    json: true,
  };

  const callTransferApi = (callback) => {
    request(options, function (error, response, body) {
      if (error) {
        console.log(callback(error));
      }
      return callback(body);
    });
  };

  callTransferApi(async function (response) {
    console.log(response);
    if (response.status == false || response.data.status !== "success") {
      console.log({ error: true, message: response.message });

      await FreeWithdrawal.findByIdAndUpdate(data._id, {
        status: "failed",
      });

      await User.findByIdAndUpdate(data.user, {
        $inc: { balance: +data.amount },
      });
    } else {
      await FreeWithdrawal.findByIdAndUpdate(data._id, {
        paid: true,
        status: "completed",
      });

      let result = {
        message: "success, free withdrawal worked",
        error: false,
        data: response,
      };
      //   console.log(result);
    }

    // res.status(200).send(result);
    // res.end();
  });
};
