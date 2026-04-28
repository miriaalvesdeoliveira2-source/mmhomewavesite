// src/routes/auth.js
const express = require('express');
const bcrypt  = require('bcryptjs');
const router  = express.Router();

// Usuários hardcoded (em produção use banco de dados)
const USERS = [
  { id: 1, nome: 'Admin',  usuario: process.env.ADMIN_USER || 'admin',  senha: process.env.ADMIN_PASS || 'mm2026' },
  { id: 2, nome: 'Mari',   usuario: 'mari',   senha: 'mari2026' },
  { id: 3, nome: 'Miriã',  usuario: 'miria',  senha: 'miria2026' },
];

router.post('/login', (req, res) => {
  const { usuario, senha } = req.body;
  const user = USERS.find(u => u.usuario === usuario && u.senha === senha);
  if (!user) {
    return res.status(401).json({ erro: 'Usuário ou senha incorretos' });
  }
  req.session.user = { id: user.id, nome: user.nome, usuario: user.usuario };
  res.json({ sucesso: true, nome: user.nome });
});

router.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ sucesso: true });
});

router.get('/me', (req, res) => {
  if (!req.session.user) return res.status(401).json({ autenticado: false });
  res.json({ autenticado: true, usuario: req.session.user });
});

module.exports = router;
