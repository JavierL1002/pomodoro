import { createClient } from '@supabase/supabase-js';

/**
 * Configuración de Supabase
 * Priorizamos VITE_ para Render/Vite y NEXT_ para compatibilidad.
 */
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Verificamos si las credenciales son válidas
const isValidConfig = supabaseUrl && supabaseUrl.startsWith('https://') && supabaseAnonKey;

// UN SOLO "export const supabase" (Esto arregla el error de Render)
export const supabase = isValidConfig
  ? createClient(supabaseUrl, supabaseAnonKey)
  : new Proxy({}, {
      get: (target, prop) => {
        if (prop === 'from') {
          return () => {
            const chain: any = {
              insert: () => Promise.resolve({ data: null, error: null }),
              select: () => chain,
              update: () => Promise.resolve({ data: null, error: null }),
              delete: () => chain,
              eq: () => chain,
              order: () => chain,
              single: () => Promise.resolve({ data: null, error: null }),
              then: (onfulfilled: any) => Promise.resolve({ data: null, error: null }).then(onfulfilled),
            };
            return chain;
          };
        }
        if (prop === 'auth') {
          return {
            getSession: () => Promise.resolve({ data: { session: null }, error: null }),
            onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
            getUser: () => Promise.resolve({ data: { user: null }, error: null }),
          };
        }
        return () => {};
      }
    }) as any;

if (!isValidConfig) {
  console.warn(
    "⚠️ Supabase no está configurado. La app funcionará en modo offline (Mock).\n" +
    "Configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en Render para conectar la base de datos."
  );
}
