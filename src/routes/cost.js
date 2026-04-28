const express = require('express');
const router = express.Router();
const costService = require('../services/costService');

const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

router.post('/product/cost', async (req, res) => {
  const { item_id, cost } = req.body;

  if (!item_id || cost === undefined) {
    return res.status(400).json({ erro: 'Dados inválidos' });
  }

  // salva local primeiro
  costService.saveCost(item_id, parseFloat(cost));

  // tenta enviar para a planilha, mas não quebra o sistema se falhar
  try {
    if (!process.env.GOOGLE_SHEETS_WEBHOOK_URL) {
  console.error('GOOGLE_SHEETS_WEBHOOK_URL não configurada no Render');
} else {
      await fetch(process.env.GOOGLE_SHEETS_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          produto: item_id,
          sku: item_id,
          custo: cost,
          usuario: 'admin'
        })
      });
    }
  } catch (error) {
    console.error('Erro ao enviar para planilha, mas custo foi salvo localmente:', error);
  }

  res.json({ sucesso: true });
});

module.exports = router;
