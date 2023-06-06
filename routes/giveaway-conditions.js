const express = require("express");
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");
const {
  GiveawayCondition,
  validateGiveawayCondition,
} = require("../models/giveaway-condition");

const router = express.Router();

//Admin can retrieve the total list of giveaway conditions created
router.get("/", [auth], async (req, res) => {
  const giveaway_conditions = await GiveawayCondition.find()
    .select("-__v")
    .sort("createdAt");

  let result = { status: "success", error: false, data: giveaway_conditions };

  res.send(result);
});

// Admin can add/create a new giveaway condition
router.post("/", [auth, admin], async (req, res) => {
  const { error } = validateGiveawayCondition(req.body);
  if (error)
    return res
      .status(400)
      .send({ error: true, message: error.details[0].message });

  const giveawayCondition = new GiveawayCondition({
    name: req.body.name,
  });
  await giveawayCondition.save();

  let result = { status: "success", error: false, data: giveawayCondition };

  res.send(result);
});

//Admin can update a giveaway condition
router.put("/:id", [auth, admin], async (req, res) => {
  // const { error } = validateGiveawayCondition(req.body);
  // if (error) return res.status(400).send({error: true, message: error.details[0].message});

  const giveawayCondition = await GiveawayCondition.findByIdAndUpdate(
    req.params.id,
    {
      name: req.body.name,
    },
    { new: true }
  );

  if (!giveawayCondition)
    return res
      .status(404)
      .send({
        status: "error",
        error: true,
        message: "The Giveaway Condition with the given ID was not found.",
      });

  let result = { status: "success", error: false, data: giveawayCondition };

  res.send(result);
});

router.delete("/:id", [auth, admin], async (req, res) => {
  const giveawayCondition = await GiveawayCondition.findByIdAndRemove(
    req.params.id
  );

  if (!giveawayCondition)
    return res
      .status(404)
      .send({
        status: "error",
        error: true,
        message: "The Giveaway Condition with the given ID was not found.",
      });
  let result = { status: "success", error: false, data: giveawayCondition };
  res.send(result);
});

router.get("/:id", [auth], async (req, res) => {
  const giveawayCondition = await GiveawayCondition.findById(req.params.id);

  if (!giveawayCondition)
    return res
      .status(404)
      .send({
        status: "error",
        error: true,
        message: "The Giveaway Condition with the given ID was not found.",
      });
  let result = { status: "success", error: false, data: giveawayCondition };
  res.send(result);
});

module.exports = router;
