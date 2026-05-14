// Utilitários compartilhados entre views.

export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.substring(2).toLowerCase(), v);
    else if (k === 'html') node.innerHTML = v;
    else if (v !== undefined && v !== null) node.setAttribute(k, v);
  }
  for (const child of [].concat(children)) {
    if (child === null || child === undefined || child === false) continue;
    if (typeof child === 'string' || typeof child === 'number') node.appendChild(document.createTextNode(String(child)));
    else node.appendChild(child);
  }
  return node;
}

export function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }

export function todayISO() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

export function tomorrowISO() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

export function daysAgoISO(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

export function formatNumber(n, decimals = 0) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return Number(n).toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function formatDate(iso) {
  if (!iso) return '—';
  // Aceita YYYY-MM-DD
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

export function formatDateTime(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleString('pt-BR');
  } catch { return iso; }
}

export function periodLabel(p) {
  return ({ manha: 'Manhã', tarde: 'Tarde', noite: 'Noite', dia: 'Dia inteiro' })[p] || p || '—';
}

export function reasonLabel(r) {
  return ({
    sobra_dia: 'Sobra do dia',
    vencimento: 'Vencimento',
    quebra: 'Quebra',
    baixa_qualidade: 'Baixa qualidade',
    outro: 'Outro'
  })[r] || r || '—';
}

export function unitLabel(u) {
  return ({ unidade: 'un', kg: 'kg', g: 'g', litro: 'L', outro: '' })[u] || u || '';
}

export function toast(message, type = 'info', timeout = 3500) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const t = el('div', { class: `toast ${type}` }, message);
  container.appendChild(t);
  setTimeout(() => {
    t.style.opacity = '0';
    setTimeout(() => t.remove(), 200);
  }, timeout);
}

export function confirmDialog(message) {
  return new Promise(resolve => {
    openModal({
      title: 'Confirmar',
      bodyHtml: `<p>${message}</p>`,
      footer: (footer, close) => {
        footer.appendChild(el('button', { class: 'btn btn-outline', onClick: () => { close(); resolve(false); } }, 'Cancelar'));
        footer.appendChild(el('button', { class: 'btn btn-danger', onClick: () => { close(); resolve(true); } }, 'Confirmar'));
      }
    });
  });
}

export function openModal({ title, body, bodyHtml, footer }) {
  const backdrop = document.getElementById('modal-backdrop');
  document.getElementById('modal-title').textContent = title;
  const bodyEl = document.getElementById('modal-body');
  const footerEl = document.getElementById('modal-footer');
  clear(bodyEl); clear(footerEl);
  if (body) bodyEl.appendChild(body);
  else if (bodyHtml) bodyEl.innerHTML = bodyHtml;
  const close = () => { backdrop.hidden = true; };
  if (footer) footer(footerEl, close);
  document.getElementById('modal-close').onclick = close;
  backdrop.onclick = (e) => { if (e.target === backdrop) close(); };
  backdrop.hidden = false;
  return { close };
}

export function emptyState({ icon = '📭', title, description, action }) {
  const node = el('div', { class: 'empty-state' });
  node.appendChild(el('span', { class: 'icon' }, icon));
  if (title) node.appendChild(el('h3', {}, title));
  if (description) node.appendChild(el('p', {}, description));
  if (action) node.appendChild(action);
  return node;
}

export function loading(text = 'Carregando...') {
  return el('div', { class: 'loading' }, text);
}
