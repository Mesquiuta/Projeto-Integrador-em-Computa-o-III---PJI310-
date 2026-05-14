const express = require('express');
const { readDB, transaction, newId } = require('../db');
const { validateProduct } = require('../validators');

const router = express.Router();

// GET /api/products  (?active=true|false)
router.get('/', (req, res) => {
  const db = readDB();
  let products = [...db.products];
  if (req.query.active === 'true') products = products.filter(p => p.active !== false);
  if (req.query.active === 'false') products = products.filter(p => p.active === false);
  products.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  res.json(products);
});

// GET /api/products/:id
router.get('/:id', (req, res) => {
  const db = readDB();
  const p = db.products.find(x => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'Produto não encontrado.' });
  res.json(p);
});

// POST /api/products
router.post('/', async (req, res) => {
  const { errors, value } = validateProduct(req.body);
  if (errors.length) return res.status(400).json({ error: errors.join(' ') });

  const product = await transaction(db => {
    if (db.products.some(p => p.name.toLowerCase() === value.name.toLowerCase())) {
      const err = new Error('Já existe um produto com este nome.');
      err.status = 409;
      throw err;
    }
    const product = {
      id: newId('p'),
      ...value,
      createdAt: new Date().toISOString()
    };
    db.products.push(product);
    return product;
  }).catch(err => err);

  if (product instanceof Error) {
    return res.status(product.status || 500).json({ error: product.message });
  }
  res.status(201).json(product);
});

// PUT /api/products/:id
router.put('/:id', async (req, res) => {
  const db0 = readDB();
  const existing = db0.products.find(p => p.id === req.params.id);
  if (!existing) return res.status(404).json({ error: 'Produto não encontrado.' });

  const { errors, value } = validateProduct(req.body, { partial: true });
  if (errors.length) return res.status(400).json({ error: errors.join(' ') });

  const updated = await transaction(db => {
    const idx = db.products.findIndex(p => p.id === req.params.id);
    if (idx === -1) return null;
    if (value.name && db.products.some(p => p.id !== req.params.id && p.name.toLowerCase() === value.name.toLowerCase())) {
      const err = new Error('Já existe um produto com este nome.');
      err.status = 409;
      throw err;
    }
    db.products[idx] = { ...db.products[idx], ...value, updatedAt: new Date().toISOString() };
    return db.products[idx];
  }).catch(err => err);

  if (updated instanceof Error) return res.status(updated.status || 500).json({ error: updated.message });
  if (!updated) return res.status(404).json({ error: 'Produto não encontrado.' });
  res.json(updated);
});

// DELETE /api/products/:id  → inativa (soft delete) se tiver vinculações, senão remove.
router.delete('/:id', async (req, res) => {
  const result = await transaction(db => {
    const idx = db.products.findIndex(p => p.id === req.params.id);
    if (idx === -1) return { notFound: true };

    const hasRefs =
      db.sales.some(s => s.productId === req.params.id) ||
      db.production.some(p => p.productId === req.params.id) ||
      db.waste.some(w => w.productId === req.params.id);

    if (hasRefs) {
      db.products[idx] = { ...db.products[idx], active: false, updatedAt: new Date().toISOString() };
      return { inactivated: true, product: db.products[idx] };
    } else {
      const [removed] = db.products.splice(idx, 1);
      return { removed: true, product: removed };
    }
  });

  if (result.notFound) return res.status(404).json({ error: 'Produto não encontrado.' });
  res.json(result);
});

module.exports = router;
