/**
 * Seeder de dados de demonstração.
 * Gera 30 dias de vendas, produção e sobras para 8 produtos típicos de padaria.
 * Padrões realistas:
 *  - Pão francês vende muito todo dia, com pico no fim de semana.
 *  - Doces (sonho, croissant, bolo) vendem mais nos fins de semana.
 *  - Pão de queijo é estável.
 *  - Produção tende a superar vendas em 5–20% → gera sobra.
 *  - Cerca de 70% dos dias têm registro de sobra.
 */
const { transaction, reset, newId } = require('../db');

// PRNG determinístico (LCG) para gerar dados consistentes.
function makeRng(seed = 42) {
  let s = seed >>> 0;
  return function rng() {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function randInt(rng, min, max) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function jitter(rng, base, pct = 0.2) {
  const delta = base * pct;
  return Math.max(0, base + (rng() * 2 - 1) * delta);
}

function isoDateNDaysAgo(n) {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

const BASE_PRODUCTS = [
  // Médias diárias indicativas (segunda como referência)
  { name: 'Pão Francês',     category: 'Pães',     unit: 'kg',      price: 18.00, dailyAvg: 25, weekendBoost: 1.30, popularity: 1.0 },
  { name: 'Pão Doce',        category: 'Pães Doces', unit: 'unidade', price: 4.50,  dailyAvg: 30, weekendBoost: 1.40, popularity: 0.8 },
  { name: 'Pão de Queijo',   category: 'Salgados', unit: 'unidade', price: 3.00,  dailyAvg: 60, weekendBoost: 1.20, popularity: 0.9 },
  { name: 'Bolo de Cenoura', category: 'Bolos',    unit: 'unidade', price: 6.00,  dailyAvg: 12, weekendBoost: 1.60, popularity: 0.6 },
  { name: 'Sonho',           category: 'Doces',    unit: 'unidade', price: 5.50,  dailyAvg: 18, weekendBoost: 1.50, popularity: 0.7 },
  { name: 'Croissant',       category: 'Pães',     unit: 'unidade', price: 7.00,  dailyAvg: 14, weekendBoost: 1.70, popularity: 0.5 },
  { name: 'Baguete',         category: 'Pães',     unit: 'unidade', price: 9.50,  dailyAvg: 10, weekendBoost: 1.30, popularity: 0.5 },
  { name: 'Salgado Assado',  category: 'Salgados', unit: 'unidade', price: 6.50,  dailyAvg: 40, weekendBoost: 1.10, popularity: 0.85 }
];

async function seed({ replace = true, days = 30, seedNumber = 42 } = {}) {
  if (replace) reset();

  const rng = makeRng(seedNumber);
  const summary = { products: 0, sales: 0, production: 0, waste: 0 };

  await transaction(db => {
    // 1) Produtos
    const productMap = new Map();
    for (const p of BASE_PRODUCTS) {
      const product = {
        id: newId('p'),
        name: p.name,
        category: p.category,
        unit: p.unit,
        price: p.price,
        active: true,
        createdAt: new Date().toISOString()
      };
      db.products.push(product);
      productMap.set(p.name, { ...product, _meta: p });
      summary.products++;
    }

    // 2) Histórico
    for (let i = days; i >= 1; i--) {
      const date = isoDateNDaysAgo(i);
      const dow = new Date(date + 'T00:00:00Z').getUTCDay(); // 0=dom, 6=sáb
      const isWeekend = dow === 0 || dow === 6;
      const isMonday = dow === 1; // segunda costuma ser mais fraca

      for (const meta of BASE_PRODUCTS) {
        const product = productMap.get(meta.name);

        // Quantidade vendida do dia
        let base = meta.dailyAvg;
        if (isWeekend) base *= meta.weekendBoost;
        if (isMonday) base *= 0.85;
        const sold = Math.round(jitter(rng, base, 0.18));

        // Distribuir as vendas em 1 ou 2 períodos
        if (sold > 0) {
          const splitMorning = Math.round(sold * (0.55 + rng() * 0.2));
          const splitAfternoon = sold - splitMorning;
          db.sales.push({
            id: newId('s'),
            productId: product.id,
            quantity: splitMorning,
            date,
            period: 'manha',
            notes: '',
            createdAt: new Date().toISOString()
          });
          summary.sales++;
          if (splitAfternoon > 0) {
            db.sales.push({
              id: newId('s'),
              productId: product.id,
              quantity: splitAfternoon,
              date,
              period: 'tarde',
              notes: '',
              createdAt: new Date().toISOString()
            });
            summary.sales++;
          }
        }

        // Produção: 5%–18% acima da venda média (ou da venda real, com ruído)
        const productionQty = Math.round(jitter(rng, sold * (1.08 + rng() * 0.10), 0.07));
        if (productionQty > 0) {
          db.production.push({
            id: newId('pr'),
            productId: product.id,
            quantity: productionQty,
            date,
            period: 'manha',
            notes: '',
            createdAt: new Date().toISOString()
          });
          summary.production++;
        }

        // Sobra: diferença + pequeno ruído. ~70% dos dias têm sobra registrada.
        if (rng() < 0.7) {
          const leftover = Math.max(0, productionQty - sold);
          const wasteQty = Math.round(Math.max(0, leftover * (0.6 + rng() * 0.6))); // 60-120% da diferença
          if (wasteQty > 0) {
            const reasons = ['sobra_dia', 'sobra_dia', 'sobra_dia', 'quebra', 'baixa_qualidade'];
            db.waste.push({
              id: newId('w'),
              productId: product.id,
              quantity: wasteQty,
              date,
              reason: reasons[randInt(rng, 0, reasons.length - 1)],
              notes: '',
              createdAt: new Date().toISOString()
            });
            summary.waste++;
          }
        }
      }
    }

    db.meta.lastSeededAt = new Date().toISOString();
  });

  return summary;
}

// Execução via CLI: `node server/services/seed.js`
if (require.main === module) {
  seed({ replace: true })
    .then(summary => {
      console.log('Dados de demonstração carregados.');
      console.table(summary);
      process.exit(0);
    })
    .catch(err => {
      console.error('Falha ao carregar dados:', err);
      process.exit(1);
    });
}

module.exports = { seed };
