const express = require('express');
const { readDB } = require('../db');

const router = express.Router();

// GET /api/dashboard?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/', (req, res) => {
  const db = readDB();
  const today = new Date().toISOString().slice(0, 10);
  const defaultFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const from = req.query.from || defaultFrom;
  const to = req.query.to || today;

  const inRange = (d) => d >= from && d <= to;
  const sales = db.sales.filter(s => inRange(s.date));
  const production = db.production.filter(s => inRange(s.date));
  const waste = db.waste.filter(s => inRange(s.date));

  const sum = arr => arr.reduce((a, b) => a + Number(b.quantity || 0), 0);
  const totalSales = sum(sales);
  const totalProduction = sum(production);
  const totalWaste = sum(waste);

  const wastePct = totalProduction > 0 ? (totalWaste / totalProduction) * 100 : 0;

  // Produtos mais vendidos (top 10)
  const salesByProduct = new Map();
  for (const s of sales) {
    salesByProduct.set(s.productId, (salesByProduct.get(s.productId) ?? 0) + Number(s.quantity || 0));
  }
  const topSellers = Array.from(salesByProduct.entries())
    .map(([productId, quantity]) => {
      const p = db.products.find(x => x.id === productId);
      return { productId, productName: p?.name ?? '(removido)', unit: p?.unit ?? 'unidade', quantity };
    })
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10);

  // Produtos com mais sobras (top 10)
  const wasteByProduct = new Map();
  for (const w of waste) {
    wasteByProduct.set(w.productId, (wasteByProduct.get(w.productId) ?? 0) + Number(w.quantity || 0));
  }
  const topWasted = Array.from(wasteByProduct.entries())
    .map(([productId, quantity]) => {
      const p = db.products.find(x => x.id === productId);
      const produced = production.filter(pr => pr.productId === productId).reduce((a, b) => a + Number(b.quantity || 0), 0);
      return {
        productId,
        productName: p?.name ?? '(removido)',
        unit: p?.unit ?? 'unidade',
        quantity,
        producedInRange: produced,
        wastePct: produced > 0 ? (quantity / produced) * 100 : null
      };
    })
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10);

  // Série diária: vendas, produção, sobras
  const dateSet = new Set();
  const accSales = new Map();
  const accProd = new Map();
  const accWaste = new Map();
  for (const s of sales) { dateSet.add(s.date); accSales.set(s.date, (accSales.get(s.date) ?? 0) + Number(s.quantity || 0)); }
  for (const p of production) { dateSet.add(p.date); accProd.set(p.date, (accProd.get(p.date) ?? 0) + Number(p.quantity || 0)); }
  for (const w of waste) { dateSet.add(w.date); accWaste.set(w.date, (accWaste.get(w.date) ?? 0) + Number(w.quantity || 0)); }
  const dates = Array.from(dateSet).sort();
  const daily = dates.map(d => ({
    date: d,
    sales: accSales.get(d) ?? 0,
    production: accProd.get(d) ?? 0,
    waste: accWaste.get(d) ?? 0
  }));

  res.json({
    range: { from, to },
    totals: {
      sales: totalSales,
      production: totalProduction,
      waste: totalWaste,
      wastePct: Math.round(wastePct * 10) / 10
    },
    topSellers,
    topWasted,
    daily,
    counts: {
      products: db.products.length,
      productsActive: db.products.filter(p => p.active !== false).length,
      sales: db.sales.length,
      production: db.production.length,
      waste: db.waste.length
    }
  });
});

module.exports = router;
