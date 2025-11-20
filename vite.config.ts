import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    plugins: [react()],
    define: {
      // Polyfill process.env for the Gemini SDK and legacy code
      'process.env': {
        API_KEY: env.API_KEY || process.env.API_KEY
      }
    },
    resolve: {
      alias: {
        // Fix for WatermelonDB imports if needed in some environments
      }
    }
  }
})