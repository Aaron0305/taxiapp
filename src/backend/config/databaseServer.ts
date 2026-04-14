import 'server-only';

import { createClient } from '@supabase/supabase-js';
import { ENV } from '@/backend/config/env';

if (!ENV.SUPABASE_URL || !ENV.SUPABASE_ANON_KEY) {
  console.warn('Faltan variables base de Supabase en servidor');
}

if (!ENV.SUPABASE_SERVICE_KEY) {
  console.warn('SUPABASE_SERVICE_ROLE_KEY no configurada: backend puede fallar por RLS');
}

const key = ENV.SUPABASE_SERVICE_KEY || ENV.SUPABASE_ANON_KEY;

export const supabaseServer = createClient(ENV.SUPABASE_URL, key, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
