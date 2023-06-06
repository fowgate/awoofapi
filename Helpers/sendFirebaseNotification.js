const axios = require("axios");
const { Device } = require("../models/devices");
const { User } = require("../models/user");
const { Notifications } = require("../models/notifications");
const { Giveaway } = require("../models/giveaway");

const sendNotification = async (user_id, giveaway) => {
  let header_config = {
    headers: {
      Authorization: "key=" + process.env.firebase_server_key,
      "Content-type": "application/json",
    },
  };

  let get_user = await User.findById(user_id);

  let notification = {
    title: `New Awoof Giveaway`,
    body: `${
      get_user
        ? giveaway.isAnonymous
          ? "Anon"
          : get_user.username
        : "Awoof Admins"
    } just posted a giveaway!!! 😊`,
  };

  let fcm_tokens = [];
  let all_users = await Device.find({ user_id: { $ne: user_id } });

  all_users.map(async (user) => {
    fcm_tokens.push(user.token);

    // var mongo_notification = new Notifications({
    //   user: user_id,
    //   message: `${
    //     get_user ? get_user.username : "Awoof Admins"
    //   } just posted a giveaway!!! 😊`,
    //   seen: false,
    // });

    // mongo_notification.save();
  });

  let notification_body = {
    notification: notification,
    registration_ids: fcm_tokens,
    data: {
      giveaway: giveaway,
      click_action: "FLUTTER_NOTIFICATION_CLICK",
    },
  };

  notification_body = JSON.stringify(notification_body);

  axios
    .post(
      "https://fcm.googleapis.com/fcm/send",
      notification_body,
      header_config
    )
    .catch((e) => {
      console.log(e);
    });
};

const sendPersonalNotification = async (user_id, giveaway) => {
  let header_config = {
    headers: {
      Authorization: "key=" + process.env.firebase_server_key,
      "Content-type": "application/json",
    },
  };

  let get_user = await Device.findById(user_id);

  let notification = {
    title: `Awoof Giveaway Ended`,
    body: `Your giveaway just ended, see winners`,
  };

  let fcm_tokens = [];

  //   fcm_tokens.push(get_user.token);
  const new_giveaway = await Giveaway.findById(giveaway._id).populate(
    "user admin"
  );

  var mongo_notification = new Notifications({
    user: user_id,
    message: `Your giveaway just ended, see winners 👀`,
    seen: false,
    type: "giveaway ended",
    giveaway: giveaway,
  });

  mongo_notification.save();

  let notification_body = {
    notification: notification,
    registration_ids: fcm_tokens,
    data: {
      giveaway: new_giveaway,
      click_action: "FLUTTER_NOTIFICATION_CLICK",
    },
  };

  notification_body = JSON.stringify(notification_body);

  //   axios.post(
  //     "https://fcm.googleapis.com/fcm/send",
  //     notification_body,
  //     header_config
  //   );

  //send notifications to all users that giveaway has ended
  let gen_fcm_tokens = [];
  let all_users = await Device.find();

  all_users.map(async (user) => {
    gen_fcm_tokens.push(user.token);

    // var mongo_notification = new Notifications({
    //   user: user.user_id,
    //   message: `Awoof giveaway just ended, see winners 👀`,
    //   seen: false,
    // });

    // mongo_notification.save();
  });

  let gen_notification_body = {
    notification: {
      title: `Awoof Giveaway Ended`,
      body: `Awoof giveaway just ended, see winners 👀`,
    },
    registration_ids: gen_fcm_tokens,
    data: {
      giveaway: new_giveaway,
      click_action: "FLUTTER_NOTIFICATION_CLICK",
    },
  };

  axios.post(
    "https://fcm.googleapis.com/fcm/send",
    gen_notification_body,
    header_config
  );
};

const sendGeneralNotification = async (giveaway) => {
  let header_config = {
    headers: {
      Authorization: "key=" + process.env.firebase_server_key,
      "Content-type": "application/json",
    },
  };

  //send notifications to all users that giveaway has ended
  let gen_fcm_tokens = [];
  let all_users = await Device.find();

  all_users.map(async (user) => {
    gen_fcm_tokens.push(user.token);

    // var mongo_notification = new Notifications({
    //   user: null,
    //   message: `Awoof giveaway just ended, see winners 👀`,
    //   seen: false,
    // });

    // mongo_notification.save();
  });
  const new_giveaway = await Giveaway.findById(giveaway._id).populate(
    "user admin"
  );

  let gen_notification_body = {
    notification: {
      title: `Awoof Giveaway Ended`,
      body: `Awoof giveaway just ended, see winners 👀`,
    },
    registration_ids: gen_fcm_tokens,
    data: {
      giveaway_ended: new_giveaway,
      click_action: "FLUTTER_NOTIFICATION_CLICK",
    },
  };

  axios
    .post(
      "https://fcm.googleapis.com/fcm/send",
      gen_notification_body,
      header_config
    )
    .then((resp) => {
      console.log(resp.data);
    });
};

const sendReferralNotification = async (user_id, ref_username, user_token) => {
  let header_config = {
    headers: {
      Authorization: "key=" + process.env.firebase_server_key,
      "Content-type": "application/json",
    },
  };

  let fcm_tokens = [];

  let notification = {
    title: `Awoof Referral`,
    body:
      ref_username +
      " successfully signed up using your referral link, Awoof Star ⭐ Received, thanks for the referral.",
  };

  let user = await Device.findOne({ user_id: user_id });

  var mongo_notification = await new Notifications({
    user: user_id,
    message:
      ref_username +
      " successfully signed up using your referral link, Awoof Star ⭐ Received, thanks for the referral.",
    seen: false,
    type: "referral",
  });

  mongo_notification.save();

  fcm_tokens.push(user.token);

  let notification_body = {
    notification: notification,
    registration_ids: fcm_tokens,
    data: {
      star: true,
      click_action: "FLUTTER_NOTIFICATION_CLICK",
    },
  };

  notification_body = JSON.stringify(notification_body);

  await axios.post(
    "https://fcm.googleapis.com/fcm/send",
    notification_body,
    header_config
  );

  //send new user notiificatiioin
  let new_user_notification = {
    title: `Welcome to Awoof 😊`,
    body: "you signed up using a referral link, you just received an extra Awoof star ⭐",
  };

  let new_user_notification_body = {
    notification: new_user_notification,
    registration_ids: user_token,
    data: {
      star: true,
      click_action: "FLUTTER_NOTIFICATION_CLICK",
    },
  };

  await axios.post(
    "https://fcm.googleapis.com/fcm/send",
    new_user_notification_body,
    header_config
  );
};

const sendSurpriseNotification = async (
  user_id,
  username,
  amount,
  stars = false
) => {
  let header_config = {
    headers: {
      Authorization: "key=" + process.env.firebase_server_key,
      "Content-type": "application/json",
    },
  };

  let fcm_token = [];

  let notification = "";
  if (stars) {
    notification = {
      title: `Awoof Surprise`,
      body: `Hi ${username}, You just got ⭐ ${amount} of stars from us at Awoof. Thanks for being a part of us 😊`,
    };
    var mongo_notification = new Notifications({
      user: user_id,
      message: `Hi ${username}, You just got ⭐ ${amount} from us at Awoof. Thanks for being a part of us 😊`,
      seen: false,
      type: "suprise star",
    });
    await mongo_notification.save();
  } else {
    notification = {
      title: `Awoof Surprise`,
      body: `Hi ${username}, You just got ₦ ${amount} from us at Awoof. Thanks for being a part of us 😊`,
    };

    var mongo_notification = new Notifications({
      user: user_id,
      message: `Hi ${username}, You just got ₦ ${amount} from us at Awoof. Thanks for being a part of us 😊`,
      seen: false,
      type: "suprise money",
    });
    await mongo_notification.save();
  }

  let user = await Device.findOne({ user_id: user_id });

  fcm_token.push(user.token);

  let notification_body = {
    notification: notification,
    registration_ids: fcm_token,
    data: {
      click_action: "FLUTTER_NOTIFICATION_CLICK",
    },
  };

  notification_body = JSON.stringify(notification_body);

  axios.post(
    "https://fcm.googleapis.com/fcm/send",
    notification_body,
    header_config
  );
};

const sendNotificationAdmin = async (message) => {
  let header_config = {
    headers: {
      Authorization: "key=" + process.env.firebase_server_key,
      "Content-type": "application/json",
    },
  };

  //send notifications to all users that giveaway has ended
  let gen_fcm_tokens = [];
  let all_users = await Device.find();

  all_users.map(async (user) => {
    gen_fcm_tokens.push(user.token);
  });

  let gen_notification_body = {
    notification: {
      title: `${message.title}`,
      body: `${message.body}`,
    },
    registration_ids: gen_fcm_tokens,
    data: {
      click_action: "FLUTTER_NOTIFICATION_CLICK",
    },
  };

  await axios
    .post(
      "https://fcm.googleapis.com/fcm/send",
      gen_notification_body,
      header_config
    )
    .then((resp) => {
      return {
        error: false,
        message: "notifications sent successfully",
      };
    })
    .catch((e) => {
      return { error: true, message: "error, notifications could not be sent" };
    });
};

module.exports = {
  sendNotification,
  sendPersonalNotification,
  sendGeneralNotification,
  sendReferralNotification,
  sendSurpriseNotification,
  sendNotificationAdmin,
};
