/**
 * PayFlow's 3D layer — "the press". Loaded lazily (see Scene3D.tsx) so three.js
 * never ships with the app shell.
 *
 * A turntable of example invoices (real totals from calcInvoice) and a rubber
 * stamp whose face is the PayFlow mark. Click/tap the stage and the stamp slams
 * down: the front invoice gets a violet PAID impression, ink flecks fly, and the
 * table turns to the next invoice. Mouse drag spins the table. In `single` mode
 * (brand page, auth panel, 404) there is one sheet and the stamp hovers over it.
 *
 * The stage is driven from the DOM wrapper (pointer events, clicks) so touch
 * scrolling is never captured: the wrapper uses touch-action: pan-y.
 */
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer, RoundedBox } from '@react-three/drei'
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { BRAND, DOT, P_SHAPE, RING, type MarkShape, type Seg } from '../../lib/brandMark'
import { PRESS_QUEUE, type PressInvoice } from '../../lib/showcase'
import { formatMoney } from '../../lib/money'
import { STATUS_META } from '../../lib/status'

export interface PressHandle {
  /** bring the stamp down on the front sheet */
  stamp(): void
  /** add angular velocity to the turntable (radians per second) */
  spin(velocity: number): void
  /** mouse parallax, -1..1 */
  look(x: number, y: number): void
}

export interface PressProps {
  mode?: 'carousel' | 'single'
  compact: boolean
  reduced: boolean
  visible: boolean
  autoplay?: boolean
  onStamp?: (inv: PressInvoice, count: number) => void
  className?: string
}

/* ───────────── geometry from the brand mark ───────────── */

function toPath(segs: Seg[], target: THREE.Path, k: number, mirror: boolean) {
  const sx = mirror ? -1 : 1
  for (const s of segs) {
    if (s[0] === 'M') target.moveTo(sx * (s[1] - 16) * k, -(s[2] - 16) * k)
    else if (s[0] === 'L') target.lineTo(sx * (s[1] - 16) * k, -(s[2] - 16) * k)
    else if (s[0] === 'A') {
      const [, cx, cy, r, a0, a1] = s
      const rad = Math.PI / 180
      // y-down → y-up flips angle sign; mirroring x maps angle θ → π − θ
      const start = mirror ? Math.PI + a0 * rad : -a0 * rad
      const end = mirror ? Math.PI + a1 * rad : -a1 * rad
      target.absarc(sx * (cx - 16) * k, -(cy - 16) * k, r * k, start, end, !mirror)
    }
  }
}

function markShape(m: MarkShape, k: number, mirror: boolean) {
  const shape = new THREE.Shape()
  toPath(m.outline, shape, k, mirror)
  for (const h of m.holes) {
    const p = new THREE.Path()
    toPath(h, p, k, mirror)
    shape.holes.push(p)
  }
  return shape
}

/** The mark extruded, mirrored like a real stamp face (so its impression reads correctly). */
function useStampFace(size: number) {
  return useMemo(() => {
    const k = size / 32
    const opts = { depth: 0.07, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.008, bevelSegments: 2, curveSegments: 12 }
    const g = new THREE.ExtrudeGeometry([markShape(RING, k, true), markShape(P_SHAPE, k, true), markShape(DOT, k, true)], opts)
    return g
  }, [size])
}

/** The mark lying face-up on the table centre (not mirrored). */
function useHub(size: number) {
  return useMemo(() => {
    const k = size / 32
    const opts = { depth: 0.06, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.01, bevelSegments: 2, curveSegments: 12 }
    return {
      body: new THREE.ExtrudeGeometry([markShape(RING, k, false), markShape(P_SHAPE, k, false)], opts),
      dot: new THREE.ExtrudeGeometry([markShape(DOT, k, false)], opts),
    }
  }, [size])
}

/* ───────────── canvas textures ───────────── */

const fontsReady = () => (typeof document !== 'undefined' && document.fonts ? document.fonts.ready : Promise.resolve())

function setFont(ctx: CanvasRenderingContext2D, weight: number, px: number, family: 'sans' | 'mono', stretch: 'normal' | 'expanded' | 'condensed' = 'normal') {
  const fam = family === 'mono' ? '"IBM Plex Mono", ui-monospace, monospace' : '"Archivo Variable", system-ui, sans-serif'
  ctx.font = `${weight} ${px}px ${fam}`
  const c = ctx as CanvasRenderingContext2D & { fontStretch?: string }
  if ('fontStretch' in c) c.fontStretch = stretch === 'expanded' ? 'expanded' : stretch === 'condensed' ? 'ultra-condensed' : 'normal'
}

const TONE: Record<string, string> = { accent: BRAND.violet, warning: '#a35d06', danger: '#d23a2c', success: '#0b8457', muted: '#5f5f69' }

function invoiceTexture(inv: PressInvoice, aniso: number) {
  const W = 512
  const H = 724
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const x = c.getContext('2d')!
  x.fillStyle = '#ffffff'
  x.fillRect(0, 0, W, H)
  // header band
  x.fillStyle = BRAND.ink
  setFont(x, 800, 58, 'sans', 'expanded')
  x.fillText('Invoice', 40, 104)
  setFont(x, 500, 19, 'mono')
  x.fillStyle = '#5f5f69'
  x.fillText(`${inv.no}  ·  ${inv.client}`, 42, 142)
  // status chip
  const meta = STATUS_META[inv.status]
  setFont(x, 700, 18, 'sans')
  const label = meta.label.toUpperCase()
  const tw = x.measureText(label).width + 28
  x.fillStyle = TONE[meta.tone]
  x.beginPath()
  x.roundRect(W - 40 - tw, 62, tw, 34, 17)
  x.fill()
  x.fillStyle = '#ffffff'
  x.fillText(label, W - 40 - tw + 14, 85)
  // rule
  x.fillStyle = BRAND.ink
  x.fillRect(40, 182, W - 80, 3)
  setFont(x, 500, 16, 'mono')
  x.fillStyle = '#5f5f69'
  x.fillText('ITEM', 40, 214)
  x.textAlign = 'right'
  x.fillText('AMOUNT', W - 40, 214)
  // line items
  let y = 262
  for (const it of inv.items) {
    x.textAlign = 'left'
    setFont(x, 500, 21, 'sans')
    x.fillStyle = '#34343c'
    const desc = it.description.length > 26 ? it.description.slice(0, 25) + '…' : it.description
    x.fillText(desc, 40, y)
    x.textAlign = 'right'
    setFont(x, 500, 20, 'mono')
    x.fillStyle = BRAND.ink
    x.fillText(formatMoney(Math.round((it.quantityMilli * it.unitPrice) / 1000), 'INR'), W - 40, y)
    x.fillStyle = '#e5e5e0'
    x.fillRect(40, y + 20, W - 80, 2)
    y += 58
  }
  // ghost lines for texture
  x.fillStyle = '#ececE8'
  for (let i = 0; i < 3 - Math.min(3, inv.items.length - 1); i++) {
    x.fillRect(40, y - 14, 180 + i * 40, 10)
    y += 40
  }
  // total
  x.fillStyle = BRAND.ink
  x.fillRect(40, H - 196, W - 80, 3)
  x.textAlign = 'left'
  setFont(x, 600, 22, 'sans')
  x.fillText('Total due', 40, H - 150)
  x.textAlign = 'right'
  setFont(x, 800, 46, 'sans', 'expanded')
  x.fillText(formatMoney(inv.total, 'INR'), W - 40, H - 104)
  // perforation + footer
  x.textAlign = 'left'
  x.fillStyle = '#d9d9d3'
  for (let i = 0; i < W; i += 16) x.fillRect(i, H - 56, 8, 2)
  setFont(x, 500, 15, 'mono')
  x.fillStyle = '#8a8a93'
  x.fillText('EXAMPLE INVOICE · PAYFLOW', 40, H - 22)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = aniso
  return t
}

function paidTexture() {
  const W = 512
  const H = 256
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const x = c.getContext('2d')!
  x.strokeStyle = BRAND.violet
  x.fillStyle = BRAND.violet
  x.lineWidth = 14
  x.beginPath()
  x.roundRect(14, 14, W - 28, H - 28, 26)
  x.stroke()
  x.lineWidth = 4
  x.beginPath()
  x.roundRect(36, 36, W - 72, H - 72, 14)
  x.stroke()
  setFont(x, 900, 128, 'sans', 'expanded')
  x.textAlign = 'center'
  x.textBaseline = 'middle'
  x.fillText('PAID', W / 2, H / 2 - 8)
  setFont(x, 500, 22, 'mono')
  x.fillText('IN FULL · PAYFLOW', W / 2, H - 62)
  // ink wear: knock out speckles so the impression looks pressed, not printed
  x.globalCompositeOperation = 'destination-out'
  let seed = 7
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  for (let i = 0; i < 900; i++) {
    x.globalAlpha = 0.3 + rnd() * 0.7
    x.beginPath()
    x.arc(rnd() * W, rnd() * H, rnd() * 2.6, 0, Math.PI * 2)
    x.fill()
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

/* ───────────── scene pieces ───────────── */

const SHEET_W = 1.42
const SHEET_H = SHEET_W * (724 / 512)
const TABLE_Y = 0.16

function Lights({ compact }: { compact: boolean }) {
  return (
    <>
      <ambientLight intensity={0.8} />
      <directionalLight position={[3, 9, 6]} intensity={1.7} />
      <directionalLight position={[-6, 4, -3]} intensity={0.5} color="#c9bfff" />
      {!compact && <pointLight position={[0, 2.4, 4]} intensity={6} distance={7} color="#d4ff3a" />}
      <Environment resolution={compact ? 64 : 128}>
        <Lightformer form="rect" intensity={2.4} position={[0, 5, 2]} scale={[8, 3, 1]} rotation-x={Math.PI / 2} />
        <Lightformer form="rect" intensity={1.4} color="#b3a6ff" position={[-5, 1, 1]} scale={[3, 6, 1]} rotation-y={Math.PI / 2} />
        <Lightformer form="ring" intensity={1.6} color="#d4ff3a" position={[5, 2, -2]} scale={2} rotation-y={-Math.PI / 2} />
      </Environment>
    </>
  )
}

function Stamp({ group }: { group: React.RefObject<THREE.Group | null> }) {
  const face = useStampFace(1.02)
  return (
    <group ref={group}>
      {/* knob */}
      <mesh position={[0, 1.18, 0]}>
        <sphereGeometry args={[0.34, 40, 28]} />
        <meshStandardMaterial color={BRAND.ink} metalness={0.35} roughness={0.22} />
      </mesh>
      <mesh position={[0, 1.02, 0]} rotation-x={Math.PI / 2}>
        <torusGeometry args={[0.27, 0.045, 14, 40]} />
        <meshStandardMaterial color={BRAND.lime} roughness={0.35} emissive={BRAND.lime} emissiveIntensity={0.25} />
      </mesh>
      {/* neck */}
      <mesh position={[0, 0.66, 0]}>
        <cylinderGeometry args={[0.13, 0.2, 0.62, 32]} />
        <meshStandardMaterial color={BRAND.ink} metalness={0.35} roughness={0.25} />
      </mesh>
      {/* mount block */}
      <RoundedBox args={[1.32, 0.3, 1.32]} radius={0.08} smoothness={3} position={[0, 0.27, 0]}>
        <meshStandardMaterial color="#1c1c24" metalness={0.25} roughness={0.35} />
      </RoundedBox>
      {/* violet rubber */}
      <RoundedBox args={[1.22, 0.14, 1.22]} radius={0.04} smoothness={2} position={[0, 0.06, 0]}>
        <meshStandardMaterial color={BRAND.violet} roughness={0.55} />
      </RoundedBox>
      {/* the face: the mark, mirrored, pointing down */}
      <mesh geometry={face} rotation-x={Math.PI / 2} position={[0, -0.01, 0]}>
        <meshStandardMaterial color={BRAND.violetDeep} roughness={0.6} />
      </mesh>
    </group>
  )
}

interface SheetState {
  stampedAt: number
  cleared: boolean
}

const PRESS_SPRING = { k: 520, c: 26 }

const PressScene = forwardRef<PressHandle, Omit<PressProps, 'className' | 'visible'>>(function PressScene(
  { mode = 'carousel', compact, reduced, autoplay = true, onStamp },
  ref,
) {
  const single = mode === 'single'
  const queue = useMemo(() => (single ? PRESS_QUEUE.slice(0, 1) : PRESS_QUEUE.slice(0, compact ? 5 : 8)), [single, compact])
  const N = queue.length
  const step = (Math.PI * 2) / Math.max(N, 1)
  const R = single ? 0 : N > 5 ? 3.4 : 2.7

  const { gl, camera, size } = useThree()
  const [textures, setTextures] = useState<THREE.CanvasTexture[] | null>(null)
  const paid = useMemo(() => paidTexture(), [])
  const hub = useHub(single ? 1 : R * 0.95)

  useEffect(() => {
    let live = true
    const aniso = Math.min(8, gl.capabilities.getMaxAnisotropy())
    fontsReady().then(() => {
      if (!live) return
      setTextures(queue.map((inv) => invoiceTexture(inv, aniso)))
    })
    return () => {
      live = false
    }
  }, [queue, gl])
  useEffect(() => () => textures?.forEach((t) => t.dispose()), [textures])
  useEffect(() => () => paid.dispose(), [paid])

  const table = useRef<THREE.Group>(null)
  const hubRef = useRef<THREE.Group>(null)
  const stamp = useRef<THREE.Group>(null)
  const shadow = useRef<THREE.Mesh>(null)
  const decals = useRef<(THREE.Mesh | null)[]>([])
  const sheets = useRef<SheetState[]>(queue.map(() => ({ stampedAt: -1, cleared: true })))
  useEffect(() => {
    sheets.current = queue.map(() => ({ stampedAt: -1, cleared: true }))
  }, [queue])

  const HOVER = single ? 1.3 : 1.75
  const CONTACT = TABLE_Y + 0.08
  // where the stamp waits between presses: off to the side so the invoice stays readable
  const PARK_X = single ? 0 : 1.75
  const PARK_Z = single ? 0 : R - 0.55
  const s = useRef({
    angle: 0,
    target: 0,
    vel: 0,
    dragVel: 0,
    y: HOVER,
    yv: 0,
    x: single ? 0 : PARK_X,
    xv: 0,
    z: PARK_Z,
    zv: 0,
    phase: 'idle' as 'idle' | 'down' | 'hold' | 'up',
    phaseT: 0,
    squash: 0,
    lastInteract: 0,
    count: 0,
    lookX: 0,
    lookY: 0,
    t: 0,
  })

  // ink flecks
  const FLECKS = compact ? 16 : 36
  const flecks = useRef<THREE.InstancedMesh>(null)
  const fleck = useRef(Array.from({ length: FLECKS }, () => ({ p: new THREE.Vector3(), v: new THREE.Vector3(), life: 0, r: 0, rv: 0 })))
  useEffect(() => {
    const m = flecks.current
    if (!m) return
    const cols = [BRAND.lime, BRAND.violet, BRAND.ink, BRAND.violetOnInk]
    const col = new THREE.Color()
    for (let i = 0; i < FLECKS; i++) m.setColorAt(i, col.set(cols[i % cols.length]))
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  }, [FLECKS])

  const frontIndex = () => {
    const i = Math.round(-s.current.angle / step)
    return ((i % N) + N) % N
  }

  useImperativeHandle(ref, () => ({
    stamp() {
      const st = s.current
      st.lastInteract = st.t
      if (st.phase !== 'idle') return
      st.phase = 'down'
      st.phaseT = st.t
    },
    spin(v: number) {
      if (single) return
      const st = s.current
      st.lastInteract = st.t
      st.dragVel = v
    },
    look(x: number, y: number) {
      s.current.lookX = x
      s.current.lookY = y
    },
  }))

  const dummy = useMemo(() => new THREE.Object3D(), [])

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 1 / 30)
    const st = s.current
    st.t += dt

    // autoplay: stamp the next invoice after a pause
    if (autoplay && !reduced && st.phase === 'idle' && st.t - st.lastInteract > (single ? 2.6 : 3.2) && Math.abs(st.angle - st.target) < 0.01) {
      st.phase = 'down'
      st.phaseT = st.t
      st.lastInteract = st.t
    }

    // turntable: free spin while flung, otherwise spring to target
    if (!single) {
      if (Math.abs(st.dragVel) > 0.01) {
        st.angle += st.dragVel * dt
        st.dragVel *= Math.pow(0.04, dt)
        st.target = Math.round(st.angle / step) * step
      } else {
        const k = reduced ? 400 : 90
        const c = reduced ? 40 : 15
        st.vel += (k * (st.target - st.angle) - c * st.vel) * dt
        st.angle += st.vel * dt
      }
      if (table.current) table.current.rotation.y = st.angle
      if (hubRef.current) hubRef.current.rotation.z = st.angle
    }

    // stamp state machine
    const press = PRESS_SPRING
    const pressing = st.phase === 'down' || st.phase === 'hold'
    const narrow = size.width / Math.max(1, size.height) < 0.8
    const xTarget = pressing ? 0 : narrow && !single ? 1.05 : PARK_X
    const zTarget = pressing ? R : narrow && !single ? R - 2.1 : PARK_Z
    const kx = reduced ? 0 : 200
    if (reduced) {
      st.x += (xTarget - st.x) * Math.min(1, dt * 18)
      st.z += (zTarget - st.z) * Math.min(1, dt * 18)
    } else {
      st.xv += (kx * (xTarget - st.x) - 22 * st.xv) * dt
      st.x += st.xv * dt
      st.zv += (kx * (zTarget - st.z) - 22 * st.zv) * dt
      st.z += st.zv * dt
    }
    const over = Math.hypot(st.x, st.z - R) < 0.06
    let yTarget = HOVER
    if (st.phase === 'down') yTarget = over ? CONTACT - 0.04 : HOVER + 0.25
    if (st.phase === 'hold') yTarget = CONTACT
    if (reduced) {
      st.y += (yTarget - st.y) * Math.min(1, dt * 18)
    } else {
      st.yv += (press.k * (yTarget - st.y) - press.c * st.yv) * dt
      st.y += st.yv * dt
    }
    if (st.phase === 'down' && over && st.y <= CONTACT + 0.01) {
      // impact
      st.y = CONTACT
      st.yv = 0
      st.phase = 'hold'
      st.phaseT = st.t
      st.squash = 1
      const fi = frontIndex()
      const sh = sheets.current[fi]
      if (sh) {
        sh.stampedAt = st.t
        sh.cleared = false
      }
      st.count += 1
      onStamp?.(queue[fi], st.count)
      if (!reduced) {
        fleck.current.forEach((f) => {
          const a = Math.random() * Math.PI * 2
          const sp = 1.6 + Math.random() * 2.6
          f.p.set(0, CONTACT + 0.05, R)
          f.v.set(Math.cos(a) * sp, 2.2 + Math.random() * 3.2, Math.sin(a) * sp * 0.8)
          f.life = 1
          f.r = Math.random() * Math.PI
          f.rv = (Math.random() - 0.5) * 18
        })
      }
    }
    if (st.phase === 'hold' && st.t - st.phaseT > (reduced ? 0.4 : 0.16)) {
      st.phase = 'up'
      st.phaseT = st.t
    }
    if (st.phase === 'up' && st.y > HOVER - 0.25) {
      st.phase = 'idle'
      if (!single) st.target -= step // bring the next invoice round
    }
    st.squash = Math.max(0, st.squash - dt * 5)

    const g = stamp.current
    if (g) {
      const bob = reduced || st.phase !== 'idle' ? 0 : Math.sin(st.t * 1.6) * 0.06
      g.position.set(st.x, st.y + bob, st.z)
      g.rotation.x = reduced ? 0 : -st.zv * 0.02
      g.rotation.z = reduced ? 0 : st.xv * 0.03
      const sq = st.squash * 0.12
      g.scale.set(1 + sq, 1 - sq, 1 + sq)
      g.rotation.y = reduced ? 0 : Math.sin(st.t * 0.5) * 0.12 + st.lookX * 0.25
    }
    if (shadow.current) {
      const h = Math.max(0, st.y - CONTACT)
      const m = shadow.current.material as THREE.MeshBasicMaterial
      m.opacity = 0.42 - Math.min(0.3, h * 0.2)
      const sc = 1 + h * 0.35
      shadow.current.scale.set(sc, sc, 1)
      shadow.current.position.set(st.x, TABLE_Y + 0.01 + (pressing ? 0.004 : 0), st.z)
    }

    // decals: punch in on impact, fade when the sheet rotates round the back
    for (let i = 0; i < N; i++) {
      const d = decals.current[i]
      const sh = sheets.current[i]
      if (!d || !sh) continue
      const world = (((i * step + st.angle) % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2) - Math.PI
      if (!single && !sh.cleared && Math.abs(world) > 2.4) sh.cleared = true
      if (single && !sh.cleared && st.t - sh.stampedAt > 2.2) sh.cleared = true
      const mat = d.material as THREE.MeshBasicMaterial
      if (sh.stampedAt < 0 || (sh.cleared && mat.opacity < 0.01)) {
        d.visible = false
        continue
      }
      d.visible = true
      const age = st.t - sh.stampedAt
      const target = sh.cleared ? 0 : 0.92
      mat.opacity += (target - mat.opacity) * Math.min(1, dt * (sh.cleared ? 4 : 30))
      const pop = reduced ? 1 : 1 + Math.max(0, 0.5 - age * 3) * Math.cos(age * 30) * 0.4
      d.scale.setScalar(pop)
    }

    // flecks
    const fm = flecks.current
    if (fm) {
      let any = false
      fleck.current.forEach((f, i) => {
        if (f.life > 0) {
          any = true
          f.life -= dt * 0.9
          f.v.y -= 9.8 * dt
          f.p.addScaledVector(f.v, dt)
          if (f.p.y < TABLE_Y + 0.02) {
            f.p.y = TABLE_Y + 0.02
            f.v.multiplyScalar(0.3)
          }
          f.r += f.rv * dt
        }
        dummy.position.copy(f.p)
        dummy.rotation.set(f.r, f.r * 0.7, 0)
        dummy.scale.setScalar(f.life > 0 ? Math.min(1, f.life * 2) : 0)
        dummy.updateMatrix()
        fm.setMatrixAt(i, dummy.matrix)
      })
      fm.instanceMatrix.needsUpdate = true
      fm.visible = any
    }

    // camera: framed by aspect, gentle pointer parallax on desktop
    const aspect = size.width / Math.max(1, size.height)
    const far = single ? (aspect < 1 ? 7.6 : 6.4) : R + (aspect < 0.8 ? 8.4 : aspect < 1.2 ? 6.8 : 5.6)
    const tx = compact || reduced ? 0 : st.lookX * 0.7
    const ty = (single ? 3.6 : aspect < 0.8 ? 6.4 : 5.3) + (compact || reduced ? 0 : -st.lookY * 0.4)
    camera.position.x += (tx - camera.position.x) * Math.min(1, dt * 3)
    camera.position.y += (ty - camera.position.y) * Math.min(1, dt * 3)
    camera.position.z += (far - camera.position.z) * Math.min(1, dt * 3)
    camera.lookAt(0, single ? 0.95 : 0.75, single ? 0 : R - 1.3)
  })

  return (
    <>
      <Lights compact={compact} />
      {/* turntable */}
      {!single && (
        <group>
          <mesh position={[0, 0, 0]}>
            <cylinderGeometry args={[R + 1.05, R + 1.15, 0.3, 96]} />
            <meshStandardMaterial color="#14141a" metalness={0.4} roughness={0.32} />
          </mesh>
          <mesh position={[0, 0.152, 0]} rotation-x={-Math.PI / 2}>
            <ringGeometry args={[R + 0.9, R + 1.0, 128]} />
            <meshBasicMaterial color={BRAND.violet} />
          </mesh>
        </group>
      )}
      {!single && (
        <group ref={hubRef} position={[0, 0.15, 0]} rotation-x={-Math.PI / 2}>
          <mesh geometry={hub.body}>
            <meshStandardMaterial color={BRAND.violet} roughness={0.35} metalness={0.2} emissive={BRAND.violet} emissiveIntensity={0.25} />
          </mesh>
          <mesh geometry={hub.dot}>
            <meshStandardMaterial color={BRAND.lime} roughness={0.3} emissive={BRAND.lime} emissiveIntensity={0.5} />
          </mesh>
        </group>
      )}
      {single && (
        <RoundedBox args={[2.3, 0.3, 2.9]} radius={0.08} smoothness={3} position={[0, 0, 0]}>
          <meshStandardMaterial color="#14141a" metalness={0.4} roughness={0.32} />
        </RoundedBox>
      )}

      <group ref={table}>
        {queue.map((inv, i) => {
          const a = i * step
          return (
            <group key={inv.no} position={[Math.sin(a) * R, TABLE_Y + 0.004 + (i % 2) * 0.002, Math.cos(a) * R]} rotation-y={a}>
              <mesh rotation-x={-Math.PI / 2}>
                <planeGeometry args={[SHEET_W, SHEET_H]} />
                {/* paper is unlit and untonemapped so the invoice stays crisp and white */}
                {textures ? <meshBasicMaterial key="tex" map={textures[i]} toneMapped={false} /> : <meshBasicMaterial key="plain" color="#f4f4f1" toneMapped={false} />}
              </mesh>
              <mesh
                ref={(m) => {
                  decals.current[i] = m
                }}
                rotation={[-Math.PI / 2, 0, 0.22]}
                position={[0.02, 0.004, -0.08]}
                visible={false}
              >
                <planeGeometry args={[1.15, 0.575]} />
                <meshBasicMaterial map={paid} transparent opacity={0} depthWrite={false} />
              </mesh>
            </group>
          )
        })}
      </group>

      {/* soft blob shadow under the stamp */}
      <mesh ref={shadow} position={[PARK_X, TABLE_Y + 0.01, PARK_Z]} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[0.85, 40]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.4} depthWrite={false} />
      </mesh>

      <Stamp group={stamp} />

      <instancedMesh ref={flecks} args={[undefined, undefined, FLECKS]} frustumCulled={false}>
        <boxGeometry args={[0.07, 0.07, 0.012]} />
        <meshStandardMaterial roughness={0.5} />
      </instancedMesh>
    </>
  )
})

/* ───────────── the DOM stage ───────────── */

/**
 * The canvas plus its DOM interaction layer. Click/tap = stamp; mouse/pen drag
 * = spin (touch never drags, so the page always scrolls); Enter/Space = stamp.
 */
export function PressStage({ className = '', visible, ...props }: PressProps) {
  const handle = useRef<PressHandle>(null)
  const drag = useRef<{ x: number; t: number; moved: number; v: number } | null>(null)
  const lastType = useRef('mouse')
  const { compact } = props

  return (
    <div
      className={`relative h-full w-full cursor-pointer select-none outline-none ${className}`}
      style={{ touchAction: 'pan-y' }}
      role="button"
      tabIndex={0}
      aria-label={props.mode === 'single' ? 'PayFlow stamp. Press to stamp the invoice paid.' : 'Example invoices on a press. Press to stamp the front invoice paid; drag with a mouse to spin the table.'}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handle.current?.stamp()
        }
        if (e.key === 'ArrowLeft') handle.current?.spin(-4)
        if (e.key === 'ArrowRight') handle.current?.spin(4)
      }}
      onClick={() => {
        // taps (never scrolls) stamp on touch screens; mouse/pen are handled on pointerup
        if (lastType.current === 'touch') handle.current?.stamp()
      }}
      onPointerDown={(e) => {
        lastType.current = e.pointerType
        if (e.pointerType === 'touch') return
        drag.current = { x: e.clientX, t: performance.now(), moved: 0, v: 0 }
        e.currentTarget.setPointerCapture(e.pointerId)
      }}
      onPointerMove={(e) => {
        if (e.pointerType === 'mouse' && !compact) {
          const r = e.currentTarget.getBoundingClientRect()
          handle.current?.look(((e.clientX - r.left) / r.width) * 2 - 1, ((e.clientY - r.top) / r.height) * 2 - 1)
        }
        const d = drag.current
        if (!d) return
        const now = performance.now()
        const dx = e.clientX - d.x
        d.moved += Math.abs(dx)
        d.v = (dx / Math.max(1, now - d.t)) * 1000 * 0.012
        d.x = e.clientX
        d.t = now
        if (d.moved > 6) handle.current?.spin(d.v)
      }}
      onPointerUp={(e) => {
        const d = drag.current
        drag.current = null
        if (e.pointerType === 'touch') return
        if (!d || d.moved <= 6) handle.current?.stamp()
        else handle.current?.spin(d.v)
      }}
      onPointerLeave={() => handle.current?.look(0, 0)}
    >
      <Canvas
        frameloop={visible ? 'always' : 'never'}
        dpr={compact ? [1, 1.4] : [1, 2]}
        camera={{ position: [0, 5, 9], fov: 34 }}
        gl={{ antialias: !compact, alpha: true, powerPreference: 'high-performance' }}
        style={{ pointerEvents: 'none' }}
      >
        <PressScene ref={handle} {...props} />
      </Canvas>
    </div>
  )
}
