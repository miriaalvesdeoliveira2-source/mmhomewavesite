const axios = require('axios');
const crypto = require('crypto');
const store  = require('./tokenStore');

const BASE      = 'https://api.mercadolibre.com';
const AUTH_URL  = 'https://auth.mercadolivre.com.br/authorization';
const TOKEN_URL = `${BASE}/oauth/token`;

// Armazena o code_verifier temporariamente
let _codeVerifier = null;

function base64URLEncode(buf) {
  return buf.toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'');
}

function generatePKCE() {
  const verifier  = base64URLEncode(crypto.randomBytes(32));
  const challenge = base64URLEncode(crypto.createHash('sha256').update(verifier).digest());
  return { verifier, challenge };
}

function getAuthUrl() {
  const { verifier, challenge } = generatePKCE();
  _codeVerifier = verifier;

  const params = new URLSearchParams({
    response_type:          'code',
    client_id:              process.env.CLIENT_ID,
    redirect_uri:           process.env.REDIRECT_URI,
    code_challenge:         challenge,
    code_challenge_method:  'S256',
  });
  return `${AUTH_URL}?${params.toString()}`;
}

async function exchangeCode(code) {
  const res = await axios.post(TOKEN_URL, null, {
    params: {
      grant_type:    'authorization_code',
      client_id:     process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET,
      code,
      redirect_uri:  process.env.REDIRECT_URI,
      code_verifier: _codeVerifier,
    },
  });
  store.save(res.data);
  _codeVerifier = null;
  return res.data;
}

async function refreshToken() {
  const { refresh_token } = store.get();
  if (!refresh_token) throw new Error('Sem refresh_token. Faça login novamente.');
  const res = await axios.post(TOKEN_URL, null, {
    params: {
      grant_type:    'refresh_token',
      client_id:     process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET,
      refresh_token,
    },
  });
  store.save(res.data);
  return res.data.access_token;
}

async function validToken() {
  if (store.isExpired()) return await refreshToken();
  const { access_token } = store.get();
  if (!access_token) throw new Error('NÃO_AUTENTICADO');
  return access_token;
}

async function authHeaders() {
  const token = await validToken();
  return { Authorization: `Bearer ${token}` };
}

async function getProducts() {
  const headers = await authHeaders();
  const seller_id = process.env.SELLER_ID;
  let allIds = [], offset = 0;
  while (true) {
    const r = await axios.get(`${BASE}/users/${seller_id}/items/search`, { headers, params: { limit: 50, offset } });
    const ids = r.data.results || [];
    allIds = allIds.concat(ids);
    if (offset + 50 >= r.data.paging.total || ids.length === 0) break;
    offset += 50;
  }
  if (!allIds.length) return [];
  let products = [];
  for (let i = 0; i < allIds.length; i += 20) {
    const batch = allIds.slice(i, i + 20).join(',');
    const r = await axios.get(`${BASE}/items`, { headers, params: { ids: batch } });
    products = products.concat(r.data.filter(x => x.code === 200).map(x => formatProduct(x.body)));
  }
  return products;
}

function formatProduct(item) {
  return {
    id:            item.id,
    sku:           item.seller_sku || item.id,
    nome:          item.title,
    preco:         item.price || 0,
    estoque:       item.available_quantity || 0,
    vendidos:      item.sold_quantity || 0,
    status:        item.status,
    tipo_anuncio:  item.listing_type_id === 'gold_special' ? 'Premium' : 'Clássico',
    permalink:     item.permalink,
    thumbnail:     item.thumbnail,
    alerta_estoque: (item.available_quantity || 0) < 10,
  };
}

async function getOrders(days = 30) {
  const headers = await authHeaders();
  const from = new Date();
  from.setDate(from.getDate() - days);
  const r = await axios.get(`${BASE}/orders/search/recent`, {
    headers,
    params: { seller: process.env.SELLER_ID, 'order.date_created.from': from.toISOString(), sort: 'date_desc', limit: 50 },
  });
  return (r.data.results || []).map(o => ({
    id: o.id, data: o.date_created, status: o.status, total: o.total_amount,
    comprador: o.buyer?.nickname || 'N/A',
    produtos: (o.order_items || []).map(i => ({ nome: i.item?.title || 'N/A', quantidade: i.quantity, preco: i.unit_price })),
  }));
}

async function getBalance() {
  const headers = await authHeaders();
  const uid = store.get().user_id || process.env.SELLER_ID;
  const r = await axios.get(`${BASE}/users/${uid}/mercadopago/balance`, { headers });
  return r.data;
}

async function getQuestions() {
  const headers = await authHeaders();
  const r = await axios.get(`${BASE}/questions/search`, { headers, params: { seller_id: process.env.SELLER_ID, status: 'UNANSWERED', limit: 20 } });
  return (r.data.questions || []).map(q => ({ id: q.id, texto: q.text, data: q.date_created, item_id: q.item_id, comprador: q.from?.nickname || 'N/A' }));
}

module.exports = { getAuthUrl, exchangeCode, getProducts, getOrders, getBalance, getQuestions, store };
