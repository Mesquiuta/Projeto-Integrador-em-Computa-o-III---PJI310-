/**
 * Camada de persistência em JSON local.
 * Mantém um único arquivo (server/data/db.json) com as coleções do sistema.
 * Operações de escrita são serializadas para evitar corridas no mesmo processo.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Permite redirecionar o banco para um caminho alternativo (usado pelos testes).
const DB_FILE = process.env.DB_FILE
  ? path.resolve(process.env.DB_FILE)
  : path.join(__dirname, 'data', 'db.json');
const DATA_DIR = path.dirname(DB_FILE);

const EMPTY_DB = {
  products: [],
  sales: [],
  production: [],
  waste: [],
  meta: { createdAt: null, lastSeededAt: null }
};

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readDB() {
  ensureDataDir();
  if (!fs.existsSync(DB_FILE)) {
    const initial = { ...EMPTY_DB, meta: { ...EMPTY_DB.meta, createdAt: new Date().toISOString() } };
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2));
    return initial;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    // Garante a estrutura mínima mesmo se o arquivo estiver parcial.
    return {
      products: parsed.products ?? [],
      sales: parsed.sales ?? [],
      production: parsed.production ?? [],
      waste: parsed.waste ?? [],
      meta: parsed.meta ?? { createdAt: new Date().toISOString(), lastSeededAt: null }
    };
  } catch (err) {
    console.error('[db] Banco corrompido, recriando do zero:', err.message);
    fs.writeFileSync(DB_FILE, JSON.stringify(EMPTY_DB, null, 2));
    return { ...EMPTY_DB };
  }
}

// Serializa escritas para evitar disputa quando várias requisições alteram o banco.
let writeChain = Promise.resolve();
function writeDB(data) {
  writeChain = writeChain.then(() => new Promise((resolve, reject) => {
    ensureDataDir();
    const tmp = DB_FILE + '.tmp';
    fs.writeFile(tmp, JSON.stringify(data, null, 2), (err) => {
      if (err) return reject(err);
      fs.rename(tmp, DB_FILE, (err2) => err2 ? reject(err2) : resolve());
    });
  }));
  return writeChain;
}

function newId(prefix) {
  return `${prefix}_${crypto.randomBytes(6).toString('hex')}`;
}

async function transaction(mutator) {
  const db = readDB();
  const result = mutator(db);
  await writeDB(db);
  return result;
}

function reset() {
  ensureDataDir();
  const initial = { ...EMPTY_DB, meta: { ...EMPTY_DB.meta, createdAt: new Date().toISOString() } };
  fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2));
  return initial;
}

module.exports = { readDB, writeDB, newId, transaction, reset, DB_FILE };
