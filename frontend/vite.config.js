import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vite dev proxy to the FastAPI bridge on :8000. The frontend talks to
// relative paths (`/analyze`, `/events/...`, `/chat/...`) so production
// builds can be served from the same origin without code changes.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/analyze':              { target: 'http://localhost:8000', changeOrigin: true },
      '/events':               { target: 'http://localhost:8000', changeOrigin: true, ws: false },
      '/payload':              { target: 'http://localhost:8000', changeOrigin: true },
      '/chat':                 { target: 'http://localhost:8000', changeOrigin: true },
      '/trending':             { target: 'http://localhost:8000', changeOrigin: true },
      '/missed-opportunities': { target: 'http://localhost:8000', changeOrigin: true },
      '/health':               { target: 'http://localhost:8000', changeOrigin: true },
    },
  },
})
