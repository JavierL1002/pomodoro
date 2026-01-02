import { createClient } from '@supabase/supabase-js';

/**
 * Configuración de Supabase
 * Priorizamos VITE_ para Render/Vite y NEXT_ para compatibilidad.
 * Se añade un mensaje de error más claro si las variables no están.
 */
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

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
              insert: () => {
                console.error("ERROR: Supabase no está configurado. Intentando INSERT en modo Mock.");
                return Promise.resolve({ data: null, error: new Error("Supabase no configurado") });
              },
              select: () => chain,
              update: () => {
                console.error("ERROR: Supabase no está configurado. Intentando UPDATE en modo Mock.");
                return Promise.resolve({ data: null, error: new Error("Supabase no configurado") });
              },
              delete: () => {
                console.error("ERROR: Supabase no está configurado. Intentando DELETE en modo Mock.");
                return Promise.resolve({ data: null, error: new Error("Supabase no configurado") });
              },
              eq: () => chain,
              order: () => chain,
              single: () => Promise.resolve({ data: null, error: new Error("Supabase no configurado") }),
              then: (onfulfilled: any) => Promise.resolve({ data: null, error: new Error("Supabase no configurado") }).then(onfulfilled),
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
  console.error(
    "❌ ERROR CRÍTICO: Supabase no está configurado. La app funcionará en modo offline (Mock).\n" +
    "Asegúrate de configurar las variables de entorno VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY."
  );
}
