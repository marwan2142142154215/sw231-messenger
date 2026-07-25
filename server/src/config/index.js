require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  
  supabase: {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY,
    serviceKey: process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SECRET_KEY
  },
  
  jwt: {
    secret: process.env.JWT_SECRET || 'nyxora-jwt-secret-change-me-in-production-2026',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'nyxora-refresh-secret-change-me-2026',
    expiry: process.env.JWT_EXPIRY || '15m',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d'
  },
  
  masterKey: process.env.MASTER_KEY || 'nyxora-master-key-change-in-production-2026',
  adminPath: process.env.ADMIN_PATH || '/sawq4e2'
};
