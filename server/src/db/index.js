const { createClient } = require('@supabase/supabase-js');
const config = require('../config');

let supabase = null;

function getSupabase() {
  if (!supabase) {
    supabase = createClient(config.supabase.url, config.supabase.serviceKey || config.supabase.anonKey, {
      auth: { persistSession: false },
      realtime: { params: { eventsPerSecondLimit: 0 } }
    });
  }
  return supabase;
}

async function initDB() {
  const sb = getSupabase();
  const { error } = await sb.from('users').select('id').limit(1);
  if (error && error.code !== 'PGRST116' && error.code !== '42P01') {
    throw new Error('[DB] Supabase connection failed: ' + error.message);
  }
  console.log('[DB] Connected to Supabase');
}

module.exports = { getSupabase, initDB };
