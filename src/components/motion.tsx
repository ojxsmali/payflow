/**
 * Motion primitives shared by the landing page, brand kit and app.
 * Everything here honours prefers-reduced-motion through <MotionConfig reducedMotion="user">
 * (set in App.tsx) — transforms are skipped, opacity still fades.
 */
import { motion, useDragControls, useMotionValue, useSpring, useTransform } from 'motion/react'
import type { ReactNode } from 'react'

/** Buttons that lean toward a mouse cursor. Touch and pen never move them. */
export function Magnetic({ children, strength = 0.3, className = 'inline-flex' }: { children: ReactNode; strength?: number; className?: string }) {
  const x = useSpring(0, { stiffness: 300, damping: 20 })
  const y = useSpring(0, { stiffness: 300, damping: 20 })
  return (
    <motion.div
      className={className}
      style={{ x, y }}
      onPointerMove={(e) => {
        if (e.pointerType !== 'mouse') return
        const r = e.currentTarget.getBoundingClientRect()
        x.set((e.clientX - r.left - r.width / 2) * strength)
        y.set((e.clientY - r.top - r.height / 2) * strength)
      }}
      onPointerLeave={() => {
        x.set(0)
        y.set(0)
      }}
    >
      {children}
    </motion.div>
  )
}

export function Reveal({ children, className = '', delay = 0, y = 28 }: { children: ReactNode; className?: string; delay?: number; y?: number }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -10% 0px' }}
      transition={{ duration: 0.8, delay: delay / 1000, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  )
}

/** One word of a headline rising out of a mask. */
export function Word({ children, delay }: { children: ReactNode; delay: number }) {
  return (
    <span className="-mb-[0.14em] inline-block overflow-hidden pb-[0.14em] align-top">
      <motion.span className="inline-block" initial={{ y: '110%', rotate: 4 }} animate={{ y: 0, rotate: 0 }} transition={{ delay, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}>
        {children}
      </motion.span>
    </span>
  )
}

/**
 * A card you can grab with a mouse and throw — it springs back and tilts with
 * the throw. Touch never starts a drag (pages must scroll on phones), but taps
 * still get the press squash.
 */
export function PullCard({ children, className = '', tilt = 8 }: { children: ReactNode; className?: string; tilt?: number }) {
  const controls = useDragControls()
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-240, 240], [-tilt, tilt])
  return (
    <motion.div
      drag
      dragControls={controls}
      dragListener={false}
      dragSnapToOrigin
      dragElastic={0.55}
      dragTransition={{ bounceStiffness: 420, bounceDamping: 14 }}
      onPointerDown={(e) => {
        if (e.pointerType === 'mouse') controls.start(e)
      }}
      whileDrag={{ scale: 1.04, zIndex: 20, cursor: 'grabbing' }}
      whileTap={{ scale: 0.98 }}
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 420, damping: 24 }}
      style={{ x, rotate, touchAction: 'pan-y' }}
      className={`relative [@media(pointer:fine)]:cursor-grab ${className}`}
    >
      {children}
    </motion.div>
  )
}
