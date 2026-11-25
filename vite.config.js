import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'
import pkg from './package.json' with { type: 'json' }

// Upper-case the Windows drive letter. VS Code opens folders as `c:\…`, which
// makes `@/` imports resolve to `c:/…` while relative imports resolve to `C:/…`.
// Rolldown then bundles Pinia twice and the production app opens blank.
const src = fileURLToPath(new URL('./src', import.meta.url)).replace(/^[a-z]:/, (d) => d.toUpperCase())

export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: { '@': src },
  },
})
