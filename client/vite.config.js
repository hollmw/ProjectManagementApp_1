import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // SPA routing: serve index.html for any unmatched route so React Router
  // can handle /dashboard, /gantt, etc. on hard-refresh or direct URL access.
  appType: 'spa',
  server: {
    historyApiFallback: true,
  },
  preview: {
    historyApiFallback: true,
  },
})
