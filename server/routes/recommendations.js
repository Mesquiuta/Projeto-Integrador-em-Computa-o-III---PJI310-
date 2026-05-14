const express = require('express');
const { readDB } = require('../db');
const { recommendForAll, recommendForProduct } = require('../services/forecast');

const router = express.Router();

// GET /api/recommendations?date=YYYY-MM-DD&safetyMargin=0.10&productId=...
router.get('/', (req, res) => {
  const db = readDB();
  const today = new Date();
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const targetDate = req.query.date || tomorrow;
  const safetyMargin = req.query.safetyMargin !== undefined ? Number(req.query.safetyMargin) : 0.10;

  if (req.query.productId) {
    const product = db.products.find(p => p.id === req.query.productId);
    if (!product) return res.status(404).json({ error: 'Produto não encontrado.' });
    const rec = recommendForProduct({
      product,
      targetDate,
      sales: db.sales,
      production: db.production,
      waste: db.waste,
      safetyMargin
    });
    return res.json({ targetDate, safetyMargin, recommendations: [rec] });
  }

  const recommendations = recommendForAll({
    products: db.products,
    targetDate,
    sales: db.sales,
    production: db.production,
    waste: db.waste,
    safetyMargin
  });
  res.json({ targetDate, safetyMargin, recommendations });
});

module.exports = router;
