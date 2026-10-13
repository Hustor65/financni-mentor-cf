import { defineConfig } from 'vite'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync, readdirSync } from 'node:fs'
import { createHash } from 'node:crypto'

/**
 * Vygeneruje dist/sw.js ze šablony scripts/sw.template.js: doplní seznam souborů,
 * které se mají uložit pro provoz bez připojení. Knihovny pro diagramy v chatu
 * (mermaid a spol.) se vynechávají — mentor bez sítě stejně neodpovídá.
 */
function serviceWorker(): Plugin {
  const HEAVY = /node_modules\/(mermaid|@mermaid-js|katex|cytoscape)/
  return {
    name: 'fm-service-worker',
    apply: 'build',
    generateBundle(_, bundle) {
      const chunks = Object.values(bundle).flatMap(f => (f.type === 'chunk' ? [f] : []))
      const byName = new Map(chunks.map(c => [c.fileName, c]))
      // projdi graf importů od vstupu; do větví s diagramovými knihovnami nelez
      const keep = new Set<string>()
      const queue = chunks.filter(c => c.isEntry).map(c => c.fileName)
      while (queue.length) {
        const name = queue.pop()!
        const chunk = byName.get(name)
        if (!chunk || keep.has(name)) continue
        if (!chunk.isEntry && chunk.moduleIds.some(id => HEAVY.test(id))) continue
        keep.add(name)
        queue.push(...chunk.imports, ...chunk.dynamicImports)
      }
      const assets = Object.keys(bundle).filter(f => f.endsWith('.css') || /-latin(-ext)?-.*\.woff2$/.test(f))
      const all = [...keep, ...assets].map(f => `/${f}`).sort()
      const snapshots = readdirSync('public/snapshot')
        .filter(f => f.endsWith('.json') && !f.includes(' '))
        .map(f => `/snapshot/${f}`)

      const isExtra = (f: string) => /\/(vendor-three|Scene)-/.test(f)
      const core = ['/', '/favicon.svg', '/snapshot/quotes.json', ...all.filter(f => !isExtra(f))]
      const extra = [...all.filter(isExtra), '/countries.geojson', ...snapshots.filter(f => !f.endsWith('quotes.json'))]
      const version = createHash('sha1').update(JSON.stringify([core, extra])).digest('hex').slice(0, 10)

      const source = readFileSync('scripts/sw.template.js', 'utf8')
        .replace('__VERSION__', version)
        .replace('__CORE__', JSON.stringify(core))
        .replace('__EXTRA__', JSON.stringify(extra))
      this.emitFile({ type: 'asset', fileName: 'sw.js', source })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), serviceWorker()],
  // lokálně: /api/* obsluhuje wrangler (npx wrangler pages dev dist --port 8788)
  server: {
    proxy: { '/api': 'http://localhost:8788' },
    watch: { ignored: ['**/*.nosync/**'] },
  },
  // node_modules je symlink na node_modules.nosync (aby ho iCloud nesynchronizoval);
  // zachováním symlinků zůstanou cesty balíčků pod „node_modules/“, jak Vite čeká
  resolve: { preserveSymlinks: true, dedupe: ['three', 'react', 'react-dom'] },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // rolldown chce manualChunks jako funkci (ne objekt) — těžké knihovny do vlastních chunků
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return
          if (id.includes('echarts')) return 'vendor-echarts'
          if (
            id.includes('/three') ||
            id.includes('@react-three') ||
            id.includes('three-globe') ||
            id.includes('r3f-globe')
          )
            return 'vendor-three'
        },
      },
    },
  },
})
