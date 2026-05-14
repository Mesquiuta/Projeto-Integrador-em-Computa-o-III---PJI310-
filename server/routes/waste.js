const express = require('express');
const { readDB, transaction, newId } = require('../db');
const { validateWaste } = require('../validators');

const router = express.Router();

function applyFilters(items, q) {
  let result = [...items];
  if (q.productId) result = result.filter(i => i.productId === q.productId);
  if (q.reason) result = result.filter(i => i.reason === q.reason);
  if (q.from) result = result.filter(i => i.date >= q.from);
  if (q.to) result = result.filter(i => i.date <= q.to);
  if (q.date) result = result.filter(i => i.date === q.date);
  result.sort((a, b) => (b.date + b.id).localeCompare(a.date + a.id));
  return result;
}

router.get('/', (req, res) => {
  const db = readDB();
  res.json(applyFilters(db.waste, req.query));
});

router.get('/:id', (req, res) => {
  const db = readDB();
  const item = db.waste.find(s => s.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'Perda não encontrada.' });
  res.json(item);
});

router.post('/', async (req, res) => {
  const db0 = readDB();
  const { errors, value } = validateWaste(req.body, db0.products);
  if (errors.length) return res.status(400).json({ error: errors.join(' ') });

  const item = await transaction(db => {
    const it = { id: newId('w'), ...value, createdAt: new Date().toISOString() };
    db.waste.push(it);
    return it;
  });
  res.status(201).json(item);
});

router.put('/:id', async (req, res) => {
  const db0 = readDB();
  if (!db0.waste.find(s => s.id === req.params.id)) {
    return res.status(404).json({ error: 'Perda não encontrada.' });
  }
  const { errors, value } = validateWaste(req.body, db0.products, { partial: true });
  if (errors.length) return res.status(400).json({ error: errors.join(' ') });

  const updated = await transaction(db => {
    const idx = db.waste.findIndex(s => s.id === req.params.id);
    if (idx === -1) return null;
    db.waste[idx] = { ...db.waste[idx], ...value, updatedAt: new Date().toISOString() };
    return db.waste[idx];
  });
  if (!updated) return res.status(404).json({ error: 'Perda não encontrada.' });
  res.json(updated);
});

router.delete('/:id', async (req, res) => {
  const removed = await transaction(db => {
    const idx = db.waste.findIndex(s => s.id === req.params.id);
    if (idx === -1) return null;
    const [r] = db.waste.splice(idx, 1);
    return r;
  });
  if (!removed) return res.status(404).json({ error: 'Perda não encontrada.' });
  res.json({ removed: true, waste: removed });
});

module.exports = router;
