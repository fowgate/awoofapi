const express = require('express');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const {
  GiveawayType,
  validateGiveawayType,
} = require('../models/giveaway-type');

const router = express.Router();

//Admin can retrieve the total list of giveaway types created
router.get('/', [auth], async (req, res) => {
  const giveaway_types = await GiveawayType.find()
    .select('-__v')
    .sort('createdAt');
    let result = {status : "success", error : false, data : giveaway_types}
  res.send(result);
});

// Admin can add/create a new giveaway type
router.post('/', [auth, admin], async (req, res) => {
  const { error } = validateGiveawayType(req.body);
  if (error) return res.status(400).send({error: true, message: error.details[0].message});

  const giveawayType = new GiveawayType({
    name: req.body.name,
  });
  await giveawayType.save();
  let result = {status : "success", error : false, data : giveawayType}
  res.send(result);
});

//Admin can update a giveaway type
router.put('/:id', [auth, admin], async (req, res) => {
  const { error } = validateGiveawayType(req.body);
  if (error) return res.status(400).send({error: true, message: error.details[0].message});

  const giveawayType = await GiveawayType.findByIdAndUpdate(
    req.params.id,
    {
      name: req.body.name,
    },
    { new: true }
  );

  if (!giveawayType)
    return res
      .status(404)
      .send({ status : "error", error : true, message : 'The Giveaway Type with the given ID was not found.'});
  let result = {status : "success", error : false, data : giveawayType}
  res.send(result);
});

router.delete('/:id', [auth, admin], async (req, res) => {
  const giveawayType = await GiveawayType.findByIdAndRemove(req.params.id);

  if (!giveawayType)
    return res
      .status(404)
      .send({ status : "error", error : true, message : 'The Giveaway Type with the given ID was not found.'});
      let result = {status : "success", error : false, data : giveawayType}
  res.send(result);
});

router.get('/:id', [auth], async (req, res) => {
  const giveawayType = await GiveawayType.findById(req.params.id);

  if (!giveawayType)
    return res
      .status(404)
      .send({ status : "error", error : true, message : 'The Giveaway Type with the given ID was not found.'});
  let result = {status : "success", error : false, data : giveawayCondition}
  res.send(result);
});

module.exports = router;
