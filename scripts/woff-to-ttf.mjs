// Converts the Fontsource WOFF files used by the PDF into plain TrueType.
// react-pdf's font engine is unreliable with WOFF for text laid out at render
// time, so the PDF embeds TTF. Fonts are SIL OFL 1.1.
//   node scripts/woff-to-ttf.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { inflateSync } from 'node:zlib'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const out = new URL('../src/assets/pdf-fonts/', import.meta.url)
mkdirSync(out, { recursive: true })

const files = {
  'plex-sans-400.ttf': '@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-400-normal.woff',
  'plex-sans-500.ttf': '@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-500-normal.woff',
  'plex-sans-600.ttf': '@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-600-normal.woff',
  'plex-sans-ext-400.ttf': '@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-ext-400-normal.woff',
  'plex-sans-ext-600.ttf': '@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-ext-600-normal.woff',
  'plex-mono-400.ttf': '@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff',
  'newsreader-400.ttf': '@fontsource/newsreader/files/newsreader-latin-400-normal.woff',
}

function woffToSfnt(woff) {
  if (woff.readUInt32BE(0) !== 0x774f4646) throw new Error('not a WOFF file')
  const flavor = woff.readUInt32BE(4)
  const numTables = woff.readUInt16BE(12)
  const tables = []
  for (let i = 0; i < numTables; i++) {
    const o = 44 + i * 20
    const tag = woff.readUInt32BE(o)
    const offset = woff.readUInt32BE(o + 4)
    const compLength = woff.readUInt32BE(o + 8)
    const origLength = woff.readUInt32BE(o + 12)
    const checksum = woff.readUInt32BE(o + 16)
    const raw = woff.subarray(offset, offset + compLength)
    const data = compLength < origLength ? inflateSync(raw) : Buffer.from(raw)
    tables.push({ tag, checksum, data })
  }
  let searchRange = 1, entrySelector = 0
  while (searchRange * 2 <= numTables) { searchRange *= 2; entrySelector++ }
  searchRange *= 16
  const headerLen = 12 + numTables * 16
  let offset = headerLen
  const placed = tables.map((t) => { const p = { ...t, offset }; offset += (t.data.length + 3) & ~3; return p })
  const buf = Buffer.alloc(offset)
  buf.writeUInt32BE(flavor, 0)
  buf.writeUInt16BE(numTables, 4)
  buf.writeUInt16BE(searchRange, 6)
  buf.writeUInt16BE(entrySelector, 8)
  buf.writeUInt16BE(numTables * 16 - searchRange, 10)
  placed.forEach((t, i) => {
    const o = 12 + i * 16
    buf.writeUInt32BE(t.tag, o)
    buf.writeUInt32BE(t.checksum, o + 4)
    buf.writeUInt32BE(t.offset, o + 8)
    buf.writeUInt32BE(t.data.length, o + 12)
    t.data.copy(buf, t.offset)
  })
  return buf
}

for (const [name, src] of Object.entries(files)) {
  const ttf = woffToSfnt(readFileSync(require.resolve(src)))
  writeFileSync(new URL(name, out), ttf)
  console.log(`${name}  ${(ttf.length / 1024).toFixed(0)} KB`)
}
