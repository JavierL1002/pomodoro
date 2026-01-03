import { createClient } from '@supabase/supabase-js';

/**
 * Configuración de Supabase con validación mejorada
 */

// Obtener variables de entorno con fallbacks
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Validar configuración
const isValidConfig = 
  supabaseUrl && 
  supabaseUrl.startsWith('https://') && 
  supabaseUrl.includes('.supabase.co') &&
  supabaseAnonKey && 
  supabaseAnonKey.length > 20;

// Log para debugging (solo en desarrollo)
if (!isValidConfig) {
  console.error('❌ Supabase NO configurado correctamente:');
  console.error('URL:', supabaseUrl || 'NO DEFINIDA');
  console.error('Key:', supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'NO DEFINIDA');
  console.error('Verifica las variables de entorno en Render');
} else {
  console.log('✅ Supabase configurado correctamente');
  console.log('URL:', supabaseUrl);
}

// Crear cliente o mock
export const supabase = isValidConfig
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false, // No usar sesiones de auth
        autoRefreshToken: false,
      },
      db: {
        schema: 'public'
      }
    })
  : createMockClient();

// Mock client para cuando no hay configuración
function createMockClient() {
  const mockError = new Error('Supabase no configurado - verifica VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY');
  
  const mockChain: any = {
    insert: () => {
      console.error('❌ Mock: INSERT fallido');
      return Promise.resolve({ data: null, error: mockError });
    },
    select: () => mockChain,
    update: () => {
      console.error('❌ Mock: UPDATE fallido');
      return Promise.resolve({ data: null, error: mockError });
    },
    delete: () => {
      console.error('❌ Mock: DELETE fallido');
      return Promise.resolve({ data: null, error: mockError });
    },
    eq: () => mockChain,
    order: () => mockChain,
    single: () => Promise.resolve({ data: null, error: mockError }),
    then: (onfulfilled: any) => Promise.resolve({ data: null, error: mockError }).then(onfulfilled),
  };

  return new Proxy({}, {
    get: (target, prop) => {
      if (prop === 'from') return () => mockChain;
      if (prop === 'auth') {
        return {
          getSession: () => Promise.resolve({ data: { session: null }, error: null }),
          onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
          getUser: () => Promise.resolve({ data: { user: null }, error: null }),
        };
      }
      return () => mockChain;
    }
  }) as any;
}

// Exportar configuración para debugging
export const supabaseConfig = {
  isConfigured: isValidConfig,
  url: supabaseUrl,
  hasKey: !!supabaseAnonKey,
};
