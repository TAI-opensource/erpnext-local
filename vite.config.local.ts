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
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react-dom') || id.includes('/react/')) return 'vendor-react'
            if (id.includes('frappe-react-sdk')) return 'vendor-frappe'
            if (id.includes('@tanstack')) return 'vendor-tanstack'
            if (id.includes('radix-ui')) return 'vendor-radix'
            if (id.includes('jotai')) return 'vendor-jotai'
            if (id.includes('lucide-react')) return 'vendor-lucide'
            return 'vendor'
          }
        },
      },
    },
    assetsInlineLimit: 0,
  },
})
