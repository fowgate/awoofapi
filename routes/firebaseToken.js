const express = require("express");
const router = express.Router();
const { Device } = require("../models/devices");

//middleware
const auth = require("../middleware/auth");

router.post("/get_token", auth, async (req, res) => {
  try {
    //delete existing tokens
    let find_token = await Device.find({ token: req.body.token });

    let delete_tokens = [];
    find_token.map((data) => {
      delete_tokens.push(data._id);
    });

    await Device.deleteMany({ _id: { $in: delete_tokens } });

    let find_user = await Device.findOne({ user_id: req.user._id });

    if (!find_user) {
      const new_device = new Device({
        user_id: req.user._id,
        token: req.body.token,
        device_type: req.body.device_type,
      });

      await new_device.save();

      return res.status(200).send({
        error: false,
        message: "firebase notification token sent successfully",
      });
    }

    if (find_user.token == req.body.token) {
      return res.status(200).send({
        error: false,
        message: "firebase notification token sent successfully",
      });
    } else {
      await Device.findOneAndUpdate(
        { user_id: req.user._id },
        {
          $set: {
            token: req.body.token,
            device_type: req.body.device_type,
          },
        }
      );

      return res.status(200).send({
        error: false,
        message: "firebase notification token sent successfully",
      });
    }
  } catch (e) {
    console.log(e);
    return res.send({
      status: "failed",
      error: true,
      message: "Error, could not send firebase token",
    });
  }
});

module.exports = router;
