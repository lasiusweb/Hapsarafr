
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

/// <reference types="vitest" />
import { defineConfig as defineVitestConfig } from 'vitest/config'

// https://vitejs.dev/config/
export default defineVitestConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  return {
    plugins: [react()],
    define: {
      // Securely injection of environment variables
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
      'process.env.NODE_ENV': JSON.stringify(mode),
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
    },
    test: {
      globals: true,
      environment: 'jsdom',
    },
  }
})
