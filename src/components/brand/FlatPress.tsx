import { formatMoney } from '../../lib/money'
import { PRESS_QUEUE } from '../../lib/showcase'
import { LogoMark } from '../layout/Logo'

/**
 * The flat stand-in for the 3D press: shown while three.js loads, when WebGL
 * is missing, or if the GPU context is lost. Same story — an example invoice
 * on the ink press bed, stamped PAID.
 */
export function FlatPress({ single = false }: { single?: boolean }) {
  const inv = PRESS_QUEUE[0]
  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden" aria-hidden>
      {!single && (
        <>
          <div className="absolute h-[62%] w-[min(44%,260px)] -translate-x-[58%] rotate-[-9deg] rounded-[3px] bg-white/90 shadow-[var(--shadow-doc)]" />
          <div className="absolute h-[62%] w-[min(44%,260px)] translate-x-[58%] rotate-[8deg] rounded-[3px] bg-white/90 shadow-[var(--shadow-doc)]" />
        </>
      )}
      <div className="relative flex aspect-[512/724] h-[72%] max-h-[420px] flex-col rounded-[3px] bg-white p-[6%] text-ink shadow-[var(--shadow-doc)]">
        <p className="pf-wordmark text-[clamp(1rem,2.6vw,1.75rem)]">Invoice</p>
        <p className="mt-1 font-mono text-[9px] text-muted">{inv.no} · {inv.client}</p>
        <div className="mt-[10%] h-[2px] bg-ink" />
        {inv.items.map((it) => (
          <div key={it.description} className="flex justify-between gap-2 border-b border-line py-[4%] text-[10px]">
            <span className="truncate text-ink-2">{it.description}</span>
          </div>
        ))}
        <div className="mt-auto h-[2px] bg-ink" />
        <p className="num pf-wordmark mt-2 text-right text-[clamp(0.9rem,2vw,1.4rem)]">{formatMoney(inv.total, 'INR')}</p>
        <div className="pf-stamp absolute left-[12%] top-[46%] rotate-[-12deg] px-3 py-1.5 text-center text-accent">
          <span className="block text-[clamp(1.2rem,3vw,2rem)] font-black leading-none tracking-[0.06em]">PAID</span>
          <span className="block font-mono text-[8px] tracking-[0.14em]">IN FULL · PAYFLOW</span>
        </div>
      </div>
      {single && <LogoMark variant="stamp" className="absolute bottom-[6%] right-[8%] size-10 opacity-70" />}
    </div>
  )
}
