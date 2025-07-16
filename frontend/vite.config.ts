import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 53000,
    strictPort: true,
    cors: true,
    // Allow all hosts for LAN access
    allowedHosts: true,
    // Additional headers for CORS and security
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Authorization',
    },
    proxy: {
      '/api': {
        target: 'http://backend:58000',
        changeOrigin: true,
        secure: false, // Allow insecure HTTPS
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    }
  },
  // Build configuration for production
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  // Preview server configuration (for production builds)
  preview: {
    host: '0.0.0.0',
    port: 53000,
    strictPort: true,
    cors: true,
  }
})