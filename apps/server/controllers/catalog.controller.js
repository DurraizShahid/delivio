'use strict';

const categoryModel = require('../models/category.model');
const productModel = require('../models/product.model');
const { createError } = require('../middleware/error.middleware');
const { mapCategory, mapProduct } = require('../lib/case');

async function listCategories(req, res, next) {
  try {
    const rows = await categoryModel.list(req.shopId);
    return res.json({ categories: (rows || []).map(mapCategory) });
  } catch (err) {
    next(err);
  }
}

async function createCategory(req, res, next) {
  try {
    const category = await categoryModel.createCategory(req.shopId, req.projectRef, req.body);
    return res.status(201).json({ category: mapCategory(category) });
  } catch (err) {
    next(err);
  }
}

async function updateCategory(req, res, next) {
  try {
    const { id } = req.params;
    const updated = await categoryModel.updateCategory(req.shopId, id, req.body);
    if (!updated) return next(createError('Category not found', 404));
    return res.json({ category: mapCategory(updated) });
  } catch (err) {
    next(err);
  }
}

async function deleteCategory(req, res, next) {
  try {
    const { id } = req.params;
    await categoryModel.deleteCategory(req.shopId, id);
    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

async function listProducts(req, res, next) {
  try {
    const includeUnavailable = req.query.includeUnavailable !== 'false';
    const rows = await productModel.list(req.shopId, { includeUnavailable });
    return res.json({ products: (rows || []).map(mapProduct) });
  } catch (err) {
    next(err);
  }
}

async function createProduct(req, res, next) {
  try {
    const product = await productModel.createProduct(req.shopId, req.projectRef, req.body);
    return res.status(201).json({ product: mapProduct(product) });
  } catch (err) {
    next(err);
  }
}

async function updateProduct(req, res, next) {
  try {
    const { id } = req.params;
    const existing = await productModel.get(req.shopId, id);
    if (!existing) return next(createError('Product not found', 404));
    const updated = await productModel.updateProduct(req.shopId, id, req.body);
    return res.json({ product: mapProduct(updated) });
  } catch (err) {
    next(err);
  }
}

async function deleteProduct(req, res, next) {
  try {
    const { id } = req.params;
    await productModel.deleteProduct(req.shopId, id);
    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  listProducts,
  createProduct,
  updateProduct,
  deleteProduct,
};
