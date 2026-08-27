import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
// base is set for GitHub Pages path-prefixing (repo name). Adjust if the repo is renamed.
const BASE = '/greek-reader/'

export default defineConfig({
  base: BASE,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // A new deploy is fetched in the background and takes over on the next
      // navigation. No "update available" prompt: there is nothing a learner
      // could usefully decide, and a stale shell against a fresh corpus is the
      // exact mismatch this precache exists to prevent.
      registerType: 'autoUpdate',
      // The plugin precaches the manifest's own icons, so these are the three
      // static files nothing else claims. Listing anything the globs below
      // already match would put duplicate entries in the precache manifest.
      includeAssets: ['favicon.svg', 'app-icon.svg', 'icons/icon-180.png'],
      manifest: {
        name: 'Greek Reader',
        short_name: 'Ἀναγνώστης',
        description: 'Read the Greek New Testament at your level, and drill the vocabulary and verb forms that unlock it.',
        start_url: BASE,
        scope: BASE,
        display: 'standalone',
        orientation: 'portrait-primary',
        // Matches the app's own stone palette, so the launch screen doesn't
        // flash white before a dark UI paints.
        background_color: '#1c1917',
        theme_color: '#1c1917',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // The whole app, fonts included, plus all of public/data: ~12MB. That is
        // not extravagance — loadCorpus fetches every book on each cold load
        // anyway, so precaching costs nothing extra and buys real offline use.
        globPatterns: ['**/*.{js,css,html,woff2,json}'],
        // The default cap is 2MiB, which would silently skip the four largest
        // books. A corpus missing Luke is worse than no offline at all.
        maximumFileSizeToCacheInBytes: 3_000_000,
        navigateFallback: `${BASE}index.html`,
        cleanupOutdatedCaches: true,
      },
    }),
  ],
})
