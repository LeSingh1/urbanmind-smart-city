import { forwardRef, useEffect, useRef, useState, type Ref } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useUIStore } from '@/stores/uiStore'
import { useSimulationStore } from '@/stores/simulationStore'
import { useScenarioStore } from '@/stores/scenarioStore'
import type { ScenarioId } from '@/types/city.types'

// Scenario tilts on the live tiles — multipliers applied to the four headline
// metrics so the cards visibly shift when the planner changes lens, even
// before applying the full plan.
const SCENARIO_TILT: Record<ScenarioId, { commute: number; equity: number; co2: number }> = {
  balanced:          { commute: 1.00, equity: 1.00, co2: 1.00 },
  transit_first:     { commute: 0.78, equity: 1.04, co2: 0.82 },
  climate_resilient: { commute: 0.92, equity: 1.02, co2: 0.65 },
  equity_focused:    { commute: 0.95, equity: 1.18, co2: 0.95 },
  emergency_ready:   { commute: 0.97, equity: 1.10, co2: 1.02 },
  max_growth:        { commute: 1.18, equity: 0.92, co2: 1.22 },
}

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
  /** Set true on the apply-plan flip so the card glows once and a delta pill floats. */
  celebrate?: boolean
  /** Numeric delta to show in the floating pill (positive = green up arrow). */
  delta?: number
}

const MetricCard = forwardRef(function MetricCard(
  { label, value, unit, color, delay, formatter, celebrate, delta }: MetricCardProps,
  ref: Ref<HTMLDivElement>,
) {
  const animated = useAnimatedValue(value)
  const display = formatter ? formatter(animated) : String(animated)
  const showDelta = celebrate && typeof delta === 'number' && Math.abs(delta) >= 1

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 12, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 6, scale: 0.95 }}
      transition={{ duration: 0.35, delay, ease: [0.16, 1, 0.3, 1] }}
      className={celebrate ? 'metric-glow' : undefined}
      style={{
        width: 104,
        height: 68,
        borderRadius: 10,
        padding: '8px 10px',
        background: 'var(--color-bg-panel)',
        border: '1px solid var(--color-border-subtle)',
        boxShadow: 'var(--shadow-sm)',
        textAlign: 'left',
        position: 'relative',
        overflow: 'visible',
      }}
    >
      {showDelta && (
        <span
          className="metric-delta-pill"
          style={{
            position: 'absolute',
            top: 4,
            right: 6,
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            fontWeight: 700,
            color: delta! > 0 ? '#10b981' : '#ef4444',
            background: delta! > 0 ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
            border: `1px solid ${delta! > 0 ? 'rgba(16,185,129,0.40)' : 'rgba(239,68,68,0.40)'}`,
            borderRadius: 999,
            padding: '1px 6px',
            zIndex: 2,
          }}
        >
          {delta! > 0 ? '+' : ''}{Math.round(delta!)}
        </span>
      )}
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

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, paddingLeft: 6, whiteSpace: 'nowrap' }}>
        <motion.span
          key={display}
          initial={{ opacity: 0.5 }}
          animate={{ opacity: 1 }}
          style={{
            fontSize: 18,
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            color,
            letterSpacing: '-0.02em',
            lineHeight: 1,
            fontVariantNumeric: 'tabular-nums',
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
})

function compact(value: number) {
  return Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(value)
}

export function MiniMetricsPanel() {
  const metrics = useSimulationStore((state) => state.currentFrame?.metrics_snapshot)
  const planning = useSimulationStore((state) => state.planning)
  const openDashboard = useUIStore((state) => state.openDashboard)
  const activeScenario = useScenarioStore((state) => state.activeScenario)
  const hasData = !!metrics
  const tilt = SCENARIO_TILT[activeScenario] ?? SCENARIO_TILT.balanced

  // Celebrate window: 2 seconds after the apply-plan flip. Triggers per-card
  // glow + delta pill float once. Reset on un-apply or scenario change.
  const [celebrateUntil, setCelebrateUntil] = useState(0)
  const wasApplied = useRef(planning.hasAppliedAIPlan)
  useEffect(() => {
    if (planning.hasAppliedAIPlan && !wasApplied.current) {
      setCelebrateUntil(Date.now() + 2000)
    }
    wasApplied.current = planning.hasAppliedAIPlan
  }, [planning.hasAppliedAIPlan])
  const [, force] = useState(0)
  useEffect(() => {
    if (celebrateUntil <= Date.now()) return
    const t = setTimeout(() => force((n) => n + 1), celebrateUntil - Date.now())
    return () => clearTimeout(t)
  }, [celebrateUntil])
  const celebrating = Date.now() < celebrateUntil

  const before = planning.beforeScores
  const after = planning.afterScores ?? before
  const commuteDelta = before && after ? Math.round((before.averageCommute - after.averageCommute) * tilt.commute) : 0
  const equityDelta = before && after ? Math.round((after.equityScore - before.equityScore) * tilt.equity) : 0
  const co2Delta = before && after ? Math.round((before.co2Estimate - after.co2Estimate) * (1 / tilt.co2 - 0)) : 0

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
      value: Math.round((metrics?.mobility_commute ?? 0) * tilt.commute),
      unit: 'min',
      color: '#6c5ce7',
      delay: 0.05,
      celebrate: celebrating && commuteDelta !== 0,
      delta: commuteDelta,
    },
    {
      label: 'Equity',
      value: Math.min(100, Math.round((100 - (metrics?.equity_infra_gini ?? 0)) * tilt.equity)),
      unit: '',
      color: '#00b894',
      delay: 0.1,
      celebrate: celebrating && equityDelta !== 0,
      delta: equityDelta,
    },
    {
      label: 'CO2',
      value: Math.round((metrics?.env_co2_est ?? 0) * tilt.co2),
      unit: 'kt',
      color: '#e17055',
      delay: 0.15,
      celebrate: celebrating && co2Delta !== 0,
      delta: co2Delta,
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
