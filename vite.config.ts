import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  console.log('🔧 Build Mode:', mode);
  
  // En producción, Render inyecta las variables directamente como process.env
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
  const geminiApiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || '';

  console.log('✅ Supabase URL:', supabaseUrl ? 'Configurada' : '❌ NO ENCONTRADA');
  console.log('✅ Supabase Key:', supabaseAnonKey ? 'Configurada' : '❌ NO ENCONTRADA');
  console.log('✅ Gemini Key:', geminiApiKey ? 'Configurada' : '❌ NO ENCONTRADA');

  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react()],
    define: {
      // Inyectar variables en tiempo de compilación
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(supabaseAnonKey),
      'process.env.API_KEY': JSON.stringify(geminiApiKey),
      'process.env.GEMINI_API_KEY': JSON.stringify(geminiApiKey),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    build: {
      sourcemap: mode === 'development',
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            supabase: ['@supabase/supabase-js'],
          }
        }
      }
    }
  };
});
