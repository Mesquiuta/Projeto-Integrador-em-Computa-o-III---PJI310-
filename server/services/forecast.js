/**
 * Algoritmo de sugestão de produção.
 *
 * Filosofia: simples, explicável e adequado ao Projeto Integrador.
 * Não é machine learning — é estatística histórica com regras de negócio.
 *
 * Passos:
 *  1. Filtra vendas dos últimos 30 dias para o produto.
 *  2. Se houver ≥3 amostras do mesmo dia da semana, prefere essa série.
 *     Caso contrário, usa janela de 14 ou 7 dias, conforme disponibilidade.
 *  3. Calcula média diária somando vendas por data e dividindo pelo nº de dias.
 *  4. Avalia sobras médias dos últimos 7 dias — se altas, reduz a sugestão.
 *  5. Detecta possíveis rupturas (vendas ≈ produção) — se frequentes, acresce.
 *  6. Aplica margem de segurança configurável (padrão 10%).
 *  7. Garante valor ≥0 e arredonda para cima.
 *  8. Devolve justificativa textual curta.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

function parseISODate(d) {
  // Aceita "YYYY-MM-DD" ou ISO completo. Retorna Date à meia-noite UTC.
  if (!d) return null;
  const s = String(d);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(s + 'T00:00:00Z');
  const dt = new Date(s);
  if (isNaN(dt.getTime())) return null;
  return new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate()));
}

function toISODate(date) {
  const d = parseISODate(date) ?? new Date();
  return d.toISOString().slice(0, 10);
}

function daysBetween(a, b) {
  const da = parseISODate(a);
  const db = parseISODate(b);
  if (!da || !db) return Infinity;
  return Math.floor((db - da) / DAY_MS);
}

function dayOfWeek(date) {
  const d = parseISODate(date);
  return d ? d.getUTCDay() : null; // 0=domingo
}

function round1(n) { return Math.round(n * 10) / 10; }

/**
 * Soma quantidades por data e devolve a média diária considerando
 * o número de DIAS DISTINTOS com registros (não o nº de transações).
 * Isso evita superestimar quando há várias vendas no mesmo dia.
 */
function avgDaily(records) {
  if (!records.length) return 0;
  const byDate = new Map();
  for (const r of records) {
    const d = toISODate(r.date);
    byDate.set(d, (byDate.get(d) ?? 0) + Number(r.quantity || 0));
  }
  const totals = Array.from(byDate.values());
  const sum = totals.reduce((a, b) => a + b, 0);
  return sum / totals.length;
}

/**
 * Calcula a sugestão de produção para um único produto numa data alvo.
 *
 * @param {object} args
 * @param {object} args.product - {id, name, unit}
 * @param {string} args.targetDate - "YYYY-MM-DD"
 * @param {Array}  args.sales - vendas do produto
 * @param {Array}  args.production - produção do produto
 * @param {Array}  args.waste - perdas do produto
 * @param {number} [args.safetyMargin=0.10] - margem de segurança (0-1)
 * @returns {object} sugestão com produto, médias, quantidade e justificativa.
 */
function recommendForProduct({ product, targetDate, sales = [], production = [], waste = [], safetyMargin = 0.10 }) {
  const tDate = toISODate(targetDate);
  const tDow = dayOfWeek(tDate);

  // Considera apenas registros anteriores à data alvo.
  const recentSales = sales.filter(s => s.productId === product.id && daysBetween(s.date, tDate) > 0 && daysBetween(s.date, tDate) <= 30);
  const recentWaste = waste.filter(w => w.productId === product.id && daysBetween(w.date, tDate) > 0 && daysBetween(w.date, tDate) <= 7);
  const recentProd  = production.filter(p => p.productId === product.id && daysBetween(p.date, tDate) > 0 && daysBetween(p.date, tDate) <= 7);

  if (recentSales.length === 0) {
    return {
      productId: product.id,
      productName: product.name,
      unit: product.unit,
      avgSales: 0,
      avgWaste: 0,
      suggested: 0,
      basisDays: 0,
      justification: 'Dados insuficientes — sem histórico de vendas nos últimos 30 dias. Cadastre vendas para gerar uma sugestão.'
    };
  }

  // Estratégia 1: mesmo dia da semana (≥3 amostras).
  const sameDow = recentSales.filter(s => dayOfWeek(s.date) === tDow);
  const datesSameDow = new Set(sameDow.map(s => toISODate(s.date)));

  let basis, justBase, basisDays;
  if (datesSameDow.size >= 3) {
    basis = avgDaily(sameDow);
    basisDays = datesSameDow.size;
    justBase = `média do mesmo dia da semana (${basisDays} amostras)`;
  } else {
    // Estratégia 2: janelas progressivas.
    const last14 = recentSales.filter(s => daysBetween(s.date, tDate) <= 14);
    const distinctDays14 = new Set(last14.map(s => toISODate(s.date))).size;
    if (distinctDays14 >= 5) {
      basis = avgDaily(last14);
      basisDays = distinctDays14;
      justBase = `média dos últimos 14 dias`;
    } else {
      const last7 = recentSales.filter(s => daysBetween(s.date, tDate) <= 7);
      const distinctDays7 = new Set(last7.map(s => toISODate(s.date))).size;
      if (distinctDays7 >= 3) {
        basis = avgDaily(last7);
        basisDays = distinctDays7;
        justBase = `média dos últimos 7 dias`;
      } else {
        basis = avgDaily(recentSales);
        basisDays = new Set(recentSales.map(s => toISODate(s.date))).size;
        justBase = `média geral dos últimos ${basisDays} dia(s) com registros`;
      }
    }
  }

  // Média diária de sobras dos últimos 7 dias.
  const avgWaste = recentWaste.length > 0 ? avgDaily(recentWaste) : 0;

  // Detecção de ruptura: dias em que vendas chegam ≥95% da produção.
  const byDate = new Map();
  for (const s of recentSales.filter(x => daysBetween(x.date, tDate) <= 7)) {
    const d = toISODate(s.date);
    const e = byDate.get(d) ?? { sold: 0, produced: 0 };
    e.sold += Number(s.quantity || 0);
    byDate.set(d, e);
  }
  for (const p of recentProd) {
    const d = toISODate(p.date);
    const e = byDate.get(d) ?? { sold: 0, produced: 0 };
    e.produced += Number(p.quantity || 0);
    byDate.set(d, e);
  }
  let stockoutDays = 0;
  for (const e of byDate.values()) {
    if (e.produced > 0 && e.sold >= e.produced * 0.95) stockoutDays++;
  }

  const adjustments = [];
  let suggested = basis;

  // Ajuste por sobra: se a sobra média representa >10% da média de vendas, reduz.
  if (avgWaste > 0 && basis > 0 && avgWaste / basis > 0.10) {
    const reduction = Math.min(avgWaste, basis * 0.20);
    suggested -= reduction;
    adjustments.push('ajuste por sobra recente');
  }

  // Ajuste por ruptura: se houve ≥2 dias com possível falta, acresce 15%.
  if (stockoutDays >= 2) {
    suggested *= 1.15;
    adjustments.push('acréscimo por possível ruptura');
  }

  // Margem de segurança (padrão 10%).
  const margin = Math.max(0, Math.min(0.5, Number(safetyMargin) || 0));
  suggested *= (1 + margin);

  // Sanitização final.
  // toFixed(4) limpa artefatos de ponto flutuante (ex.: 50*1.10 = 55.00000000000001).
  suggested = Math.max(0, Math.ceil(Number(suggested.toFixed(4))));

  let justification = `Sugestão baseada em ${justBase}`;
  if (adjustments.length) justification += ` com ${adjustments.join(' e ')}`;
  justification += `. Margem de segurança de ${Math.round(margin * 100)}%.`;

  return {
    productId: product.id,
    productName: product.name,
    unit: product.unit,
    avgSales: round1(basis),
    avgWaste: round1(avgWaste),
    suggested,
    basisDays,
    stockoutDays,
    justification
  };
}

/**
 * Calcula sugestões para uma lista de produtos.
 */
function recommendForAll({ products, targetDate, sales, production, waste, safetyMargin }) {
  return products
    .filter(p => p.active !== false)
    .map(product => recommendForProduct({ product, targetDate, sales, production, waste, safetyMargin }));
}

module.exports = {
  recommendForProduct,
  recommendForAll,
  // exports auxiliares para testes
  _internal: { avgDaily, daysBetween, dayOfWeek, parseISODate, toISODate }
};
