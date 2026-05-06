import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useUIStore } from '@/stores/uiStore'
import { useSimulationStore } from '@/stores/simulationStore'

// ── Animated counter ─────────────────────────────────────────────────────────
function useAnimatedValue(target: number, duration = 600) {
  const [display, setDisplay] = useState(target)
  const raf = useRef<number | null>(null)
  const start = useRef<number | null>(null)
  const from = useRef(target)

  useEffect(() => {
    if (from.current === target) return
    const begin = from.current
    start.current = null

    const step = (ts: number) => {
      if (!start.current) start.current = ts
      const progress = Math.min((ts - start.current) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(begin + (target - begin) * eased))
      if (progress < 1) {
        raf.current = requestAnimationFrame(step)
      } else {
        from.current = target
      }
    }

    raf.current = requestAnimationFrame(step)
    return () => { if (raf.current) cancelAnimationFrame(raf.current) }
  }, [target, duration])

  return display
}

interface MetricCardProps {
  label: string
  value: number
  unit: string
  color: string
  delay: number
  formatter?: (v: number) => string
}

function MetricCard({ label, value, unit, color, delay, formatter }: MetricCardProps) {
  const animated = useAnimatedValue(value)
  const display = formatter ? formatter(animated) : String(animated)

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 6, scale: 0.95 }}
      transition={{ duration: 0.35, delay, ease: [0.16, 1, 0.3, 1] }}
      style={{
        width: 86,
        height: 68,
        borderRadius: 10,
        padding: '8px 10px',
        background: 'var(--color-bg-panel)',
        border: '1px solid var(--color-border-subtle)',
        boxShadow: 'var(--shadow-sm)',
        textAlign: 'left',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: 3,
          height: '100%',
          background: color,
          opacity: 0.7,
          borderRadius: '10px 0 0 10px',
        }}
      />

      <div
        style={{
          color: 'var(--color-text-muted)',
          fontSize: 9,
          fontFamily: 'var(--font-mono)',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          marginBottom: 4,
          paddingLeft: 6,
        }}
      >
        {label}
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 2, paddingLeft: 6 }}>
        <motion.span
          key={display}
          initial={{ opacity: 0.5 }}
          animate={{ opacity: 1 }}
          style={{
            fontSize: 20,
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            color,
            letterSpacing: '-0.02em',
            lineHeight: 1,
          }}
        >
          {display}
        </motion.span>
        {unit && (
          <span style={{ fontSize: 10, color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
            {unit}
          </span>
        )}
      </div>
    </motion.div>
  )
}

function compact(value: number) {
  return Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(value)
}

export function MiniMetricsPanel() {
  const metrics = useSimulationStore((state) => state.currentFrame?.metrics_snapshot)
  const openDashboard = useUIStore((state) => state.openDashboard)
  const hasData = !!metrics

  const cards: MetricCardProps[] = [
    {
      label: 'Population',
      value: metrics?.pop_total ?? 0,
      unit: '',
      color: '#ff4757',
      delay: 0,
      formatter: compact,
    },
    {
      label: 'Commute',
      value: Math.round(metrics?.mobility_commute ?? 0),
      unit: 'min',
      color: '#6c5ce7',
      delay: 0.05,
    },
    {
      label: 'Equity',
      value: Math.round(100 - (metrics?.equity_infra_gini ?? 0)),
      unit: '',
      color: '#00b894',
      delay: 0.1,
    },
    {
      label: 'CO₂',
      value: Math.round(metrics?.env_co2_est ?? 0),
      unit: 'kt',
      color: '#e17055',
      delay: 0.15,
    },
  ]

  return (
    <motion.button
      onMouseEnter={openDashboard}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ scale: 1.02 }}
      style={{
        position: 'absolute',
        left: 16,
        top: 72,
        zIndex: 10,
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 7,
        border: 0,
        background: 'transparent',
        padding: 0,
        cursor: 'pointer',
      }}
    >
      <AnimatePresence mode="popLayout">
        {cards.map((card) => (
          <MetricCard key={card.label} {...card} />
        ))}
      </AnimatePresence>

      {/* "Open dashboard" hint */}
      <AnimatePresence>
        {hasData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              gridColumn: '1 / -1',
              textAlign: 'center',
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--color-text-muted)',
              marginTop: 2,
            }}
          >
            Hover to expand
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  )
}
