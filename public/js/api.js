// Cliente da API REST. Expõe funções tipadas por recurso.

async function request(method, url, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body !== undefined) opts.body = JSON.stringify(body);
  let res;
  try {
    res = await fetch(url, opts);
  } catch (err) {
    throw new Error('Falha de conexão com o servidor. Verifique se o backend está rodando.');
  }
  let data = null;
  const text = await res.text();
  if (text) {
    try { data = JSON.parse(text); } catch { data = text; }
  }
  if (!res.ok) {
    const msg = data && typeof data === 'object' && data.error ? data.error : `Erro ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return data;
}

function qs(params = {}) {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') usp.set(k, v);
  }
  const s = usp.toString();
  return s ? `?${s}` : '';
}

export const api = {
  products: {
    list:   (params)   => request('GET',    `/api/products${qs(params)}`),
    get:    (id)       => request('GET',    `/api/products/${id}`),
    create: (data)     => request('POST',   `/api/products`, data),
    update: (id, data) => request('PUT',    `/api/products/${id}`, data),
    remove: (id)       => request('DELETE', `/api/products/${id}`)
  },
  sales: {
    list:   (params)   => request('GET',    `/api/sales${qs(params)}`),
    create: (data)     => request('POST',   `/api/sales`, data),
    update: (id, data) => request('PUT',    `/api/sales/${id}`, data),
    remove: (id)       => request('DELETE', `/api/sales/${id}`)
  },
  production: {
    list:   (params)   => request('GET',    `/api/production${qs(params)}`),
    create: (data)     => request('POST',   `/api/production`, data),
    update: (id, data) => request('PUT',    `/api/production/${id}`, data),
    remove: (id)       => request('DELETE', `/api/production/${id}`)
  },
  waste: {
    list:   (params)   => request('GET',    `/api/waste${qs(params)}`),
    create: (data)     => request('POST',   `/api/waste`, data),
    update: (id, data) => request('PUT',    `/api/waste/${id}`, data),
    remove: (id)       => request('DELETE', `/api/waste/${id}`)
  },
  dashboard: {
    get: (params) => request('GET', `/api/dashboard${qs(params)}`)
  },
  recommendations: {
    get: (params) => request('GET', `/api/recommendations${qs(params)}`)
  },
  demo: {
    seed: ()  => request('POST', `/api/demo/seed`, {}),
    reset: () => request('POST', `/api/demo/reset`, {})
  }
};
