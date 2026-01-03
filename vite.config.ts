import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    // Carga las variables de entorno desde .env y process.env
    // El tercer argumento '' asegura que se carguen todas las variables, no solo las VITE_
    const env = loadEnv(mode, process.cwd(), '');

    // Variables que deben estar disponibles en el cliente (deben ser VITE_*)
    const supabaseUrl = env.VITE_SUPABASE_URL || '';
    const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || '';
    
    // Variables que se inyectan como process.env para compatibilidad (ej. Gemini Key)
    const geminiApiKey = env.GEMINI_API_KEY || '';

    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        // 1. Inyectar las variables VITE_* para que el cliente las lea via import.meta.env
        'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl),
        'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(supabaseAnonKey),
        
        // 2. Inyectar la clave de Gemini como process.env para compatibilidad con librerías
        'process.env.GEMINI_API_KEY': JSON.stringify(geminiApiKey),
        'process.env.API_KEY': JSON.stringify(geminiApiKey), // Por si acaso
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        sourcemap: mode === 'development',
      }
    };
});
