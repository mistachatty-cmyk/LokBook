import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  clearScreen: false,
  server: { port: 5173, strictPort: true },
  // NOTE: do not add `resolve.dedupe: ['three']` here. It breaks three's
  // subpath exports (three/webgpu, three/tsl) during dep pre-bundling, which
  // three-globe imports. A single three instance is already guaranteed the
  // right way — by package.json declaring a `three` range that satisfies
  // globe.gl's own requirement, so npm never installs a nested second copy.
  // (Two copies is what produced "matrixWorld.determinantAffine is not a
  // function": meshes built by one three handed to a renderer from another.)
  optimizeDeps: {
    // globe.gl/three-globe import three's subpath entries (three/webgpu,
    // three/tsl). esbuild's dep pre-bundler fails to honour those export
    // conditions and dies with 'Missing "./webgpu" specifier', which takes the
    // whole dev server down. Rollup resolves them correctly, so production
    // builds are unaffected — excluding these from pre-bundling keeps dev
    // working without changing what ships.
    exclude: ['@tauri-apps/api', '@tauri-apps/plugin-fs', '@tauri-apps/plugin-dialog', '@tauri-apps/plugin-shell', '@tauri-apps/plugin-process',
      'globe.gl', 'three-globe', 'three-render-objects'],
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      // LOK_TEST_HARNESS=1 adds world-harness.html as a second entry so the
      // real WorldMapViewer can be driven headlessly against a production
      // build (see scripts/verify-world.mjs). Never set in normal builds, so
      // the harness is not part of anything that ships.
      input: process.env.LOK_TEST_HARNESS
        ? { main: 'index.html', harness: 'world-harness.html', lok: 'lok-harness.html', easel: 'easel-harness.html', pro: 'pro-harness.html', street: 'street-harness.html' }
        : undefined,
      output: { manualChunks: { vendor: ['react'], app: ['src/App.jsx'] } },
    },
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
          // Keep the 3D stack OUT of the precache. globe.gl (1.3 MB) plus three
          // (735 KB) is roughly two thirds of a 3.3 MB precache, downloaded on
          // every install by every user — including the majority who never open
          // World. On iOS that makes the install slow and quota-fragile, and
          // it makes `cleanupOutdatedCaches` maximally destructive when a new
          // worker takes over mid-session. They are runtime-cached below
          // instead: first open of World pays for them, every later open is
          // still instant, and offline still works once visited.
          globIgnores: ['**/globe.gl-*.js', '**/three.module-*.js'],
          maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
          navigateFallback: '/index.html',
          // /flip/:id is server-rendered for crawlers — never answer it from the
          // SPA shell cache, or a shared link loses its OpenGraph tags.
          navigateFallbackDenylist: [/^\/api\//, /^\/flip\//],
          runtimeCaching: [
            {
              // The 3D chunks excluded from the precache above.
              urlPattern: /\/assets\/(globe\.gl|three\.module)-[^/]+\.js$/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'lok-3d',
                expiration: { maxEntries: 8, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
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
