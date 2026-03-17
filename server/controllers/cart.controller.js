'use strict';

const { v4: uuidv4 } = require('uuid');
const cartModel = require('../models/cart.model');

const SESSION_COOKIE = 'cart_session';
const COOKIE_BASE = { httpOnly: true, sameSite: 'lax', path: '/' };

function getOrCreateSessionId(req, res) {
  let sessionId = req.cookies?.[SESSION_COOKIE];
  if (!sessionId) {
    sessionId = uuidv4();
    res.cookie(SESSION_COOKIE, sessionId, { ...COOKIE_BASE, maxAge: 30 * 24 * 60 * 60 * 1000 });
  }
  return sessionId;
}

async function getCart(req, res, next) {
  try {
    const sessionId = getOrCreateSessionId(req, res);
    const cart = await cartModel.getWithItems(sessionId);
    return res.json({ cart: cart || { items: [], totalCents: 0 } });
  } catch (err) {
    next(err);
  }
}

async function addItem(req, res, next) {
  try {
    const sessionId = getOrCreateSessionId(req, res);
    await cartModel.getOrCreate(sessionId, req.projectRef);
    const item = await cartModel.addItem(sessionId, req.body);
    return res.status(201).json({ item });
  } catch (err) {
    next(err);
  }
}

async function updateItem(req, res, next) {
  try {
    const { itemId } = req.params;
    const item = await cartModel.updateItem(itemId, req.body);
    return res.json({ item });
  } catch (err) {
    next(err);
  }
}

async function removeItem(req, res, next) {
  try {
    const { itemId } = req.params;
    await cartModel.removeItem(itemId);
    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

async function mergeCart(req, res, next) {
  try {
    const { guestSessionId } = req.body;
    const customerSessionId = req.cookies?.[SESSION_COOKIE] || uuidv4();

    await cartModel.mergeIntoSession(guestSessionId, customerSessionId);

    if (req.customer?.id) {
      await cartModel.linkToCustomer(customerSessionId, req.customer.id);
    }

    res.cookie(SESSION_COOKIE, customerSessionId, {
      ...COOKIE_BASE,
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    const cart = await cartModel.getWithItems(customerSessionId);
    return res.json({ cart });
  } catch (err) {
    next(err);
  }
}

module.exports = { getCart, addItem, updateItem, removeItem, mergeCart };
