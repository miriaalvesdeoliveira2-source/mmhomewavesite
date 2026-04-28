// src/middleware/auth.js
module.exports = function requireLogin(req, res, next) {
  if (req.session && req.session.user) return next();
  // Permite requisições API retornarem JSON
  if (req.path.startsWith('/api/')) {
    return res.status(401).json({ erro: 'Não autenticado', redirect: '/login' });
  }
  res.redirect('/login');
};
