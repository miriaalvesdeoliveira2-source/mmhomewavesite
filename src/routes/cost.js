const express = require('express');
const router = express.Router();
const costService = require('../services/costService');

router.post('/product/cost', (req, res) => {
  const { item_id, cost } = req.body;

  if (!item_id || cost === undefined) {
    return res.status(400).json({ erro: 'Dados inválidos' });
  }

  costService.saveCost(item_id, parseFloat(cost));

  res.json({ sucesso: true });
});

module.exports = router;
