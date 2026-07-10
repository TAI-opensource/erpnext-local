import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'frappe-react-sdk': path.resolve(__dirname, 'src/frappe-react-sdk-local.ts'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '^/(app|api|assets|files|private)': {
        target: 'http://127.0.0.1:8000',
        ws: true,
      },
    },
  },
  build: {
    outDir: 'dist-local',
    emptyOutDir: true,
    target: 'es2015',
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react-dom', 'react'],
          'vendor-frappe': ['frappe-react-sdk'],
          'vendor-tanstack': ['@tanstack/react-table', '@tanstack/react-virtual'],
          'vendor-radix': ['radix-ui'],
          'vendor-jotai': ['jotai'],
          'vendor-lucide': ['lucide-react'],
        },
      },
    },
  },
})
