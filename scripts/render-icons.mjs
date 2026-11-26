// Renders Payapa's icon PNGs from assets/icon/payapa-icon.svg (no Android Studio needed).
// Run: node scripts/render-icons.mjs   (uses installed Chrome through playwright-core)
// Writes: legacy launcher PNGs (Android 7.0-7.1), the legacy splash set, and public/favicon.svg.
// Android 8+ uses the vector drawables in res/drawable*/ (adaptive icon) instead.

import { chromium } from 'playwright-core'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const res = `${root}android/app/src/main/res/`
const svg = readFileSync(`${root}assets/icon/payapa-icon.svg`, 'utf8')
const inner = svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').replace(/<!--[\s\S]*?-->/g, '')
const TEAL = '#0b6b63'

// Launcher PNGs show the middle 72 of the 108 canvas, like Android's own legacy crop.
const launcher = (size, shape) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="18 18 72 72">
  <defs><clipPath id="c">${shape === 'round' ? '<circle cx="54" cy="54" r="36"/>' : '<rect x="18" y="18" width="72" height="72" rx="16"/>'}</clipPath></defs>
  <g clip-path="url(#c)">${inner}</g></svg>`

// Splash: teal everywhere, the mark centred at about a quarter of the short side.
const splash = (w, h) => {
  const s = Math.min(w, h) * 0.5 / 108
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="${TEAL}"/>
  <g transform="translate(${w / 2 - 54 * s} ${h / 2 - 54 * s}) scale(${s})">${inner.replace(/<rect[^>]*\/>/, '')}</g></svg>`
}

const LAUNCHER = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 }
const SPLASH = {
  'drawable': [480, 320],
  'drawable-port-mdpi': [320, 480], 'drawable-port-hdpi': [480, 800], 'drawable-port-xhdpi': [720, 1280], 'drawable-port-xxhdpi': [960, 1600], 'drawable-port-xxxhdpi': [1280, 1920],
  'drawable-land-mdpi': [480, 320], 'drawable-land-hdpi': [800, 480], 'drawable-land-xhdpi': [1280, 720], 'drawable-land-xxhdpi': [1600, 960], 'drawable-land-xxxhdpi': [1920, 1280],
}

const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage()
async function render(markup, w, h, path) {
  await page.setViewportSize({ width: w, height: h })
  await page.setContent(`<html><body style="margin:0;background:transparent">${markup}</body></html>`)
  await page.locator('svg').screenshot({ path, omitBackground: true })
  console.log('wrote', path.replace(root, ''), `${w}x${h}`)
}
for (const [d, px] of Object.entries(LAUNCHER)) {
  await render(launcher(px, 'square'), px, px, `${res}mipmap-${d}/ic_launcher.png`)
  await render(launcher(px, 'round'), px, px, `${res}mipmap-${d}/ic_launcher_round.png`)
}
for (const [dir, [w, h]] of Object.entries(SPLASH)) await render(splash(w, h), w, h, `${res}${dir}/splash.png`)
await browser.close()

writeFileSync(`${root}public/favicon.svg`, svg.replace(/<rect width="108" height="108"/, '<rect width="108" height="108" rx="24"'))
console.log('wrote public/favicon.svg')
