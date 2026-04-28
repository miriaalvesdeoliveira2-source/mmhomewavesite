// src/services/tokenStore.js
let tokenData = {
  access_token: null,
  refresh_token: null,
  user_id: null,
  expires_at: null,
};

module.exports = {
  save({ access_token, refresh_token, user_id, expires_in }) {
    tokenData = {
      access_token,
      refresh_token,
      user_id,
      expires_at: Date.now() + (expires_in - 60) * 1000,
    };
    console.log('[Token] Salvo. Expira em', expires_in, 's');
  },
  get: () => tokenData,
  isValid: () => !!tokenData.access_token && Date.now() < tokenData.expires_at,
  isExpired: () => !!tokenData.access_token && Date.now() >= tokenData.expires_at,
  clear: () => { tokenData = { access_token: null, refresh_token: null, user_id: null, expires_at: null }; },
};
