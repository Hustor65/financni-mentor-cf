import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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
