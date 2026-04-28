require('dotenv').config();
const express      = require('express');
const session      = require('express-session');
const cookieParser = require('cookie-parser');
const path         = require('path');
const requireLogin = require('./src/middleware/auth');
const authRoutes   = require('./src/routes/auth');
const mlRoutes     = require('./src/routes/ml');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
  secret:            process.env.SESSION_SECRET || 'mm_secret_2026',
  resave:            false,
  saveUninitialized: false,
  cookie:            { maxAge: 8 * 60 * 60 * 1000 },
}));

// ── ROTAS PÚBLICAS (sem login) ────────────────────────────────────────────────
app.use('/auth', authRoutes);
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public/login.html')));

// Callback do ML sem autenticação
app.get('/api/ml/callback', async (req, res) => {
  const { code, error } = req.query;
  if (error || !code) return res.redirect('/?ml=erro');
  try {
    const ml = require('./src/services/mlService');
    await ml.exchangeCode(code);
    res.redirect('/?ml=conectado');
  } catch(e) {
    console.error('[Callback] Erro:', e.response?.data || e.message);
    res.redirect('/?ml=erro');
  }
});

// Conectar ML sem autenticação
app.get('/api/ml/connect', (req, res) => {
  const ml = require('./src/services/mlService');
  res.redirect(ml.getAuthUrl());
});

// ── ROTAS PROTEGIDAS ─────────────────────────────────────────────────────────
app.use(requireLogin);
app.use(express.static(path.join(__dirname, 'public')));
app.use('/api/ml', mlRoutes);

app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ erro: 'Rota não encontrada' });
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🚀 MM Sucesso e Vendas rodando em http://localhost:${PORT}`);
  console.log(`\n🔑 Login padrão:`);
  console.log(`   Usuário: ${process.env.ADMIN_USER || 'admin'}`);
  console.log(`   Senha:   ${process.env.ADMIN_PASS || 'mm2026'}`);
  console.log(`\n⚠️  Mantenha o ngrok rodando!\n`);
});
