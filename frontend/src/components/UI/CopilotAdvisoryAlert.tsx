import { motion } from 'framer-motion'
import { Bell } from 'lucide-react'
import type { DynamicAdvisory } from '@/stores/simulationStore'

type Props = {
  advisory: DynamicAdvisory
  onReview: () => void
  onApply: () => void
  /** comfortable adds slightly more padding (default compact). */
  density?: 'compact' | 'comfortable'
}

/** Phase-2 gap alert — use in Copilot rail and right Copilot column for parity. */
export function CopilotAdvisoryAlert({
  advisory,
  onReview,
  onApply,
  density = 'compact',
}: Props) {
  const compact = density === 'compact'
  const pad = compact ? 'p-2' : 'p-3'
  const iconSize = compact ? 13 : 16
  const bodyCls = compact ? 'text-[10px] leading-snug' : 'text-xs leading-relaxed'
  const boxPad = compact ? 'px-2 py-1.5 mt-1.5' : 'px-2.5 py-2 mt-2'
  const btnPad = compact ? 'py-1.5' : 'py-2'
  const btnRow = compact ? 'mt-2 gap-1.5' : 'mt-2.5 gap-2 sm:gap-2.5'

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-lg ${pad}`}
      style={{
        background: 'rgba(245,158,11,0.12)',
        border: '1px solid rgba(245,158,11,0.48)',
        boxShadow: advisory.unread ? '0 0 0 2px rgba(245,158,11,0.14), var(--shadow-sm)' : 'var(--shadow-sm)',
      }}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-1.5">
        <Bell size={iconSize} style={{ color: 'var(--color-accent-warning)', flexShrink: 0, marginTop: 1 }} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-[8px] uppercase tracking-widest" style={{ color: 'var(--color-accent-warning)' }}>
              {advisory.title}
            </span>
            {advisory.unread && (
              <span
                className="rounded-full px-1.5 py-px font-mono text-[7px] uppercase tracking-widest"
                style={{ color: '#111827', background: 'var(--color-accent-warning)' }}
              >
                New
              </span>
            )}
          </div>
          <p className={`mt-0.5 ${bodyCls}`} style={{ color: 'var(--color-text-secondary)' }}>
            {advisory.message}
          </p>
          <div
            className={`rounded-md ${boxPad}`}
            style={{ background: 'rgba(255,255,255,0.4)', border: '1px solid rgba(245,158,11,0.28)' }}
          >
            <div className={`font-semibold ${compact ? 'text-[11px]' : 'text-xs'}`} style={{ color: 'var(--color-text-primary)' }}>
              {advisory.recommendationName}
            </div>
            <p className={`mt-0.5 ${compact ? 'text-[9px] leading-snug' : 'text-[10px] leading-relaxed'}`} style={{ color: 'var(--color-text-muted)' }}>
              {advisory.recommendationReason}
            </p>
          </div>
        </div>
      </div>
      <div className={`grid grid-cols-2 ${btnRow}`}>
        <button
          type="button"
          onClick={onReview}
          className={`rounded-md px-2 ${btnPad} text-[10px] font-semibold transition-opacity hover:opacity-95`}
          style={{
            color: 'var(--color-accent-cyan)',
            background: 'var(--color-bg-panel)',
            border: '1px solid rgba(var(--rgb-accent), 0.35)',
          }}
        >
          Review
        </button>
        <button
          type="button"
          onClick={onApply}
          className={`rounded-md px-2 ${btnPad} text-[10px] font-semibold transition-opacity hover:opacity-95`}
          style={{
            color: 'var(--color-accent-green)',
            background: 'rgba(0,184,148,0.10)',
            border: '1px solid rgba(0,184,148,0.38)',
          }}
        >
          Apply
        </button>
      </div>
    </motion.div>
  )
}
