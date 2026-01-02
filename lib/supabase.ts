
import { createClient } from '@supabase/supabase-js';

/**
 * Supabase Client Configuration
 * 
 * En este entorno, las variables de entorno se obtienen de process.env.
 * Hemos implementado un Proxy de seguridad para evitar que el error "supabaseUrl is required"
 * bloquee la carga inicial de la aplicación cuando las llaves aún no han sido configuradas en Vercel.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Verificamos si las credenciales son válidas antes de intentar la inicialización
const isValidConfig = supabaseUrl && supabaseUrl.startsWith('https://') && supabaseAnonKey;

export const supabase = isValidConfig
  ? createClient(supabaseUrl, supabaseAnonKey)
  : new Proxy({}, {
      get: (target, prop) => {
        // Mock de la funcionalidad 'from' para que las llamadas a la base de datos no rompan la app
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
              // Permite el uso de .then() directamente en la cadena de métodos
              then: (onfulfilled: any) => Promise.resolve({ data: null, error: null }).then(onfulfilled),
            };
            return chain;
          };
        }
        // Mock de la funcionalidad 'auth'
        if (prop === 'auth') {
          return {
            getSession: () => Promise.resolve({ data: { session: null }, error: null }),
            onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
            getUser: () => Promise.resolve({ data: { user: null }, error: null }),
          };
        }
        // Retorno por defecto para cualquier otra propiedad
        return () => {};
      }
    }) as any;

if (!isValidConfig) {
  console.warn(
    "⚠️ Supabase no está configurado o el URL es inválido. " +
    "La sincronización en la nube está desactivada, pero la app funcionará localmente. " +
    "Configura NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY para activar la persistencia remota."
  );
}
