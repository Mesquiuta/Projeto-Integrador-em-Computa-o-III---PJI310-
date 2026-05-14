/**
 * Testes de integração das rotas REST.
 * Sobe o app numa porta efêmera apontando para um banco de teste isolado.
 */
const path = require('path');
const fs = require('fs');

// IMPORTANTE: definir DB_FILE ANTES de qualquer require que carregue server/db.js.
const TEST_DB = path.join(__dirname, '_test_db.json');
process.env.DB_FILE = TEST_DB;

const test = require('node:test');
const assert = require('node:assert/strict');

function resetTestDb() {
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
}

let server;
let baseUrl;

test.before(async () => {
  resetTestDb();
  const express = require('express');
  const app = express();
  app.use(express.json());
  app.use('/api/products',         require('../server/routes/products'));
  app.use('/api/sales',            require('../server/routes/sales'));
  app.use('/api/production',       require('../server/routes/production'));
  app.use('/api/waste',            require('../server/routes/waste'));
  app.use('/api/dashboard',        require('../server/routes/dashboard'));
  app.use('/api/recommendations',  require('../server/routes/recommendations'));
  await new Promise(resolve => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

test.after(async () => {
  await new Promise(resolve => server.close(resolve));
  resetTestDb();
});

async function req(method, url, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(baseUrl + url, opts);
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { status: res.status, data };
}

test('produtos: criar, listar, editar, excluir', async () => {
  let r = await req('POST', '/api/products', { name: 'Pão Teste', category: 'Pães', unit: 'kg', price: 12.5 });
  assert.equal(r.status, 201);
  assert.ok(r.data.id);
  const id = r.data.id;

  r = await req('POST', '/api/products', { name: '' });
  assert.equal(r.status, 400);
  assert.match(r.data.error, /obrigat/i);

  r = await req('GET', '/api/products');
  assert.equal(r.status, 200);
  assert.equal(r.data.length, 1);

  r = await req('PUT', `/api/products/${id}`, { name: 'Pão Teste 2' });
  assert.equal(r.status, 200);
  assert.equal(r.data.name, 'Pão Teste 2');

  r = await req('DELETE', `/api/products/${id}`);
  assert.equal(r.status, 200);
  assert.ok(r.data.removed);
});

test('vendas: validações e fluxo completo', async () => {
  const p = (await req('POST', '/api/products', { name: 'Pão Venda', unit: 'unidade' })).data;

  let r = await req('POST', '/api/sales', { productId: p.id, quantity: 0, date: '2026-05-01' });
  assert.equal(r.status, 400);
  assert.match(r.data.error, /maior que zero/i);

  r = await req('POST', '/api/sales', { productId: 'nao-existe', quantity: 5, date: '2026-05-01' });
  assert.equal(r.status, 400);
  assert.match(r.data.error, /não encontrado/i);

  r = await req('POST', '/api/sales', { productId: p.id, quantity: 10, date: '2026-05-01', period: 'manha' });
  assert.equal(r.status, 201);
  const saleId = r.data.id;

  r = await req('GET', `/api/sales?date=2026-05-01`);
  assert.equal(r.status, 200);
  assert.equal(r.data.length, 1);

  r = await req('DELETE', `/api/sales/${saleId}`);
  assert.equal(r.status, 200);
});

test('produção: criar e filtrar por produto', async () => {
  const p = (await req('POST', '/api/products', { name: 'Pão Produção', unit: 'unidade' })).data;
  let r = await req('POST', '/api/production', { productId: p.id, quantity: 50, date: '2026-05-02' });
  assert.equal(r.status, 201);

  r = await req('GET', `/api/production?productId=${p.id}`);
  assert.equal(r.data.length, 1);
});

test('sobras: aceita quantidade zero, valida motivo', async () => {
  const p = (await req('POST', '/api/products', { name: 'Pão Sobra', unit: 'unidade' })).data;

  let r = await req('POST', '/api/waste', { productId: p.id, quantity: -1, date: '2026-05-03' });
  assert.equal(r.status, 400);

  r = await req('POST', '/api/waste', { productId: p.id, quantity: 0, date: '2026-05-03', reason: 'sobra_dia' });
  assert.equal(r.status, 201);

  r = await req('POST', '/api/waste', { productId: p.id, quantity: 5, date: '2026-05-03', reason: 'invalido' });
  assert.equal(r.status, 400);
});

test('dashboard sem dados retorna estrutura coerente', async () => {
  resetTestDb();
  const r = await req('GET', '/api/dashboard');
  assert.equal(r.status, 200);
  assert.equal(r.data.totals.sales, 0);
  assert.equal(r.data.totals.production, 0);
  assert.equal(r.data.totals.waste, 0);
  assert.equal(r.data.totals.wastePct, 0);
  assert.deepEqual(r.data.topSellers, []);
  assert.deepEqual(r.data.topWasted, []);
});

test('dashboard com dados calcula totais e ranking', async () => {
  resetTestDb();
  const p1 = (await req('POST', '/api/products', { name: 'Top 1', unit: 'unidade' })).data;
  const p2 = (await req('POST', '/api/products', { name: 'Top 2', unit: 'unidade' })).data;
  const today = new Date().toISOString().slice(0, 10);
  await req('POST', '/api/sales',      { productId: p1.id, quantity: 100, date: today });
  await req('POST', '/api/sales',      { productId: p2.id, quantity: 40,  date: today });
  await req('POST', '/api/production', { productId: p1.id, quantity: 120, date: today });
  await req('POST', '/api/waste',      { productId: p1.id, quantity: 20,  date: today });

  const r = await req('GET', '/api/dashboard');
  assert.equal(r.status, 200);
  assert.equal(r.data.totals.sales, 140);
  assert.equal(r.data.totals.production, 120);
  assert.equal(r.data.totals.waste, 20);
  assert.ok(r.data.totals.wastePct > 0);
  assert.equal(r.data.topSellers[0].productId, p1.id);
  assert.equal(r.data.topSellers[0].quantity, 100);
});

test('recomendações respondem com array por produto', async () => {
  resetTestDb();
  const p = (await req('POST', '/api/products', { name: 'Rec 1', unit: 'unidade' })).data;
  const today = new Date();
  for (let i = 1; i <= 14; i++) {
    const d = new Date(today.getTime() - i * 86400000).toISOString().slice(0, 10);
    await req('POST', '/api/sales', { productId: p.id, quantity: 20, date: d });
  }
  const r = await req('GET', '/api/recommendations');
  assert.equal(r.status, 200);
  assert.ok(Array.isArray(r.data.recommendations));
  const rec = r.data.recommendations.find(x => x.productId === p.id);
  assert.ok(rec);
  assert.ok(rec.suggested > 0);
});
