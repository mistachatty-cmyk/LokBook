import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  clearScreen: false,
  server: { port: 5173, strictPort: true },
  optimizeDeps: {
    exclude: ['@tauri-apps/api', '@tauri-apps/plugin-fs', '@tauri-apps/plugin-dialog', '@tauri-apps/plugin-shell', '@tauri-apps/plugin-process'],
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: { output: { manualChunks: { vendor: ['react'], app: ['src/App.jsx'] } } },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon.svg', 'logos/*.svg'],
        manifest: {
          name: 'LokBook',
          short_name: 'LokBook',
          description: 'A home for tiny hand-drawn animations',
          theme_color: '#23306B',
          background_color: '#F2EDE2',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/',
          icons: [
            { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
          ],
        },
    }),
  ],
})
