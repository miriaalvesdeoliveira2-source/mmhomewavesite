// src/routes/ml.js
const express = require('express');
const ml      = require('../services/mlService');
const store   = require('../services/tokenStore');
const router  = express.Router();

// Status da conexão ML
router.get('/status', (req, res) => {
  const t = store.get();
  res.json({
    conectado:    !!t.access_token,
    user_id:      t.user_id,
    expira_em:    t.expires_at ? new Date(t.expires_at).toLocaleString('pt-BR') : null,
    token_valido: store.isValid(),
  });
});

// Iniciar auth ML
router.get('/connect', (req, res) => {
  res.redirect(ml.getAuthUrl());
});

// Callback OAuth
router.get('/callback', async (req, res) => {
  try {
    await ml.exchangeCode(req.query.code);
    res.redirect('/?ml=conectado');
  } catch (e) {
    res.redirect('/?ml=erro');
  }
});

// Desconectar ML
router.post('/disconnect', (req, res) => {
  store.clear();
  res.json({ sucesso: true });
});

// Produtos
router.get('/products', async (req, res) => {
  try {
    const produtos = await ml.getProducts();
    const resumo = {
      total:           produtos.length,
      ativos:          produtos.filter(p => p.status === 'active').length,
      pausados:        produtos.filter(p => p.status === 'paused').length,
      estoque_critico: produtos.filter(p => p.alerta_estoque).length,
      total_estoque:   produtos.reduce((s, p) => s + p.estoque, 0),
      total_vendidos:  produtos.reduce((s, p) => s + p.vendidos, 0),
    };
    res.json({ sucesso: true, resumo, produtos });
  } catch (e) {
    res.status(e.message === 'NÃO_AUTENTICADO' ? 401 : 500)
      .json({ erro: e.message });
  }
});

// Pedidos
router.get('/orders', async (req, res) => {
  try {
    const days   = parseInt(req.query.days) || 30;
    const orders = await ml.getOrders(days);
    const resumo = {
      total:        orders.length,
      faturamento:  orders.reduce((s, o) => s + o.total, 0).toFixed(2),
      pagos:        orders.filter(o => o.status === 'paid').length,
      cancelados:   orders.filter(o => o.status === 'cancelled').length,
      em_andamento: orders.filter(o => !['paid','cancelled'].includes(o.status)).length,
    };
    res.json({ sucesso: true, periodo_dias: days, resumo, pedidos: orders });
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// Saldo
router.get('/balance', async (req, res) => {
  try {
    const saldo = await ml.getBalance();
    res.json({ sucesso: true, saldo });
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// Perguntas pendentes
router.get('/questions', async (req, res) => {
  try {
    const perguntas = await ml.getQuestions();
    res.json({ sucesso: true, total: perguntas.length, perguntas });
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

module.exports = router;
