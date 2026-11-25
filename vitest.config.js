import { defineConfig } from 'vitest/config'
import { fileURLToPath, URL } from 'node:url'

// Same drive-letter normalization as vite.config.js (see the comment there).
const src = fileURLToPath(new URL('./src', import.meta.url)).replace(/^[a-z]:/, (d) => d.toUpperCase())

export default defineConfig({
  resolve: { alias: { '@': src } },
  test: { environment: 'node' },
})
