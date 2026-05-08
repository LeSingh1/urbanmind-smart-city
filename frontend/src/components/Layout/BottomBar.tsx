import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { useCityStore } from '@/stores/cityStore'
import { useScenarioStore } from '@/stores/scenarioStore'
import { useSimulationStore } from '@/stores/simulationStore'
import { useTypewriter } from '@/hooks/useTypewriter'

const START_YEAR = 2026
const END_YEAR = 2101
const DECADE_CHIPS = [2026, 2030, 2040, 2050, 2060, 2070, 2080] as const

export function BottomBar() {
  const selectedCity = useCityStore((state) => state.selectedCity)
  const {
    currentYear,
    frameHistory,
    currentFrame,
    planning,
    scrubToYear,
    setTimelineYear,
  } = useSimulationStore()

  const displayYear = currentYear >= START_YEAR ? currentYear : planning.timelineYear
  const displayPopulation = currentFrame?.metrics_snapshot.pop_total ?? planning.timelinePopulation
  const progress = Math.max(0, Math.min(100, ((displayYear - START_YEAR) / (END_YEAR - START_YEAR)) * 100))

  const moveToYear = (year: number) => {
    const frame = frameHistory.find((item) => item.year === year)
    if (frame) {
      scrubToYear(year)
      return
    }
    setTimelineYear(year)
  }

  const copilotLine = useMemo(() => buildCopilotLine({
    year: displayYear,
    population: displayPopulation,
    phase: planning.timelinePhase,
    hasAnalyzed: planning.hasAnalyzed,
    hasApplied: planning.hasAppliedAIPlan,
    cityHealth: planning.afterScores?.cityHealth ?? planning.beforeScores?.cityHealth,
    cityName: selectedCity?.name,
  }), [displayYear, displayPopulation, planning.timelinePhase, planning.hasAnalyzed, planning.hasAppliedAIPlan, planning.afterScores?.cityHealth, planning.beforeScores?.cityHealth, selectedCity?.name])
  const { output: copilotText, done: copilotDone } = useTypewriter(copilotLine, { speedMs: 14 })

  return (
    <footer
      className="fixed bottom-0 left-0 right-0 z-[70] grid h-[58px] grid-cols-[164px_minmax(0,1fr)_150px] items-center gap-4 px-4"
      style={{
        background: 'var(--color-bg-sidebar)',
        borderTop: '1px solid var(--color-border-subtle)',
        boxShadow: '0 -10px 30px rgba(0,0,0,0.18)',
      }}
    >
      <div className="flex min-w-[164px] items-center gap-2">
        <div>
          <div className="font-mono text-[9px] uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>Year</div>
          <motion.div
            key={displayYear}
            initial={{ opacity: 0.55, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="font-mono text-lg font-bold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {displayYear}
          </motion.div>
        </div>
      </div>

      <div className="min-w-0">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-1.5 truncate text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            <Sparkles size={11} style={{ color: 'var(--color-accent-green)', flexShrink: 0 }} />
            <span className="font-mono text-[9px] uppercase tracking-widest" style={{ color: 'var(--color-accent-green)' }}>Copilot</span>
            <span className="truncate font-semibold">
              {copilotText}
              {!copilotDone && <span className="copilot-caret" aria-hidden="true">|</span>}
            </span>
          </span>
          <span className="shrink-0 font-mono text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
            {START_YEAR} to {END_YEAR}
          </span>
        </div>
        <div className="relative">
          <div className="absolute left-0 right-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full" style={{ background: 'var(--color-bg-hover)', boxShadow: 'var(--shadow-inset)' }} />
          <motion.div
            className="absolute left-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full"
            animate={{ width: `${progress}%` }}
            transition={{ type: 'spring', stiffness: 90, damping: 22, mass: 0.4 }}
            style={{ background: 'var(--color-accent-cyan)', opacity: 0.72 }}
          />
          <motion.div
            className="pointer-events-none absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full"
            animate={{ left: `${progress}%` }}
            transition={{ type: 'spring', stiffness: 100, damping: 18, mass: 0.45 }}
            style={{
              background: 'var(--color-accent-cyan)',
              border: '2px solid var(--color-bg-sidebar)',
              boxShadow: '0 6px 18px rgba(255,71,87,0.34)',
            }}
          />
          <input
            type="range"
            min={START_YEAR}
            max={END_YEAR}
            step={1}
            value={displayYear}
            onChange={(event) => moveToYear(Number(event.target.value))}
            className="relative z-10 w-full"
            style={{ accentColor: 'var(--color-accent-cyan)', opacity: 0 }}
            aria-label="Simulation year"
          />
        </div>
        <div className="mt-1.5 flex items-center gap-1.5">
          {DECADE_CHIPS.map((year) => {
            const active = displayYear === year || (Math.abs(displayYear - year) <= 4 && year !== 2026)
            return (
              <button
                key={year}
                type="button"
                onClick={() => moveToYear(year)}
                className="rounded-md px-2 py-0.5 font-mono text-[10px] tabular-nums"
                style={{
                  background: active ? 'var(--color-bg-hover)' : 'transparent',
                  color: active ? 'var(--color-accent-cyan)' : 'var(--color-text-muted)',
                  border: `1px solid ${active ? 'rgba(255,71,87,0.35)' : 'var(--color-border-subtle)'}`,
                }}
              >
                {year}
              </button>
            )
          })}
        </div>
      </div>

      <div className="hidden min-w-[150px] self-center text-right md:block">
        <div className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>
          Population
        </div>
        <div className="font-mono text-base font-bold tabular-nums" style={{ color: 'var(--color-text-primary)' }}>
          {Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(displayPopulation)}
        </div>
      </div>
    </footer>
  )
}

interface CopilotLineInput {
  year: number
  population: number
  phase?: string
  hasAnalyzed: boolean
  hasApplied: boolean
  cityHealth?: number
  cityName?: string
}

function buildCopilotLine({ year, population, phase, hasAnalyzed, hasApplied, cityHealth, cityName }: CopilotLineInput): string {
  if (!hasAnalyzed) {
    return `Pick a scenario and let me scan ${cityName ?? 'this city'} for service-coverage gaps.`
  }
  const popLabel = Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(population)
  const phaseLabel = phase?.trim()
  if (hasApplied && cityHealth != null) {
    if (phaseLabel) {
      return `Year ${year}, population ${popLabel}, City Health ${Math.round(cityHealth)}. ${phaseLabel}.`
    }
    return `Year ${year}, population ${popLabel}, City Health ${Math.round(cityHealth)}. Plan holding steady.`
  }
  if (phaseLabel) {
    return `Year ${year}, population ${popLabel}. ${phaseLabel}.`
  }
  return `Year ${year}, population ${popLabel}. Apply the plan to see how each year unfolds.`
}
