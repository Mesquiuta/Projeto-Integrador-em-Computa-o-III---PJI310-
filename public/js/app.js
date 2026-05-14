// Roteador principal da SPA.
import { api } from './api.js';
import { clear, toast } from './utils.js';
import { renderDashboard } from './views/dashboard.js';
import { renderProducts } from './views/products.js';
import { renderSales } from './views/sales.js';
import { renderProduction } from './views/production.js';
import { renderWaste } from './views/waste.js';
import { renderRecommendations } from './views/recommendations.js';

const routes = {
  dashboard:        { title: 'Dashboard',              render: renderDashboard },
  products:         { title: 'Produtos',               render: renderProducts },
  sales:            { title: 'Vendas',                 render: renderSales },
  production:       { title: 'Produção',               render: renderProduction },
  waste:            { title: 'Sobras / Perdas',        render: renderWaste },
  recommendations:  { title: 'Sugestão de Produção',   render: renderRecommendations }
};

function currentRoute() {
  const hash = location.hash || '#/dashboard';
  const key = hash.replace(/^#\//, '');
  return routes[key] ? key : 'dashboard';
}

async function navigate() {
  const key = currentRoute();
  const route = routes[key];
  document.getElementById('page-title').textContent = route.title;
  const actions = document.getElementById('topbar-actions');
  clear(actions);
  document.querySelectorAll('.nav a').forEach(a => {
    a.classList.toggle('active', a.dataset.route === key);
  });
  const view = document.getElementById('view');
  clear(view);
  try {
    await route.render(view, actions);
  } catch (err) {
    console.error('[view]', err);
    toast(err.message || 'Erro ao carregar a tela.', 'danger', 5000);
    view.innerHTML = `<div class="empty-state"><span class="icon">⚠️</span><h3>Erro ao carregar</h3><p>${(err.message || '').replace(/</g, '&lt;')}</p></div>`;
  }
}

function wireSeedButtons() {
  document.getElementById('btn-seed').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    if (!confirm('Carregar dados de demonstração?\nIsso substituirá os dados atuais por dados fictícios para apresentação.')) return;
    btn.disabled = true;
    btn.textContent = 'Carregando...';
    try {
      const summary = await api.demo.seed();
      toast(`Dados carregados: ${summary.products} produtos, ${summary.sales} vendas, ${summary.production} produções, ${summary.waste} sobras.`, 'success', 5000);
      await navigate();
    } catch (err) {
      toast(err.message, 'danger');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Carregar dados de demonstração';
    }
  });
  document.getElementById('btn-reset').addEventListener('click', async (e) => {
    if (!confirm('Tem certeza que deseja LIMPAR TODOS os dados?\nEssa ação não pode ser desfeita.')) return;
    try {
      await api.demo.reset();
      toast('Banco limpo.', 'success');
      await navigate();
    } catch (err) {
      toast(err.message, 'danger');
    }
  });
}

window.addEventListener('hashchange', navigate);
window.addEventListener('DOMContentLoaded', () => {
  wireSeedButtons();
  navigate();
});
