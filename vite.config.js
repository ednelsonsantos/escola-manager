import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    port: 5173,
    strictPort: false,   // permite tentar 5174, 5175... se 5173 estiver ocupada
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      external: ['better-sqlite3', 'electron'],
    },
  },
  optimizeDeps: {
    exclude: ['better-sqlite3'],
  },
})
