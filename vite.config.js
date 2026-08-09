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
          // Was 'portrait', which locked an installed iPad or desktop PWA to a
          // phone orientation the responsive shell now handles properly.
          orientation: 'any',
          start_url: '/',
          icons: [
            { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
            { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
          ],
        },
        workbox: {
          // The app shell is precached by default; these rules cover what the
          // shell then reaches for, so a cold offline launch renders rather than
          // showing the browser's error page.
          globPatterns: ['**/*.{js,css,html,svg,woff2}'],
          navigateFallback: '/index.html',
          // /flip/:id is server-rendered for crawlers — never answer it from the
          // SPA shell cache, or a shared link loses its OpenGraph tags.
          navigateFallbackDenylist: [/^\/api\//, /^\/flip\//],
          runtimeCaching: [
            {
              urlPattern: ({ request }) => request.destination === 'image',
              handler: 'CacheFirst',
              options: {
                cacheName: 'lok-images',
                expiration: { maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
          ],
        },
    }),
  ],
})
