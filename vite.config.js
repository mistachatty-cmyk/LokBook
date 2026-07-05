import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon.svg'],
        manifest: {
          name: 'LokBook',
          short_name: 'LokBook',
          description: 'A home for tiny hand-drawn animations',
          theme_color: '#F2EDE2',
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
