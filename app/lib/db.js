// Conexión a Supabase (la clave "publishable" es pública por diseño; la seguridad la dan las políticas RLS)
const SUPABASE_URL = 'https://aqassltxvrtegatlzkkl.supabase.co';
const SUPABASE_KEY = 'sb_publishable_u5A3pcpkyLXqQa6s2x-pxg_Vci2xypW';

export async function crearCliente() {
  const { createClient } = await import('@supabase/supabase-js');
  return createClient(SUPABASE_URL, SUPABASE_KEY);
}
