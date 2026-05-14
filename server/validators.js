/**
 * Funções utilitárias de validação e normalização compartilhadas pelas rotas.
 */

const PERIODS = ['manha', 'tarde', 'noite', 'dia'];
const WASTE_REASONS = ['sobra_dia', 'vencimento', 'quebra', 'baixa_qualidade', 'outro'];
const UNITS = ['unidade', 'kg', 'g', 'litro', 'outro'];

function isISODate(s) {
  if (typeof s !== 'string') return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + 'T00:00:00Z');
  return !isNaN(d.getTime());
}

function normalizeString(v) {
  return typeof v === 'string' ? v.trim() : '';
}

function toNumber(v) {
  if (v === null || v === undefined || v === '') return NaN;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

function validateProduct(body, { partial = false } = {}) {
  const errors = [];
  const out = {};
  if (!partial || body.name !== undefined) {
    const name = normalizeString(body.name);
    if (!name) errors.push('Nome do produto é obrigatório.');
    else out.name = name;
  }
  if (!partial || body.category !== undefined) {
    out.category = normalizeString(body.category) || 'Outros';
  }
  if (!partial || body.unit !== undefined) {
    const unit = normalizeString(body.unit) || 'unidade';
    if (!UNITS.includes(unit)) errors.push(`Unidade inválida. Use: ${UNITS.join(', ')}.`);
    else out.unit = unit;
  }
  if (body.price !== undefined && body.price !== null && body.price !== '') {
    const price = toNumber(body.price);
    if (isNaN(price) || price < 0) errors.push('Preço inválido.');
    else out.price = price;
  } else if (!partial) {
    out.price = 0;
  }
  if (!partial || body.active !== undefined) {
    out.active = body.active === undefined ? true : Boolean(body.active);
  }
  return { errors, value: out };
}

function validateSale(body, products, { partial = false } = {}) {
  const errors = [];
  const out = {};
  if (!partial || body.productId !== undefined) {
    const productId = normalizeString(body.productId);
    if (!productId) errors.push('Produto é obrigatório.');
    else if (!products.find(p => p.id === productId)) errors.push('Produto não encontrado.');
    else out.productId = productId;
  }
  if (!partial || body.quantity !== undefined) {
    const q = toNumber(body.quantity);
    if (isNaN(q) || q <= 0) errors.push('Quantidade deve ser maior que zero.');
    else out.quantity = q;
  }
  if (!partial || body.date !== undefined) {
    const date = normalizeString(body.date);
    if (!isISODate(date)) errors.push('Data inválida (use AAAA-MM-DD).');
    else out.date = date;
  }
  if (!partial || body.period !== undefined) {
    const period = normalizeString(body.period) || 'dia';
    if (!PERIODS.includes(period)) errors.push(`Período inválido. Use: ${PERIODS.join(', ')}.`);
    else out.period = period;
  }
  if (body.notes !== undefined) out.notes = normalizeString(body.notes);
  else if (!partial) out.notes = '';
  return { errors, value: out };
}

function validateProduction(body, products, { partial = false } = {}) {
  const errors = [];
  const out = {};
  if (!partial || body.productId !== undefined) {
    const productId = normalizeString(body.productId);
    if (!productId) errors.push('Produto é obrigatório.');
    else if (!products.find(p => p.id === productId)) errors.push('Produto não encontrado.');
    else out.productId = productId;
  }
  if (!partial || body.quantity !== undefined) {
    const q = toNumber(body.quantity);
    if (isNaN(q) || q <= 0) errors.push('Quantidade deve ser maior que zero.');
    else out.quantity = q;
  }
  if (!partial || body.date !== undefined) {
    const date = normalizeString(body.date);
    if (!isISODate(date)) errors.push('Data inválida (use AAAA-MM-DD).');
    else out.date = date;
  }
  if (body.period !== undefined) {
    const period = normalizeString(body.period);
    if (period && !PERIODS.includes(period)) errors.push(`Período inválido. Use: ${PERIODS.join(', ')}.`);
    else out.period = period || null;
  } else if (!partial) {
    out.period = null;
  }
  if (body.notes !== undefined) out.notes = normalizeString(body.notes);
  else if (!partial) out.notes = '';
  return { errors, value: out };
}

function validateWaste(body, products, { partial = false } = {}) {
  const errors = [];
  const out = {};
  if (!partial || body.productId !== undefined) {
    const productId = normalizeString(body.productId);
    if (!productId) errors.push('Produto é obrigatório.');
    else if (!products.find(p => p.id === productId)) errors.push('Produto não encontrado.');
    else out.productId = productId;
  }
  if (!partial || body.quantity !== undefined) {
    const q = toNumber(body.quantity);
    if (isNaN(q) || q < 0) errors.push('Quantidade deve ser maior ou igual a zero.');
    else out.quantity = q;
  }
  if (!partial || body.date !== undefined) {
    const date = normalizeString(body.date);
    if (!isISODate(date)) errors.push('Data inválida (use AAAA-MM-DD).');
    else out.date = date;
  }
  if (!partial || body.reason !== undefined) {
    const reason = normalizeString(body.reason) || 'sobra_dia';
    if (!WASTE_REASONS.includes(reason)) errors.push(`Motivo inválido. Use: ${WASTE_REASONS.join(', ')}.`);
    else out.reason = reason;
  }
  if (body.notes !== undefined) out.notes = normalizeString(body.notes);
  else if (!partial) out.notes = '';
  return { errors, value: out };
}

module.exports = {
  PERIODS, WASTE_REASONS, UNITS,
  isISODate, normalizeString, toNumber,
  validateProduct, validateSale, validateProduction, validateWaste
};
