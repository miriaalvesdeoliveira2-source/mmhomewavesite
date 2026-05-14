// src/routes/cost.js
const express     = require('express');
const router      = express.Router();
const costService = require('../services/costService');

// POST /api/product/cost
router.post('/product/cost', async (req, res) => {
  const { item_id, sku, nome, cost, preco, lucro, margem, usuario } = req.body;

  // ── Validação básica ────────────────────────────────────────────────────────
  if (!item_id || cost === undefined || cost === null) {
    return res.status(400).json({ erro: 'Campos obrigatórios: item_id e cost' });
  }

  const custoNum = parseFloat(cost);
  if (isNaN(custoNum) || custoNum < 0) {
    return res.status(400).json({ erro: 'Valor de custo inválido' });
  }

  // ── Salva local + tenta sync com Sheets ────────────────────────────────────
  await costService.saveCost(item_id, custoNum, {
    sku,
    nome,
    preco:   preco   !== undefined ? parseFloat(preco)   : null,
    lucro:   lucro   !== undefined ? parseFloat(lucro)   : null,
    margem:  margem  !== undefined ? String(margem)      : null,
    usuario: usuario || (req.session?.user?.usuario) || 'sistema',
  });

  // ── Resposta sempre 200 (Sheets pode ter falhado, mas custo está salvo) ────
  return res.json({ sucesso: true, item_id, custo: custoNum });
});

module.exports = router;
