'use strict';

const tipModel = require('../models/tip.model');
const orderModel = require('../models/order.model');
const { createError } = require('../middleware/error.middleware');
const { getCallerId } = require('../middleware/auth.middleware');

async function createTip(req, res, next) {
  try {
    const { orderId, toRiderId, amountCents } = req.body;
    const fromCustomerId = getCallerId(req);

    const order = await orderModel.findById(orderId);
    if (!order) return next(createError('Order not found', 404));
    if (order.status !== 'completed') {
      return next(createError('Can only tip on completed orders', 400));
    }

    const tip = await tipModel.create({
      orderId,
      fromCustomerId,
      toRiderId,
      amountCents,
    });

    return res.status(201).json({ tip });
  } catch (err) {
    next(err);
  }
}

async function getRiderTips(req, res, next) {
  try {
    const { riderId } = req.params;
    const totalCents = await tipModel.totalForRider(riderId);
    return res.json({ riderId, totalCents });
  } catch (err) {
    next(err);
  }
}

module.exports = { createTip, getRiderTips };
