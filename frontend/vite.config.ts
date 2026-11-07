import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'

/* Pré-rendu (vite build --ssr) : leaflet remplacé par un bouchon, il exige un navigateur. */
function ssrLeafletStub(): Plugin {
  const stub = fileURLToPath(new URL('./src/ssr/leaflet-stub.ts', import.meta.url))
  return {
    name: 'ssr-leaflet-stub',
    enforce: 'pre',
    resolveId(id, _importer, options) {
      if (!options?.ssr) return null
      if (id === 'leaflet') return stub
      if (id.startsWith('leaflet/') && id.endsWith('.css')) return '\0ssr-empty-css'
      return null
    },
    load(id) {
      return id === '\0ssr-empty-css' ? '' : null
    },
  }
}

export default defineConfig({
  plugins: [ssrLeafletStub(), react(), tailwindcss()],
  ssr: {
    /* Tout est empaqueté pour le pré-rendu : pas de node_modules à résoudre à l'exécution. */
    noExternal: true,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3005',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://127.0.0.1:3005',
        changeOrigin: true,
        ws: true,
      },
      '/uploads': {
        target: 'http://127.0.0.1:3005',
        changeOrigin: true,
      },
    },
  },
})
