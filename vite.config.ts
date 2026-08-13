import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
// base is set for GitHub Pages path-prefixing (repo name). Adjust if the repo is renamed.
export default defineConfig({
  base: '/greek-reader/',
  plugins: [react(), tailwindcss()],
})
