// src/services/costService.js
const fs   = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../data/productCosts.json');

// ── Armazenamento local ──────────────────────────────────────────────────────

function getAllCosts() {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return {};
  }
}

function getCost(item_id) {
  return getAllCosts()[item_id] || null;
}

function saveLocalCost(item_id, cost) {
  const data = getAllCosts();
  data[item_id] = cost;
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// ── Google Sheets webhook ────────────────────────────────────────────────────

async function syncToSheets(payload) {
  const webhookUrl = process.env.PRODUCT_COSTS_SHEETS_WEBHOOK_URL;

  if (!webhookUrl) {
    console.warn('[CostService] PRODUCT_COSTS_SHEETS_WEBHOOK_URL não configurada. Pulando sync.');
    return;
  }

  // node-fetch v3 é ESM; importação dinâmica garante compatibilidade
  const { default: fetch } = await import('node-fetch');

  const body = {
    item_id:      payload.item_id,
    sku:          payload.sku      || payload.item_id,
    nome:         payload.nome     || '',
    custo:        payload.cost,
    preco:        payload.preco    ?? null,
    lucro:        payload.lucro    ?? null,
    margem:       payload.margem   ?? null,
    usuario:      payload.usuario  || 'sistema',
    acao:         'salvar_custo',
    atualizado_em: new Date().toISOString(),
  };

  const response = await fetch(webhookUrl, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
    // timeout de 8 s para não travar o servidor
    signal:  AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    throw new Error(`Sheets respondeu HTTP ${response.status}`);
  }

  const json = await response.json().catch(() => ({}));
  console.log('[CostService] Sync Sheets OK:', json);
}

// ── Função principal: salva local + tenta sync ───────────────────────────────

async function saveCost(item_id, cost, extras = {}) {
  // 1. Sempre salva localmente primeiro
  saveLocalCost(item_id, cost);

  // 2. Tenta enviar para Sheets, mas nunca quebra o sistema
  try {
    await syncToSheets({ item_id, cost, ...extras });
  } catch (err) {
    console.error('[CostService] Falha ao sincronizar com Sheets (custo salvo localmente):', err.message);
  }
}

module.exports = { getCost, saveCost, getAllCosts };
