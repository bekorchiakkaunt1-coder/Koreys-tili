// Public config only — no secrets on Pages (D-04). API_URL = prod deployment (gas/Config.js DEFAULT_WEBAPP_URL).
var CONFIG = {
  API_URL: 'https://script.google.com/macros/s/AKfycbzX20CH14w-SFPFlQteIsoIbsead6Jv6_EkFdSiBe2uwa5Y_Uxl0q8J45O3hF-DcFE0Fg/exec',
  FLUSH_EVERY: 10,       // reviews per background flush
  NEW_BATCH: 5,          // §6.2: ≤ 5 new cards in learning at once
  LEARN_AHEAD_MS: 20 * 60000,
};
