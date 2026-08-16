import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  cacheDir: 'node_modules/.vite-clean',
  build: {
    outDir: 'dist',
  },
  server: {
    port: 5174,
    strictPort: true,
  },
})
