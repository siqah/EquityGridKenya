import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react()],
    optimizeDeps: {
      include: ['maplibre-gl', '@deck.gl/react', '@deck.gl/mapbox', '@deck.gl/layers', '@deck.gl/aggregation-layers'],
    },
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:8000',
          changeOrigin: true,
        },
        '/anthropic': {
          target: 'https://api.anthropic.com',
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/anthropic/, ''),
          configure(proxy) {
            proxy.on('proxyReq', (proxyReq) => {
              const key = env.ANTHROPIC_API_KEY || ''
              if (key) {
                proxyReq.setHeader('x-api-key', key)
                proxyReq.setHeader('anthropic-version', '2023-06-01')
              }
            })
          },
        },
        '/elevenlabs': {
          target: 'https://api.elevenlabs.io',
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/elevenlabs/, ''),
          configure(proxy) {
            proxy.on('proxyReq', (proxyReq) => {
              const key =
                env.ELEVENLABS_API_KEY || env.VITE_ELEVENLABS_API_KEY || ''
              if (key) {
                proxyReq.setHeader('xi-api-key', key)
              }
            })
          },
        },
      },
    },
  }
})
