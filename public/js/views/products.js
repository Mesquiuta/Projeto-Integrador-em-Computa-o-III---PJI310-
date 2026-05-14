import { api } from '../api.js';
import { el, clear, toast, openModal, confirmDialog, formatDate, unitLabel, loading, emptyState } from '../utils.js';

const UNITS = [
  { value: 'unidade', label: 'Unidade' },
  { value: 'kg',      label: 'Quilograma (kg)' },
  { value: 'g',       label: 'Grama (g)' },
  { value: 'litro',   label: 'Litro (L)' },
  { value: 'outro',   label: 'Outro' }
];

export async function renderProducts(root, topbar) {
  topbar.appendChild(el('button', { class: 'btn', onClick: () => openProductModal(null, load) }, '+ Novo produto'));

  let allProducts = [];
  let showInactive = false;

  const filtersBar = el('div', { class: 'filters' });
  const searchInput = el('input', { type: 'text', placeholder: 'Buscar por nome...' });
  filtersBar.appendChild(el('div', { class: 'field' }, [el('label', {}, 'Pesquisar'), searchInput]));
  const toggleInactive = el('label', { style: 'display:flex;gap:6px;align-items:center;cursor:pointer;font-size:13px;' }, [
    el('input', { type: 'checkbox', onChange: (e) => { showInactive = e.target.checked; renderList(); } }),
    'Mostrar inativos'
  ]);
  filtersBar.appendChild(toggleInactive);
  root.appendChild(filtersBar);

  const listContainer = el('div', {});
  root.appendChild(listContainer);

  searchInput.addEventListener('input', renderList);

  async function load() {
    clear(listContainer);
    listContainer.appendChild(loading('Carregando produtos...'));
    try {
      allProducts = await api.products.list();
    } catch (err) {
      clear(listContainer);
      listContainer.appendChild(emptyState({ icon: '⚠️', title: 'Erro ao carregar', description: err.message }));
      return;
    }
    renderList();
  }

  function renderList() {
    clear(listContainer);
    const term = (searchInput.value || '').toLowerCase().trim();
    let list = allProducts;
    if (!showInactive) list = list.filter(p => p.active !== false);
    if (term) list = list.filter(p => p.name.toLowerCase().includes(term) || (p.category || '').toLowerCase().includes(term));

    if (allProducts.length === 0) {
      listContainer.appendChild(emptyState({
        icon: '🥐',
        title: 'Nenhum produto cadastrado',
        description: 'Comece cadastrando os produtos da padaria. Eles serão usados nos registros de vendas, produção e sobras.',
        action: el('button', { class: 'btn', onClick: () => openProductModal(null, load) }, '+ Cadastrar primeiro produto')
      }));
      return;
    }

    if (list.length === 0) {
      listContainer.appendChild(emptyState({ icon: '🔍', title: 'Nenhum produto encontrado', description: 'Tente outro termo ou ajuste os filtros.' }));
      return;
    }

    const tbl = el('table', { class: 'data' });
    tbl.appendChild(el('thead', {}, el('tr', {}, [
      el('th', {}, 'Nome'),
      el('th', {}, 'Categoria'),
      el('th', {}, 'Unidade'),
      el('th', { class: 'right' }, 'Preço'),
      el('th', { class: 'center' }, 'Status'),
      el('th', {}, 'Cadastrado em'),
      el('th', { class: 'right' }, 'Ações')
    ])));
    const tbody = el('tbody');
    for (const p of list) {
      tbody.appendChild(el('tr', {}, [
        el('td', {}, el('strong', {}, p.name)),
        el('td', {}, p.category || '—'),
        el('td', {}, unitLabel(p.unit) || p.unit),
        el('td', { class: 'right' }, p.price > 0 ? `R$ ${Number(p.price).toFixed(2).replace('.', ',')}` : '—'),
        el('td', { class: 'center' }, el('span', { class: `tag ${p.active === false ? 'danger' : 'success'}` }, p.active === false ? 'Inativo' : 'Ativo')),
        el('td', { class: 'muted' }, formatDate((p.createdAt || '').slice(0, 10))),
        el('td', { class: 'actions' }, [
          el('button', { class: 'btn btn-sm btn-outline', onClick: () => openProductModal(p, load) }, 'Editar'),
          ' ',
          el('button', { class: 'btn btn-sm btn-danger', onClick: () => removeProduct(p, load) }, p.active === false ? 'Excluir' : 'Excluir / Inativar')
        ])
      ]));
    }
    tbl.appendChild(tbody);
    listContainer.appendChild(el('div', { class: 'table-wrapper' }, tbl));
  }

  await load();
}

function openProductModal(product, onSaved) {
  const isEdit = !!product;
  const nameInput = el('input', { type: 'text', required: true, value: product?.name || '', placeholder: 'Ex.: Pão Francês' });
  const categoryInput = el('input', { type: 'text', value: product?.category || '', placeholder: 'Ex.: Pães' });
  const unitSelect = el('select', {});
  for (const u of UNITS) unitSelect.appendChild(el('option', { value: u.value, selected: (product?.unit || 'unidade') === u.value ? 'selected' : null }, u.label));
  const priceInput = el('input', { type: 'number', step: '0.01', min: '0', value: product?.price ?? '', placeholder: '0,00' });
  const activeInput = el('input', { type: 'checkbox' });
  activeInput.checked = product ? product.active !== false : true;

  const errorBox = el('div', { class: 'field-error', style: 'display:none;margin-bottom:8px;' });

  const body = el('div', {}, [
    errorBox,
    el('div', { class: 'form-grid' }, [
      el('div', { class: 'field full' }, [el('label', {}, 'Nome *'), nameInput]),
      el('div', { class: 'field' }, [el('label', {}, 'Categoria'), categoryInput]),
      el('div', { class: 'field' }, [el('label', {}, 'Unidade'), unitSelect]),
      el('div', { class: 'field' }, [el('label', {}, 'Preço de venda (opcional)'), priceInput]),
      el('div', { class: 'field' }, [el('label', {}, 'Status'),
        el('label', { style: 'display:flex;gap:6px;align-items:center;padding-top:8px;font-weight:500;' }, [activeInput, 'Produto ativo'])
      ])
    ])
  ]);

  openModal({
    title: isEdit ? `Editar: ${product.name}` : 'Novo produto',
    body,
    footer: (footerEl, close) => {
      footerEl.appendChild(el('button', { class: 'btn btn-outline', onClick: close }, 'Cancelar'));
      const saveBtn = el('button', { class: 'btn' }, 'Salvar');
      saveBtn.addEventListener('click', async () => {
        errorBox.style.display = 'none';
        const payload = {
          name: nameInput.value.trim(),
          category: categoryInput.value.trim(),
          unit: unitSelect.value,
          price: priceInput.value === '' ? 0 : Number(priceInput.value),
          active: activeInput.checked
        };
        if (!payload.name) {
          errorBox.textContent = 'O nome do produto é obrigatório.';
          errorBox.style.display = 'block';
          return;
        }
        saveBtn.disabled = true;
        try {
          if (isEdit) await api.products.update(product.id, payload);
          else await api.products.create(payload);
          toast(isEdit ? 'Produto atualizado.' : 'Produto criado.', 'success');
          close();
          onSaved();
        } catch (err) {
          errorBox.textContent = err.message;
          errorBox.style.display = 'block';
        } finally {
          saveBtn.disabled = false;
        }
      });
      footerEl.appendChild(saveBtn);
    }
  });
}

async function removeProduct(product, onDone) {
  const ok = await confirmDialog(`Excluir o produto "<strong>${product.name}</strong>"?<br><small class="muted">Se houver vendas, produção ou sobras vinculadas, o produto será apenas inativado.</small>`);
  if (!ok) return;
  try {
    const result = await api.products.remove(product.id);
    toast(result.inactivated ? 'Produto inativado (havia registros vinculados).' : 'Produto excluído.', 'success');
    onDone();
  } catch (err) {
    toast(err.message, 'danger');
  }
}
