const express = require('express');
const { readDB, transaction, newId } = require('../db');
const { validateSale } = require('../validators');

const router = express.Router();

function applyFilters(items, q) {
  let result = [...items];
  if (q.productId) result = result.filter(i => i.productId === q.productId);
  if (q.period) result = result.filter(i => i.period === q.period);
  if (q.from) result = result.filter(i => i.date >= q.from);
  if (q.to) result = result.filter(i => i.date <= q.to);
  if (q.date) result = result.filter(i => i.date === q.date);
  result.sort((a, b) => (b.date + b.id).localeCompare(a.date + a.id));
  return result;
}

router.get('/', (req, res) => {
  const db = readDB();
  res.json(applyFilters(db.sales, req.query));
});

router.get('/:id', (req, res) => {
  const db = readDB();
  const sale = db.sales.find(s => s.id === req.params.id);
  if (!sale) return res.status(404).json({ error: 'Venda não encontrada.' });
  res.json(sale);
});

router.post('/', async (req, res) => {
  const db0 = readDB();
  const { errors, value } = validateSale(req.body, db0.products);
  if (errors.length) return res.status(400).json({ error: errors.join(' ') });

  const sale = await transaction(db => {
    const item = { id: newId('s'), ...value, createdAt: new Date().toISOString() };
    db.sales.push(item);
    return item;
  });
  res.status(201).json(sale);
});

router.put('/:id', async (req, res) => {
  const db0 = readDB();
  if (!db0.sales.find(s => s.id === req.params.id)) {
    return res.status(404).json({ error: 'Venda não encontrada.' });
  }
  const { errors, value } = validateSale(req.body, db0.products, { partial: true });
  if (errors.length) return res.status(400).json({ error: errors.join(' ') });

  const updated = await transaction(db => {
    const idx = db.sales.findIndex(s => s.id === req.params.id);
    if (idx === -1) return null;
    db.sales[idx] = { ...db.sales[idx], ...value, updatedAt: new Date().toISOString() };
    return db.sales[idx];
  });
  if (!updated) return res.status(404).json({ error: 'Venda não encontrada.' });
  res.json(updated);
});

router.delete('/:id', async (req, res) => {
  const removed = await transaction(db => {
    const idx = db.sales.findIndex(s => s.id === req.params.id);
    if (idx === -1) return null;
    const [r] = db.sales.splice(idx, 1);
    return r;
  });
  if (!removed) return res.status(404).json({ error: 'Venda não encontrada.' });
  res.json({ removed: true, sale: removed });
});

module.exports = router;
