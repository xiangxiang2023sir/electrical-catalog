import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { catalogApiPlugin } from './server/vite-plugin-catalog.js'

export default defineConfig({
  plugins: [vue(), catalogApiPlugin()],
  optimizeDeps: {
    include: ['exceljs'],
  },
  server: {
    port: 5173,
    host: '127.0.0.1',
    open: false,
    watch: {
      ignored: ['**/library/**'],
    },
  },
})
