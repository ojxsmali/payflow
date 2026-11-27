// Renders every brand asset from the one logo geometry in src/lib/brandMark.ts:
//   public/favicon.svg, public/icon-192.png, public/icon-512.png,
//   public/apple-touch-icon.png, public/manifest.webmanifest,
//   public/og.png (1200×630) and docs/social-preview.png (1280×640).
//
// The share cards are screenshots of the live /brand?card=… page (3D included),
// so start the dev server first:  npm run dev   then   npm run brand
//
// Needs puppeteer-core and a Chromium browser. Point at them with
//   PUPPETEER_CORE=<path to puppeteer-core entry .js>  BROWSER=<path to chrome/edge>
// Node 24+ runs the TypeScript import below directly (type stripping).
import { mkdir, writeFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import { BRAND, MARK_PATHS, markSvg } from '../src/lib/brandMark.ts'

const BASE = process.argv[2] ?? 'http://localhost:5195'
const core = process.env.PUPPETEER_CORE
const { default: puppeteer } = await import(core ? pathToFileURL(core).href : 'puppeteer-core')
const executablePath = process.env.BROWSER ?? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'

await mkdir('public', { recursive: true })
await mkdir('docs', { recursive: true })
await writeFile('public/favicon.svg', markSvg('tile', 32) + '\n')

const manifest = {
  name: 'PayFlow',
  short_name: 'PayFlow',
  description: 'Invoicing and payment tracking for freelancers.',
  start_url: '/',
  display: 'standalone',
  background_color: BRAND.paper,
  theme_color: BRAND.violet,
  icons: [
    { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
  ],
}
await writeFile('public/manifest.webmanifest', JSON.stringify(manifest, null, 2) + '\n')

const browser = await puppeteer.launch({
  executablePath,
  headless: 'new',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
  protocolTimeout: 240000,
})

/** Full-bleed violet square with the mark at 78% — safe inside the maskable circle. */
async function icon(size, file) {
  const p = await browser.newPage()
  await p.setViewport({ width: size, height: size, deviceScaleFactor: 1 })
  const inner = `<path d="${MARK_PATHS.ring}" fill="${BRAND.paper}" fill-rule="evenodd" opacity="0.55"/><path d="${MARK_PATHS.p}" fill="${BRAND.paper}" fill-rule="evenodd"/><path d="${MARK_PATHS.dot}" fill="${BRAND.lime}"/>`
  await p.setContent(
    `<html><body style="margin:0;background:${BRAND.violet}"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="${size}" height="${size}"><rect width="32" height="32" fill="${BRAND.violet}"/><g transform="translate(3.52 3.52) scale(0.78)">${inner}</g></svg></body></html>`,
  )
  await p.screenshot({ path: file, clip: { x: 0, y: 0, width: size, height: size } })
  await p.close()
}
await icon(192, 'public/icon-192.png')
await icon(512, 'public/icon-512.png')
await icon(180, 'public/apple-touch-icon.png')

async function card(kind, file) {
  const p = await browser.newPage()
  const [w, h] = kind === 'og' ? [1200, 630] : [1280, 640]
  await p.setViewport({ width: w, height: h, deviceScaleFactor: 1 })
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }])
  await p.goto(`${BASE}/brand?card=${kind}`, { waitUntil: 'networkidle2', timeout: 60000 })
  const el = await p.waitForSelector('#share-card canvas', { timeout: 30000 }).then(
    () => p.$('#share-card'),
    () => p.$('#share-card'),
  )
  await new Promise((r) => setTimeout(r, 6000)) // fonts → textures → a few frames
  await el.screenshot({ path: file })
  await p.close()
}
await card('og', 'public/og.png')
await card('social', 'docs/social-preview.png')

await browser.close()
console.log('brand assets written')
