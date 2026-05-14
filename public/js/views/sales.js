import { api } from '../api.js';
import { el, clear, toast, openModal, confirmDialog, formatDate, periodLabel, unitLabel, todayISO, loading, emptyState } from '../utils.js';

const PERIODS = [
  { value: 'manha', label: 'Manhã' },
  { value: 'tarde', label: 'Tarde' },
  { value: 'noite', label: 'Noite' },
  { value: 'dia',   label: 'Dia inteiro' }
];

export async function renderSales(root, topbar) {
  let products = [];
  try { products = await api.products.list({ active: 'true' }); }
  catch (err) {
    root.appendChild(emptyState({ icon: '⚠️', title: 'Erro ao carregar produtos', description: err.message }));
    return;
  }

  topbar.appendChild(el('button', {
    class: 'btn',
    onClick: () => products.length === 0
      ? toast('Cadastre ao menos um produto antes de registrar uma venda.', 'warning')
      : openSaleModal(null, products, load)
  }, '+ Registrar venda'));

  const filtersBar = el('div', { class: 'filters' });
  const productFilter = el('select', {});
  productFilter.appendChild(el('option', { value: '' }, 'Todos os produtos'));
  for (const p of products) productFilter.appendChild(el('option', { value: p.id }, p.name));
  const fromInput = el('input', { type: 'date' });
  const toInput = el('input', { type: 'date' });
  const periodFilter = el('select', {});
  periodFilter.appendChild(el('option', { value: '' }, 'Todos os períodos'));
  for (const p of PERIODS) periodFilter.appendChild(el('option', { value: p.value }, p.label));
  const clearBtn = el('button', { class: 'btn btn-outline btn-sm' }, 'Limpar filtros');

  filtersBar.appendChild(el('div', { class: 'field' }, [el('label', {}, 'Produto'), productFilter]));
  filtersBar.appendChild(el('div', { class: 'field' }, [el('label', {}, 'Período'), periodFilter]));
  filtersBar.appendChild(el('div', { class: 'field' }, [el('label', {}, 'De'), fromInput]));
  filtersBar.appendChild(el('div', { class: 'field' }, [el('label', {}, 'Até'), toInput]));
  filtersBar.appendChild(clearBtn);
  root.appendChild(filtersBar);

  const listContainer = el('div', {});
  root.appendChild(listContainer);

  productFilter.addEventListener('change', load);
  periodFilter.addEventListener('change', load);
  fromInput.addEventListener('change', load);
  toInput.addEventListener('change', load);
  clearBtn.addEventListener('click', () => {
    productFilter.value = ''; periodFilter.value = ''; fromInput.value = ''; toInput.value = ''; load();
  });

  async function load() {
    clear(listContainer);
    listContainer.appendChild(loading('Carregando vendas...'));
    let sales;
    try {
      sales = await api.sales.list({
        productId: productFilter.value,
        period: periodFilter.value,
        from: fromInput.value,
        to: toInput.value
      });
    } catch (err) {
      clear(listContainer);
      listContainer.appendChild(emptyState({ icon: '⚠️', title: 'Erro ao carregar', description: err.message }));
      return;
    }
    clear(listContainer);
    if (sales.length === 0) {
      if (products.length === 0) {
        listContainer.appendChild(emptyState({
          icon: '🥖',
          title: 'Cadastre produtos primeiro',
          description: 'Para registrar vendas, é preciso ter ao menos um produto cadastrado.'
        }));
      } else {
        listContainer.appendChild(emptyState({
          icon: '💰',
          title: 'Nenhuma venda registrada',
          description: 'Use o botão "+ Registrar venda" para começar.',
          action: el('button', { class: 'btn', onClick: () => openSaleModal(null, products, load) }, '+ Registrar venda')
        }));
      }
      return;
    }
    renderTable(listContainer, sales, products, load);
  }

  await load();
}

function renderTable(container, sales, products, onChange) {
  const productMap = new Map(products.map(p => [p.id, p]));
  container.appendChild(el('p', { class: 'muted', style: 'margin:0 0 8px;font-size:13px;' },
    `Mostrando ${sales.length.toLocaleString('pt-BR')} venda${sales.length === 1 ? '' : 's'}`));
  const tbl = el('table', { class: 'data' });
  tbl.appendChild(el('thead', {}, el('tr', {}, [
    el('th', {}, 'Data'),
    el('th', {}, 'Produto'),
    el('th', { class: 'right' }, 'Quantidade'),
    el('th', {}, 'Período'),
    el('th', {}, 'Observação'),
    el('th', { class: 'right' }, 'Ações')
  ])));
  const tbody = el('tbody');
  for (const s of sales) {
    const p = productMap.get(s.productId);
    tbody.appendChild(el('tr', {}, [
      el('td', {}, formatDate(s.date)),
      el('td', {}, p?.name ?? el('em', { class: 'muted' }, '(produto removido)')),
      el('td', { class: 'right' }, `${Number(s.quantity).toLocaleString('pt-BR')} ${unitLabel(p?.unit)}`),
      el('td', {}, periodLabel(s.period)),
      el('td', { class: 'muted' }, s.notes || '—'),
      el('td', { class: 'actions' }, [
        el('button', { class: 'btn btn-sm btn-outline', onClick: () => openSaleModal(s, products, onChange) }, 'Editar'),
        ' ',
        el('button', { class: 'btn btn-sm btn-danger', onClick: () => removeSale(s, onChange) }, 'Excluir')
      ])
    ]));
  }
  tbl.appendChild(tbody);
  container.appendChild(el('div', { class: 'table-wrapper' }, tbl));
}

function openSaleModal(sale, products, onSaved) {
  const isEdit = !!sale;
  const productSelect = el('select', { required: true });
  productSelect.appendChild(el('option', { value: '' }, '— selecione —'));
  for (const p of products) productSelect.appendChild(el('option', { value: p.id, selected: sale?.productId === p.id ? 'selected' : null }, p.name));
  const quantityInput = el('input', { type: 'number', step: '0.01', min: '0.01', required: true, value: sale?.quantity ?? '' });
  const dateInput = el('input', { type: 'date', required: true, value: sale?.date || todayISO() });
  const periodSelect = el('select', {});
  for (const p of PERIODS) periodSelect.appendChild(el('option', { value: p.value, selected: (sale?.period || 'dia') === p.value ? 'selected' : null }, p.label));
  const notesInput = el('textarea', { rows: '2', placeholder: 'Opcional' }); notesInput.value = sale?.notes || '';
  const errorBox = el('div', { class: 'field-error', style: 'display:none;margin-bottom:8px;' });

  const body = el('div', {}, [
    errorBox,
    el('div', { class: 'form-grid' }, [
      el('div', { class: 'field full' }, [el('label', {}, 'Produto *'), productSelect]),
      el('div', { class: 'field' }, [el('label', {}, 'Quantidade *'), quantityInput]),
      el('div', { class: 'field' }, [el('label', {}, 'Data *'), dateInput]),
      el('div', { class: 'field' }, [el('label', {}, 'Período'), periodSelect]),
      el('div', { class: 'field full' }, [el('label', {}, 'Observação'), notesInput])
    ])
  ]);

  openModal({
    title: isEdit ? 'Editar venda' : 'Registrar venda',
    body,
    footer: (footerEl, close) => {
      footerEl.appendChild(el('button', { class: 'btn btn-outline', onClick: close }, 'Cancelar'));
      const save = el('button', { class: 'btn' }, 'Salvar');
      save.addEventListener('click', async () => {
        errorBox.style.display = 'none';
        const payload = {
          productId: productSelect.value,
          quantity: Number(quantityInput.value),
          date: dateInput.value,
          period: periodSelect.value,
          notes: notesInput.value.trim()
        };
        if (!payload.productId) { errorBox.textContent = 'Selecione um produto.'; errorBox.style.display = 'block'; return; }
        if (!payload.quantity || payload.quantity <= 0) { errorBox.textContent = 'A quantidade deve ser maior que zero.'; errorBox.style.display = 'block'; return; }
        if (!payload.date) { errorBox.textContent = 'Informe a data da venda.'; errorBox.style.display = 'block'; return; }
        save.disabled = true;
        try {
          if (isEdit) await api.sales.update(sale.id, payload);
          else await api.sales.create(payload);
          toast(isEdit ? 'Venda atualizada.' : 'Venda registrada.', 'success');
          close();
          onSaved();
        } catch (err) {
          errorBox.textContent = err.message;
          errorBox.style.display = 'block';
        } finally {
          save.disabled = false;
        }
      });
      footerEl.appendChild(save);
    }
  });
}

async function removeSale(sale, onDone) {
  const ok = await confirmDialog('Excluir esta venda? Essa ação não pode ser desfeita.');
  if (!ok) return;
  try { await api.sales.remove(sale.id); toast('Venda excluída.', 'success'); onDone(); }
  catch (err) { toast(err.message, 'danger'); }
}
