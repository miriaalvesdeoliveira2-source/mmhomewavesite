const fetch = require('node-fetch');
const express = require('express');
const router = express.Router();
const costService = require('../services/costService');

router.post('/product/cost', async (req, res) => {
  const { item_id, cost } = req.body;

  if (!item_id || cost === undefined) {
    return res.status(400).json({ erro: 'Dados inválidos' });
  }

  try {
    // continua salvando local
    costService.saveCost(item_id, parseFloat(cost));

    // envia para o Google Sheets
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

    res.json({ sucesso: true });

  } catch (error) {
    console.error('Erro ao enviar para planilha:', error);
    res.status(500).json({ erro: 'Erro ao salvar custo' });
  }
});
