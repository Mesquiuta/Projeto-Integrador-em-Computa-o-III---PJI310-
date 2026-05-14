import { api } from '../api.js';
import { el, clear, toast, openModal, confirmDialog, formatDate, reasonLabel, unitLabel, todayISO, loading, emptyState } from '../utils.js';

const REASONS = [
  { value: 'sobra_dia',       label: 'Sobra do dia' },
  { value: 'vencimento',      label: 'Vencimento' },
  { value: 'quebra',          label: 'Quebra' },
  { value: 'baixa_qualidade', label: 'Baixa qualidade' },
  { value: 'outro',           label: 'Outro' }
];

export async function renderWaste(root, topbar) {
  let products = [];
  try { products = await api.products.list({ active: 'true' }); }
  catch (err) {
    root.appendChild(emptyState({ icon: '⚠️', title: 'Erro ao carregar produtos', description: err.message }));
    return;
  }

  topbar.appendChild(el('button', {
    class: 'btn',
    onClick: () => products.length === 0
      ? toast('Cadastre ao menos um produto antes de registrar uma sobra.', 'warning')
      : openWasteModal(null, products, load)
  }, '+ Registrar sobra'));

  const filtersBar = el('div', { class: 'filters' });
  const productFilter = el('select', {});
  productFilter.appendChild(el('option', { value: '' }, 'Todos os produtos'));
  for (const p of products) productFilter.appendChild(el('option', { value: p.id }, p.name));
  const reasonFilter = el('select', {});
  reasonFilter.appendChild(el('option', { value: '' }, 'Todos os motivos'));
  for (const r of REASONS) reasonFilter.appendChild(el('option', { value: r.value }, r.label));
  const fromInput = el('input', { type: 'date' });
  const toInput = el('input', { type: 'date' });
  const clearBtn = el('button', { class: 'btn btn-outline btn-sm' }, 'Limpar filtros');
  filtersBar.appendChild(el('div', { class: 'field' }, [el('label', {}, 'Produto'), productFilter]));
  filtersBar.appendChild(el('div', { class: 'field' }, [el('label', {}, 'Motivo'), reasonFilter]));
  filtersBar.appendChild(el('div', { class: 'field' }, [el('label', {}, 'De'), fromInput]));
  filtersBar.appendChild(el('div', { class: 'field' }, [el('label', {}, 'Até'), toInput]));
  filtersBar.appendChild(clearBtn);
  root.appendChild(filtersBar);

  const listContainer = el('div', {});
  root.appendChild(listContainer);

  productFilter.addEventListener('change', load);
  reasonFilter.addEventListener('change', load);
  fromInput.addEventListener('change', load);
  toInput.addEventListener('change', load);
  clearBtn.addEventListener('click', () => {
    productFilter.value = ''; reasonFilter.value = ''; fromInput.value = ''; toInput.value = ''; load();
  });

  async function load() {
    clear(listContainer);
    listContainer.appendChild(loading('Carregando perdas...'));
    let items;
    try {
      items = await api.waste.list({
        productId: productFilter.value,
        reason: reasonFilter.value,
        from: fromInput.value,
        to: toInput.value
      });
    } catch (err) {
      clear(listContainer);
      listContainer.appendChild(emptyState({ icon: '⚠️', title: 'Erro ao carregar', description: err.message }));
      return;
    }
    clear(listContainer);
    if (items.length === 0) {
      if (products.length === 0) {
        listContainer.appendChild(emptyState({
          icon: '🥖',
          title: 'Cadastre produtos primeiro',
          description: 'Para registrar sobras, é preciso ter ao menos um produto cadastrado.'
        }));
      } else {
        listContainer.appendChild(emptyState({
          icon: '🗑️',
          title: 'Nenhuma sobra registrada',
          description: 'Registrar as sobras diárias ajuda o sistema a calibrar a sugestão de produção e reduzir o desperdício.',
          action: el('button', { class: 'btn', onClick: () => openWasteModal(null, products, load) }, '+ Registrar sobra')
        }));
      }
      return;
    }
    renderTable(listContainer, items, products, load);
  }

  await load();
}

function renderTable(container, items, products, onChange) {
  const productMap = new Map(products.map(p => [p.id, p]));
  container.appendChild(el('p', { class: 'muted', style: 'margin:0 0 8px;font-size:13px;' },
    `Mostrando ${items.length.toLocaleString('pt-BR')} registro${items.length === 1 ? '' : 's'} de sobra`));
  const tbl = el('table', { class: 'data' });
  tbl.appendChild(el('thead', {}, el('tr', {}, [
    el('th', {}, 'Data'),
    el('th', {}, 'Produto'),
    el('th', { class: 'right' }, 'Quantidade'),
    el('th', {}, 'Motivo'),
    el('th', {}, 'Observação'),
    el('th', { class: 'right' }, 'Ações')
  ])));
  const tbody = el('tbody');
  for (const it of items) {
    const p = productMap.get(it.productId);
    tbody.appendChild(el('tr', {}, [
      el('td', {}, formatDate(it.date)),
      el('td', {}, p?.name ?? el('em', { class: 'muted' }, '(produto removido)')),
      el('td', { class: 'right' }, `${Number(it.quantity).toLocaleString('pt-BR')} ${unitLabel(p?.unit)}`),
      el('td', {}, el('span', { class: 'tag warning' }, reasonLabel(it.reason))),
      el('td', { class: 'muted' }, it.notes || '—'),
      el('td', { class: 'actions' }, [
        el('button', { class: 'btn btn-sm btn-outline', onClick: () => openWasteModal(it, products, onChange) }, 'Editar'),
        ' ',
        el('button', { class: 'btn btn-sm btn-danger', onClick: () => remove(it, onChange) }, 'Excluir')
      ])
    ]));
  }
  tbl.appendChild(tbody);
  container.appendChild(el('div', { class: 'table-wrapper' }, tbl));
}

function openWasteModal(item, products, onSaved) {
  const isEdit = !!item;
  const productSelect = el('select', { required: true });
  productSelect.appendChild(el('option', { value: '' }, '— selecione —'));
  for (const p of products) productSelect.appendChild(el('option', { value: p.id, selected: item?.productId === p.id ? 'selected' : null }, p.name));
  const quantityInput = el('input', { type: 'number', step: '0.01', min: '0', required: true, value: item?.quantity ?? '' });
  const dateInput = el('input', { type: 'date', required: true, value: item?.date || todayISO() });
  const reasonSelect = el('select', {});
  for (const r of REASONS) reasonSelect.appendChild(el('option', { value: r.value, selected: (item?.reason || 'sobra_dia') === r.value ? 'selected' : null }, r.label));
  const notesInput = el('textarea', { rows: '2', placeholder: 'Opcional' }); notesInput.value = item?.notes || '';
  const errorBox = el('div', { class: 'field-error', style: 'display:none;margin-bottom:8px;' });

  const body = el('div', {}, [
    errorBox,
    el('div', { class: 'form-grid' }, [
      el('div', { class: 'field full' }, [el('label', {}, 'Produto *'), productSelect]),
      el('div', { class: 'field' }, [el('label', {}, 'Quantidade *'), quantityInput]),
      el('div', { class: 'field' }, [el('label', {}, 'Data *'), dateInput]),
      el('div', { class: 'field' }, [el('label', {}, 'Motivo'), reasonSelect]),
      el('div', { class: 'field full' }, [el('label', {}, 'Observação'), notesInput])
    ])
  ]);

  openModal({
    title: isEdit ? 'Editar sobra/perda' : 'Registrar sobra/perda',
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
          reason: reasonSelect.value,
          notes: notesInput.value.trim()
        };
        if (!payload.productId) { errorBox.textContent = 'Selecione um produto.'; errorBox.style.display = 'block'; return; }
        if (isNaN(payload.quantity) || payload.quantity < 0) { errorBox.textContent = 'A quantidade deve ser maior ou igual a zero.'; errorBox.style.display = 'block'; return; }
        if (!payload.date) { errorBox.textContent = 'Informe a data.'; errorBox.style.display = 'block'; return; }
        save.disabled = true;
        try {
          if (isEdit) await api.waste.update(item.id, payload);
          else await api.waste.create(payload);
          toast(isEdit ? 'Registro atualizado.' : 'Sobra registrada.', 'success');
          close();
          onSaved();
        } catch (err) {
          errorBox.textContent = err.message;
          errorBox.style.display = 'block';
        } finally { save.disabled = false; }
      });
      footerEl.appendChild(save);
    }
  });
}

async function remove(item, onDone) {
  const ok = await confirmDialog('Excluir este registro de sobra?');
  if (!ok) return;
  try { await api.waste.remove(item.id); toast('Registro excluído.', 'success'); onDone(); }
  catch (err) { toast(err.message, 'danger'); }
}
