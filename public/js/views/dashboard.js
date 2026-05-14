import { api } from '../api.js';
import { el, clear, daysAgoISO, todayISO, formatNumber, unitLabel, loading, emptyState } from '../utils.js';

let charts = [];

function destroyCharts() {
  for (const c of charts) { try { c.destroy(); } catch {} }
  charts = [];
}

export async function renderDashboard(root, topbar) {
  destroyCharts();

  // Filtros de período
  const fromInput = el('input', { type: 'date', value: daysAgoISO(30) });
  const toInput   = el('input', { type: 'date', value: todayISO() });
  const applyBtn  = el('button', { class: 'btn btn-sm' }, 'Aplicar');
  const last7Btn  = el('button', { class: 'btn btn-outline btn-sm' }, 'Últimos 7 dias');
  const last30Btn = el('button', { class: 'btn btn-outline btn-sm' }, 'Últimos 30 dias');

  topbar.appendChild(el('div', { class: 'field' }, [el('label', {}, 'De'), fromInput]));
  topbar.appendChild(el('div', { class: 'field' }, [el('label', {}, 'Até'), toInput]));
  topbar.appendChild(applyBtn);
  topbar.appendChild(last7Btn);
  topbar.appendChild(last30Btn);

  applyBtn.addEventListener('click', () => load());
  last7Btn.addEventListener('click', () => { fromInput.value = daysAgoISO(6); toInput.value = todayISO(); load(); });
  last30Btn.addEventListener('click', () => { fromInput.value = daysAgoISO(30); toInput.value = todayISO(); load(); });

  async function load() {
    clear(root);
    root.appendChild(loading('Carregando dashboard...'));
    let data;
    try {
      data = await api.dashboard.get({ from: fromInput.value, to: toInput.value });
    } catch (err) {
      clear(root);
      root.appendChild(emptyState({ icon: '⚠️', title: 'Erro ao carregar dashboard', description: err.message }));
      return;
    }
    clear(root);
    render(root, data);
  }

  await load();
}

function render(root, data) {
  destroyCharts();
  const hasData = data.counts.products > 0 || data.counts.sales > 0;

  if (!hasData) {
    root.appendChild(emptyState({
      icon: '🥖',
      title: 'Nenhum dado cadastrado ainda',
      description: 'Comece cadastrando produtos e registrando vendas, ou clique em "Carregar dados de demonstração" no menu lateral para popular o sistema com 30 dias de dados fictícios.'
    }));
    return;
  }

  // KPIs
  const kpiGrid = el('div', { class: 'kpi-grid' });
  kpiGrid.appendChild(kpi('Total Vendido', formatNumber(data.totals.sales), `no período ${data.range.from} → ${data.range.to}`));
  kpiGrid.appendChild(kpi('Total Produzido', formatNumber(data.totals.production)));
  kpiGrid.appendChild(kpi('Total de Sobras', formatNumber(data.totals.waste), null, 'danger'));
  kpiGrid.appendChild(kpi(
    'Desperdício Estimado',
    `${formatNumber(data.totals.wastePct, 1)}%`,
    data.totals.production > 0 ? `sobre o total produzido` : 'sem produção registrada',
    data.totals.wastePct > 15 ? 'danger' : data.totals.wastePct > 5 ? 'warning' : 'success'
  ));
  root.appendChild(kpiGrid);

  // Gráficos
  const chartsGrid = el('div', { class: 'charts-grid' });

  // Linha: vendas/produção/sobras por dia
  const lineCard = el('div', { class: 'chart-card' });
  lineCard.appendChild(el('h3', {}, 'Evolução diária (Vendas, Produção e Sobras)'));
  const lineCanvas = el('canvas', { id: 'chart-line' });
  lineCard.appendChild(lineCanvas);
  chartsGrid.appendChild(lineCard);

  // Barras: mais vendidos
  const sellersCard = el('div', { class: 'chart-card' });
  sellersCard.appendChild(el('h3', {}, 'Produtos mais vendidos'));
  const sellersCanvas = el('canvas', { id: 'chart-sellers' });
  sellersCard.appendChild(sellersCanvas);
  chartsGrid.appendChild(sellersCard);

  // Barras: mais sobras
  const wastedCard = el('div', { class: 'chart-card' });
  wastedCard.appendChild(el('h3', {}, 'Produtos com mais sobras'));
  const wastedCanvas = el('canvas', { id: 'chart-wasted' });
  wastedCard.appendChild(wastedCanvas);
  chartsGrid.appendChild(wastedCard);

  root.appendChild(chartsGrid);

  // Tabela: sugestão de produção (carregada async)
  const sugCard = el('div', { class: 'card' });
  sugCard.style.marginBottom = '24px';
  sugCard.appendChild(el('h3', { style: 'margin:0 0 12px;font-size:15px;' }, 'Sugestão de produção para amanhã'));
  const sugBody = el('div', {});
  sugBody.appendChild(loading('Calculando sugestão...'));
  sugCard.appendChild(sugBody);
  root.appendChild(sugCard);

  // Renderizar gráficos
  setTimeout(() => {
    if (data.daily.length > 0) {
      charts.push(new Chart(lineCanvas, {
        type: 'line',
        data: {
          labels: data.daily.map(d => d.date.slice(5)),
          datasets: [
            { label: 'Vendas',    data: data.daily.map(d => d.sales),      borderColor: '#2f7d32', backgroundColor: 'rgba(47,125,50,0.15)', tension: 0.25 },
            { label: 'Produção',  data: data.daily.map(d => d.production), borderColor: '#8b4513', backgroundColor: 'rgba(139,69,19,0.15)',  tension: 0.25 },
            { label: 'Sobras',    data: data.daily.map(d => d.waste),      borderColor: '#c62828', backgroundColor: 'rgba(198,40,40,0.15)', tension: 0.25 }
          ]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, scales: { y: { beginAtZero: true } } }
      }));
    } else {
      lineCard.replaceChild(el('p', { class: 'muted', style: 'padding:30px;text-align:center;' }, 'Sem dados no período.'), lineCanvas);
    }

    if (data.topSellers.length > 0) {
      charts.push(new Chart(sellersCanvas, {
        type: 'bar',
        data: {
          labels: data.topSellers.map(p => p.productName),
          datasets: [{ label: 'Quantidade vendida', data: data.topSellers.map(p => p.quantity), backgroundColor: '#8b4513' }]
        },
        options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
      }));
    } else {
      sellersCard.replaceChild(el('p', { class: 'muted', style: 'padding:30px;text-align:center;' }, 'Sem vendas no período.'), sellersCanvas);
    }

    if (data.topWasted.length > 0) {
      charts.push(new Chart(wastedCanvas, {
        type: 'bar',
        data: {
          labels: data.topWasted.map(p => p.productName),
          datasets: [{ label: 'Quantidade descartada', data: data.topWasted.map(p => p.quantity), backgroundColor: '#c62828' }]
        },
        options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
      }));
    } else {
      wastedCard.replaceChild(el('p', { class: 'muted', style: 'padding:30px;text-align:center;' }, 'Sem sobras no período.'), wastedCanvas);
    }
  }, 0);

  // Sugestões
  api.recommendations.get({}).then(({ recommendations, targetDate }) => {
    clear(sugBody);
    const hasValid = recommendations.some(r => r.suggested > 0);
    if (!hasValid) {
      sugBody.appendChild(el('p', { class: 'muted' }, 'Sem dados suficientes para gerar sugestão. Registre vendas para liberar.'));
      return;
    }
    sugBody.appendChild(el('p', { class: 'muted', style: 'margin:0 0 8px;font-size:12.5px;' }, `Sugestão para ${targetDate} — margem de segurança 10%`));
    const tbl = el('table', { class: 'data' });
    tbl.appendChild(el('thead', {}, el('tr', {}, [
      el('th', {}, 'Produto'),
      el('th', { class: 'right' }, 'Média de vendas'),
      el('th', { class: 'right' }, 'Média de sobras'),
      el('th', { class: 'right' }, 'Sugestão')
    ])));
    const tbody = el('tbody');
    for (const r of recommendations.sort((a,b)=>b.suggested-a.suggested)) {
      tbody.appendChild(el('tr', {}, [
        el('td', {}, r.productName),
        el('td', { class: 'right' }, `${formatNumber(r.avgSales, 1)} ${unitLabel(r.unit)}`),
        el('td', { class: 'right' }, `${formatNumber(r.avgWaste, 1)} ${unitLabel(r.unit)}`),
        el('td', { class: 'right' }, el('strong', {}, `${formatNumber(r.suggested)} ${unitLabel(r.unit)}`))
      ]));
    }
    tbl.appendChild(tbody);
    sugBody.appendChild(el('div', { class: 'table-wrapper' }, tbl));
  }).catch(err => {
    clear(sugBody);
    sugBody.appendChild(el('p', { class: 'muted' }, 'Não foi possível calcular a sugestão: ' + err.message));
  });
}

function kpi(label, value, hint, variant) {
  const node = el('div', { class: 'kpi' });
  node.appendChild(el('div', { class: 'kpi-label' }, label));
  node.appendChild(el('div', { class: `kpi-value ${variant || ''}` }, String(value)));
  if (hint) node.appendChild(el('div', { class: 'kpi-hint' }, hint));
  return node;
}
