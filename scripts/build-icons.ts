// Rasterises public/app-icon.svg into the PNGs a home screen needs.
// Run: npm run build:icons — only when the icon artwork changes; the PNGs are
// committed, so an ordinary build and the deploy never depend on this.
//
// iOS ignores SVG for home-screen icons, so PNGs are not optional. Rendering
// goes through the Chromium that Playwright (already a devDependency) installs,
// rather than adding an image-processing library for four files.

import { chromium } from 'playwright'
import { mkdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const SOURCE = path.join(ROOT, 'public', 'app-icon.svg')
const OUT_DIR = path.join(ROOT, 'public', 'icons')

/**
 * `padding` is the fraction of the tile left empty around the artwork. A
 * maskable icon may be cropped to a circle by the launcher, so its art has to
 * sit inside the safe zone — 20% a side is the spec's recommendation.
 */
const TARGETS = [
  { file: 'icon-180.png', size: 180, padding: 0 }, // apple-touch-icon
  { file: 'icon-192.png', size: 192, padding: 0 },
  { file: 'icon-512.png', size: 512, padding: 0 },
  { file: 'icon-512-maskable.png', size: 512, padding: 0.2 },
]

const svg = readFileSync(SOURCE, 'utf8')
mkdirSync(OUT_DIR, { recursive: true })

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium',
})

for (const { file, size, padding } of TARGETS) {
  const page = await browser.newPage({ viewport: { width: size, height: size } })
  const inset = Math.round(size * padding)
  // The background is painted by the page, not scaled with the art, so a
  // maskable icon keeps its full-bleed tile and only the letter shrinks.
  await page.setContent(
    `<style>
       html,body{margin:0;padding:0;width:${size}px;height:${size}px;background:#1c1917;overflow:hidden}
       svg{position:absolute;left:${inset}px;top:${inset}px;width:${size - inset * 2}px;height:${size - inset * 2}px}
       svg rect{fill:transparent}
     </style>${svg}`,
  )
  await page.screenshot({ path: path.join(OUT_DIR, file), omitBackground: false })
  await page.close()
  console.log(`  ${file.padEnd(24)} ${size}x${size}${padding ? ` (${padding * 100}% safe-zone inset)` : ''}`)
}

await browser.close()
console.log(`\nWrote ${TARGETS.length} icons to public/icons/`)
