import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  return {
    plugins: [react()],
    define: {
      // Polyfill process.env for the Gemini SDK and legacy code compatibility in browser
      'process.env': {
        API_KEY: env.API_KEY || process.env.API_KEY
      }
    },
    optimizeDeps: {
      // WatermelonDB uses Flow and older JS patterns that confuse Vite's optimizer
      exclude: ['@nozbe/watermelondb', '@nozbe/watermelondb/adapters/lokijs']
    },
    build: {
      target: 'esnext',
      commonjsOptions: {
        transformMixedEsModules: true
      }
    }
  }
})