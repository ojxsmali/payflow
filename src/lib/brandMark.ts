/**
 * PayFlow's mark — "the stamp". One geometry drives every rendering of the logo:
 * the SVG mark in the app, the rubber face of the 3D stamp on the landing page,
 * the favicons, PWA icons, OG card and GitHub social preview.
 *
 * Drawn on a 32 × 32 grid, y pointing down (SVG convention):
 *  - RING: the double-ruled border of a rubber-stamp impression.
 *  - P: a heavy P whose bowl is a ledger tab.
 *  - DOT: the lime full stop — "paid, done".
 * No imports, so Node scripts can load this file directly.
 */

export type Seg =
  | readonly ['M', number, number]
  | readonly ['L', number, number]
  /** arc around (cx, cy), radius r, from angle a0 to a1 in degrees (y-down, so clockwise = increasing) */
  | readonly ['A', number, number, number, number, number]
  | readonly ['Z']

export interface MarkShape {
  outline: Seg[]
  holes: Seg[][]
}

export const BRAND = {
  name: 'PayFlow',
  paper: '#F1F1EE',
  surface: '#FFFFFF',
  ink: '#0B0B0F',
  violet: '#5B3DF5',
  violetDeep: '#3A1FD1',
  violetOnInk: '#B3A6FF',
  lime: '#D4FF3A',
  author: 'Ojas Mali',
} as const

function roundRect(x0: number, y0: number, x1: number, y1: number, r: number): Seg[] {
  return [
    ['M', x0 + r, y0],
    ['L', x1 - r, y0],
    ['A', x1 - r, y0 + r, r, -90, 0],
    ['L', x1, y1 - r],
    ['A', x1 - r, y1 - r, r, 0, 90],
    ['L', x0 + r, y1],
    ['A', x0 + r, y1 - r, r, 90, 180],
    ['L', x0, y0 + r],
    ['A', x0 + r, y0 + r, r, 180, 270],
    ['Z'],
  ]
}

/** The stamp border: a rounded-square ring. */
export const RING: MarkShape = {
  outline: roundRect(2, 2, 30, 30, 8),
  holes: [roundRect(4.6, 4.6, 27.4, 27.4, 5.6)],
}

/** The P: stem 9–13.5, bowl centred on (17, 13) with an outer radius of 5. */
export const P_SHAPE: MarkShape = {
  outline: [
    ['M', 9, 24],
    ['L', 9, 8],
    ['L', 17, 8],
    ['A', 17, 13, 5, -90, 90],
    ['L', 13.5, 18],
    ['L', 13.5, 24],
    ['Z'],
  ],
  holes: [
    [
      ['M', 13.5, 11.4],
      ['L', 17, 11.4],
      ['A', 17, 13, 1.6, -90, 90],
      ['L', 13.5, 14.6],
      ['Z'],
    ],
  ],
}

/** The lime full stop. */
export const DOT: MarkShape = { outline: roundRect(18.6, 19.6, 23, 24, 1.1), holes: [] }

const rad = (d: number) => (d * Math.PI) / 180
const f = (n: number) => +n.toFixed(3)

/** SVG path data for one shape (use fill-rule="evenodd"). */
export function segsToPath(segs: Seg[]): string {
  let d = ''
  for (const s of segs) {
    if (s[0] === 'M') d += `M${f(s[1])} ${f(s[2])}`
    else if (s[0] === 'L') d += `L${f(s[1])} ${f(s[2])}`
    else if (s[0] === 'Z') d += 'Z'
    else {
      const [, cx, cy, r, a0, a1] = s
      const sx = cx + r * Math.cos(rad(a0))
      const sy = cy + r * Math.sin(rad(a0))
      const ex = cx + r * Math.cos(rad(a1))
      const ey = cy + r * Math.sin(rad(a1))
      const large = Math.abs(a1 - a0) > 180 ? 1 : 0
      const sweep = a1 > a0 ? 1 : 0
      d += `L${f(sx)} ${f(sy)}A${f(r)} ${f(r)} 0 ${large} ${sweep} ${f(ex)} ${f(ey)}`
    }
  }
  return d
}

export const shapePath = (s: MarkShape) => [s.outline, ...s.holes].map(segsToPath).join('')

export const MARK_PATHS = {
  ring: shapePath(RING),
  p: shapePath(P_SHAPE),
  dot: shapePath(DOT),
  /** the whole tile, for filled app icons */
  tile: segsToPath(roundRect(0, 0, 32, 32, 9)),
}

/** The mark as a standalone SVG string (favicon, icons). `variant` picks the colourway. */
export function markSvg(variant: 'tile' | 'ink' | 'stamp' = 'tile', size = 32): string {
  const v = variant
  const bg = v === 'tile' ? BRAND.violet : v === 'ink' ? BRAND.ink : 'none'
  const fg = v === 'stamp' ? BRAND.violet : BRAND.paper
  const tile = bg === 'none' ? '' : `<path d="${MARK_PATHS.tile}" fill="${bg}"/>`
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="${size}" height="${size}">` +
    tile +
    `<path d="${MARK_PATHS.ring}" fill="${fg}" fill-rule="evenodd" opacity="${v === 'stamp' ? 1 : 0.55}"/>` +
    `<path d="${MARK_PATHS.p}" fill="${fg}" fill-rule="evenodd"/>` +
    `<path d="${MARK_PATHS.dot}" fill="${v === 'stamp' ? BRAND.violet : BRAND.lime}"/>` +
    `</svg>`
  )
}
