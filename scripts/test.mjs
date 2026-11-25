// Run Vitest from an upper-case drive letter. VS Code opens folders as `c:\…`;
// from there Vitest loads itself twice (c:/ and C:/) and every suite fails with
// "Cannot read properties of undefined (reading 'config')".
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const upper = (p) => p.replace(/^[a-z]:/, (d) => d.toUpperCase())
const vitest = upper(fileURLToPath(new URL('../node_modules/vitest/vitest.mjs', import.meta.url)))
const r = spawnSync(process.execPath, [vitest, ...process.argv.slice(2)], { cwd: upper(process.cwd()), stdio: 'inherit' })
process.exit(r.status ?? 1)
