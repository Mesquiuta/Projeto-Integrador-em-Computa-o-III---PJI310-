import { api } from '../api.js';
import { el, clear, toast, formatNumber, formatDate, unitLabel, tomorrowISO, loading, emptyState } from '../utils.js';

export async function renderRecommendations(root, topbar) {
  const dateInput = el('input', { type: 'date', value: tomorrowISO() });
  const marginInput = el('input', { type: 'number', min: '0', max: '50', step: '1', value: '10', style: 'width:90px;' });
  const applyBtn = el('button', { class: 'btn btn-sm' }, 'Recalcular');
  const exportBtn = el('button', { class: 'btn btn-outline btn-sm' }, 'Exportar CSV');

  topbar.appendChild(el('div', { class: 'field' }, [el('label', {}, 'Data alvo'), dateInput]));
  topbar.appendChild(el('div', { class: 'field' }, [el('label', {}, 'Margem (%)'), marginInput]));
  topbar.appendChild(applyBtn);
  topbar.appendChild(exportBtn);

  const info = el('div', { class: 'card', style: 'margin-bottom:16px;background:var(--surface-alt);border-left:4px solid var(--primary);' }, [
    el('h3', { style: 'margin:0 0 6px;font-size:14px;' }, 'Como funciona a sugestão?'),
    el('p', { style: 'margin:0;font-size:13px;color:var(--text-muted);line-height:1.55;' }, [
      'A sugestão usa estatística histórica simples e explicável: preferência pela média do ',
      el('strong', {}, 'mesmo dia da semana'),
      ' quando há ≥3 amostras, ou janelas de 14/7 dias como fallback. Aplica ',
      el('strong', {}, 'ajuste por sobras recentes'),
      ', detecta ',
      el('strong', {}, 'possíveis rupturas'),
      ' (vendas ≈ produção) e soma a ',
      el('strong', {}, 'margem de segurança'),
      ' configurada. Sempre arredonda para cima e nunca sugere número negativo.'
    ])
  ]);
  root.appendChild(info);

  const container = el('div', {});
  root.appendChild(container);

  let lastData = null;

  async function load() {
    clear(container);
    container.appendChild(loading('Calculando sugestão de produção...'));
    let data;
    try {
      data = await api.recommendations.get({
        date: dateInput.value,
        safetyMargin: (Number(marginInput.value) || 0) / 100
      });
    } catch (err) {
      clear(container);
      container.appendChild(emptyState({ icon: '⚠️', title: 'Erro ao calcular', description: err.message }));
      return;
    }
    lastData = data;
    clear(container);
    render(container, data);
  }

  applyBtn.addEventListener('click', load);
  dateInput.addEventListener('change', load);
  marginInput.addEventListener('change', load);
  exportBtn.addEventListener('click', () => {
    if (!lastData) return;
    exportCSV(lastData);
  });

  await load();
}

function render(container, data) {
  if (!data.recommendations.length) {
    container.appendChild(emptyState({
      icon: '🎯',
      title: 'Sem produtos para calcular',
      description: 'Cadastre produtos e registre vendas para gerar sugestões de produção.'
    }));
    return;
  }
  const hasAny = data.recommendations.some(r => r.suggested > 0);
  const header = el('div', { class: 'card', style: 'margin-bottom:14px;display:flex;gap:14px;align-items:center;flex-wrap:wrap;' }, [
    el('div', {}, [
      el('div', { class: 'kpi-label' }, 'Data alvo'),
      el('div', { style: 'font-size:18px;font-weight:600;' }, formatDate(data.targetDate))
    ]),
    el('div', {}, [
      el('div', { class: 'kpi-label' }, 'Margem de segurança'),
      el('div', { style: 'font-size:18px;font-weight:600;' }, `${Math.round(data.safetyMargin * 100)}%`)
    ]),
    el('div', {}, [
      el('div', { class: 'kpi-label' }, 'Produtos analisados'),
      el('div', { style: 'font-size:18px;font-weight:600;' }, String(data.recommendations.length))
    ])
  ]);
  container.appendChild(header);

  if (!hasAny) {
    container.appendChild(emptyState({
      icon: '📊',
      title: 'Dados insuficientes',
      description: 'Não há histórico suficiente para gerar sugestões. Registre vendas para os produtos.'
    }));
    return;
  }

  const tbl = el('table', { class: 'data' });
  tbl.appendChild(el('thead', {}, el('tr', {}, [
    el('th', {}, 'Produto'),
    el('th', { class: 'right' }, 'Média de vendas (diária)'),
    el('th', { class: 'right' }, 'Média de sobras (diária)'),
    el('th', { class: 'right' }, 'Quantidade sugerida'),
    el('th', {}, 'Justificativa')
  ])));
  const tbody = el('tbody');
  const sorted = [...data.recommendations].sort((a, b) => b.suggested - a.suggested);
  for (const r of sorted) {
    tbody.appendChild(el('tr', {}, [
      el('td', {}, el('strong', {}, r.productName)),
      el('td', { class: 'right' }, `${formatNumber(r.avgSales, 1)} ${unitLabel(r.unit)}`),
      el('td', { class: 'right' }, r.avgWaste > 0 ? `${formatNumber(r.avgWaste, 1)} ${unitLabel(r.unit)}` : el('span', { class: 'muted' }, '—')),
      el('td', { class: 'right' }, r.suggested > 0
        ? el('strong', { style: 'font-size:15px;color:var(--primary);' }, `${formatNumber(r.suggested)} ${unitLabel(r.unit)}`)
        : el('span', { class: 'muted' }, 'Insuficiente')),
      el('td', { class: 'muted', style: 'max-width:380px;' }, r.justification)
    ]));
  }
  tbl.appendChild(tbody);
  container.appendChild(el('div', { class: 'table-wrapper' }, tbl));
}

function exportCSV(data) {
  const rows = [['Produto', 'Unidade', 'Média Vendas', 'Média Sobras', 'Sugerido', 'Justificativa']];
  for (const r of data.recommendations) {
    rows.push([r.productName, r.unit, r.avgSales, r.avgWaste, r.suggested, `"${r.justification.replace(/"/g, '""')}"`]);
  }
  const csv = rows.map(r => r.join(';')).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `sugestao-producao-${data.targetDate}.csv`;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
  toast('CSV exportado.', 'success');
}
