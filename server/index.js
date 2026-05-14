/**
 * Servidor HTTP do Projeto Integrador - UNIVESP
 * Tema: Previsão de produção para redução de desperdícios em padaria.
 */
const path = require('path');
const express = require('express');
const fs = require('fs');

const { readDB, reset } = require('./db');
const productsRouter = require('./routes/products');
const salesRouter = require('./routes/sales');
const productionRouter = require('./routes/production');
const wasteRouter = require('./routes/waste');
const dashboardRouter = require('./routes/dashboard');
const recommendationsRouter = require('./routes/recommendations');
const seedService = require('./services/seed');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '1mb' }));

// Logger básico de requisições.
app.use((req, _res, next) => {
  if (req.path.startsWith('/api')) {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  }
  next();
});

// API
app.use('/api/products', productsRouter);
app.use('/api/sales', salesRouter);
app.use('/api/production', productionRouter);
app.use('/api/waste', wasteRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/recommendations', recommendationsRouter);

// Healthcheck
app.get('/api/health', (_req, res) => {
  const db = readDB();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    counts: {
      products: db.products.length,
      sales: db.sales.length,
      production: db.production.length,
      waste: db.waste.length
    }
  });
});

// Carrega dados de demonstração (acionado pelo botão na UI).
app.post('/api/demo/seed', async (req, res) => {
  try {
    const summary = await seedService.seed({ replace: req.body?.replace !== false });
    res.json({ ok: true, ...summary });
  } catch (err) {
    console.error('[seed]', err);
    res.status(500).json({ error: 'Falha ao carregar dados de demonstração.' });
  }
});

// Limpa todos os dados.
app.post('/api/demo/reset', (_req, res) => {
  reset();
  res.json({ ok: true, message: 'Banco resetado.' });
});

// Frontend estático
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
app.use(express.static(PUBLIC_DIR));

// SPA fallback: qualquer rota não-API devolve index.html.
app.get(/^\/(?!api).*/, (_req, res, next) => {
  const idx = path.join(PUBLIC_DIR, 'index.html');
  if (fs.existsSync(idx)) return res.sendFile(idx);
  next();
});

// Middleware de erro genérico
app.use((err, _req, res, _next) => {
  console.error('[error]', err);
  if (res.headersSent) return;
  res.status(err.status || 500).json({ error: err.message || 'Erro interno do servidor.' });
});

app.listen(PORT, () => {
  console.log('========================================================');
  console.log(' Projeto Integrador UNIVESP - Padaria');
  console.log(' Previsão de produção / Redução de desperdícios');
  console.log('--------------------------------------------------------');
  console.log(` Servidor rodando em: http://localhost:${PORT}`);
  console.log(` API:                 http://localhost:${PORT}/api/health`);
  console.log('========================================================');
});
