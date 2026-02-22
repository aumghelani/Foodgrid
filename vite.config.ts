import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

/** Inline plugin — transforms *.geojson imports into ES module default exports.
 *  Vite's built-in JSON plugin only handles *.json; this extends it to *.geojson
 *  so `import rawTracts from './boston_tracts.geojson'` returns a parsed object,
 *  not a URL string (which is what `assetsInclude` would give us). */
const geojsonPlugin: Plugin = {
  name: 'geojson-loader',
  transform(src, id) {
    if (id.endsWith('.geojson')) {
      return { code: `export default ${src}`, map: null }
    }
  },
}

export default defineConfig({
  plugins: [react(), geojsonPlugin],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // Forward /api/* to the Django backend during development.
      // Use 127.0.0.1 explicitly — on some systems 'localhost' resolves to
      // IPv6 ::1 which Django doesn't listen on by default.
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path,
      },
    },
  },
})
