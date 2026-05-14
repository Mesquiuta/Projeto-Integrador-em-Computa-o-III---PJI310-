/**
 * Testes do algoritmo de sugestão de produção.
 * Roda com: npm test
 * Usa node:test (built-in, Node 18+).
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { recommendForProduct, _internal } = require('../server/services/forecast');

const { toISODate } = _internal;

function daysAgo(n) {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

const product = { id: 'p1', name: 'Pão Francês', unit: 'kg' };

test('sem histórico → retorna sugestão 0 com mensagem de dados insuficientes', () => {
  const rec = recommendForProduct({
    product,
    targetDate: daysAgo(-1), // amanhã
    sales: [], production: [], waste: []
  });
  assert.equal(rec.suggested, 0);
  assert.equal(rec.avgSales, 0);
  assert.match(rec.justification, /insuficient/i);
});

test('com média estável, sugere média + margem (arredondada para cima)', () => {
  const sales = [];
  // 14 dias com 10 unidades cada
  for (let i = 1; i <= 14; i++) sales.push({ productId: 'p1', date: daysAgo(i), quantity: 10 });

  const rec = recommendForProduct({
    product, targetDate: daysAgo(-1),
    sales, production: [], waste: [],
    safetyMargin: 0.10
  });
  assert.equal(rec.avgSales, 10);
  // Esperado: 10 * 1.10 = 11 (arredondado para cima)
  assert.equal(rec.suggested, 11);
  assert.match(rec.justification, /14 dias|mesmo dia/);
});

test('prefere mesmo dia da semana quando há ≥3 amostras', () => {
  const target = daysAgo(-1); // amanhã
  const dow = new Date(target + 'T00:00:00Z').getUTCDay();
  const sales = [];
  // adiciona 4 sextas (ou whatever dia da semana for) com 50 e outros dias com 5
  for (let i = 1; i <= 28; i++) {
    const d = daysAgo(i);
    const di = new Date(d + 'T00:00:00Z').getUTCDay();
    sales.push({ productId: 'p1', date: d, quantity: di === dow ? 50 : 5 });
  }
  const rec = recommendForProduct({ product, targetDate: target, sales, production: [], waste: [], safetyMargin: 0.10 });
  // Deve usar a média do dia da semana (50), não a geral (~11)
  assert.equal(rec.avgSales, 50);
  assert.equal(rec.suggested, 55); // 50 * 1.10
  assert.match(rec.justification, /mesmo dia da semana/);
});

test('reduz sugestão quando há sobra significativa recente', () => {
  const sales = [];
  for (let i = 1; i <= 14; i++) sales.push({ productId: 'p1', date: daysAgo(i), quantity: 100 });
  const waste = [];
  // sobra média alta: 30/dia nos últimos 7 dias (30% das vendas)
  for (let i = 1; i <= 7; i++) waste.push({ productId: 'p1', date: daysAgo(i), quantity: 30 });

  const recNoWaste  = recommendForProduct({ product, targetDate: daysAgo(-1), sales, production: [], waste: [], safetyMargin: 0.10 });
  const recWithWaste = recommendForProduct({ product, targetDate: daysAgo(-1), sales, production: [], waste,    safetyMargin: 0.10 });

  assert.ok(recWithWaste.suggested < recNoWaste.suggested, 'Sobra alta deve reduzir a sugestão');
  assert.match(recWithWaste.justification, /sobra recente/);
});

test('aumenta sugestão quando detecta possível ruptura (vendas ≈ produção)', () => {
  const sales = [];
  const production = [];
  for (let i = 1; i <= 7; i++) {
    const d = daysAgo(i);
    sales.push({ productId: 'p1', date: d, quantity: 100 });
    production.push({ productId: 'p1', date: d, quantity: 100 }); // vendeu tudo
  }
  // Mais histórico para a média
  for (let i = 8; i <= 21; i++) sales.push({ productId: 'p1', date: daysAgo(i), quantity: 100 });

  const rec = recommendForProduct({ product, targetDate: daysAgo(-1), sales, production, waste: [], safetyMargin: 0.10 });
  // 100 * 1.15 (ruptura) * 1.10 (margem) = 126.5 → 127
  assert.ok(rec.suggested >= 120, `Esperava ≥120 por causa do acréscimo de ruptura, recebeu ${rec.suggested}`);
  assert.match(rec.justification, /ruptura/);
});

test('nunca devolve número negativo, sempre arredonda para cima', () => {
  const sales = [{ productId: 'p1', date: daysAgo(1), quantity: 1 }];
  const waste = [
    { productId: 'p1', date: daysAgo(1), quantity: 50 },
    { productId: 'p1', date: daysAgo(2), quantity: 50 }
  ];
  const rec = recommendForProduct({ product, targetDate: daysAgo(-1), sales, production: [], waste, safetyMargin: 0.10 });
  assert.ok(rec.suggested >= 0);
  assert.equal(rec.suggested, Math.ceil(rec.suggested));
});

test('margem de segurança configurável', () => {
  const sales = [];
  for (let i = 1; i <= 14; i++) sales.push({ productId: 'p1', date: daysAgo(i), quantity: 100 });

  const r5  = recommendForProduct({ product, targetDate: daysAgo(-1), sales, production: [], waste: [], safetyMargin: 0.05 });
  const r15 = recommendForProduct({ product, targetDate: daysAgo(-1), sales, production: [], waste: [], safetyMargin: 0.15 });
  assert.ok(r5.suggested < r15.suggested);
  assert.equal(r5.suggested, 105);
  assert.equal(r15.suggested, 115);
});

test('avgDaily considera dias distintos, não nº de transações', () => {
  const { avgDaily } = _internal;
  // 2 vendas no mesmo dia (30+20) e 1 venda em outro dia (50). Deve dar (50+50)/2 = 50.
  const records = [
    { date: '2026-05-01', quantity: 30 },
    { date: '2026-05-01', quantity: 20 },
    { date: '2026-05-02', quantity: 50 }
  ];
  assert.equal(avgDaily(records), 50);
});

test('toISODate normaliza datas em formato Date ou ISO', () => {
  assert.equal(toISODate('2026-05-13'), '2026-05-13');
  assert.equal(toISODate('2026-05-13T15:30:00Z'), '2026-05-13');
});
