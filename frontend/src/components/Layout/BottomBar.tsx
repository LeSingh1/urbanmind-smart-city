import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, Play, Pause, RotateCcw } from 'lucide-react'
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

  const [playing, setPlaying] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  useEffect(() => {
    if (!playing) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      intervalRef.current = null
      return
    }
    intervalRef.current = setInterval(() => {
      const { currentYear: cy, planning: pl, scrubToYear: scrub, setTimelineYear: setTy, frameHistory: fh } = useSimulationStore.getState()
      const display = cy >= START_YEAR ? cy : pl.timelineYear
      const next = Math.min(END_YEAR, display + 2)
      if (next > END_YEAR || next === display) {
        setPlaying(false)
        return
      }
      const frame = fh.find((f) => f.year === next)
      if (frame) scrub(next)
      else setTy(next)
    }, 520)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [playing])
  useEffect(() => {
    if (displayYear >= END_YEAR && playing) setPlaying(false)
  }, [displayYear, playing])

  const handleReset = () => {
    setPlaying(false)
    moveToYear(START_YEAR)
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
      className="pointer-events-none fixed bottom-4 left-4 right-4 z-[70] flex justify-center"
    >
      <div
        className="pointer-events-auto grid w-full max-w-[1240px] grid-cols-[110px_auto_minmax(0,1fr)_120px] items-center gap-4 px-4 py-3"
        style={{
          background: 'var(--color-bg-sidebar)',
          border: '1px solid var(--color-border-subtle)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="grid h-9 w-9 place-items-center"
            style={{
              background: 'var(--color-bg-sidebar)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <Sparkles size={14} style={{ color: 'var(--color-accent-cyan)' }} />
          </div>
          <div>
            <div className="font-mono text-[9px] uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-muted)' }}>Year</div>
            <motion.div
              key={displayYear}
              initial={{ opacity: 0.55, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="font-mono text-lg font-bold tabular-nums"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {displayYear}
            </motion.div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPlaying((v) => !v)}
            aria-label={playing ? 'Pause' : 'Play'}
            className="grid h-9 w-9 place-items-center transition-transform hover:scale-105 active:scale-95"
            style={{
              background: 'var(--color-bg-sidebar)',
              borderRadius: 'var(--radius-md)',
              border: `1px solid ${playing ? 'rgba(255,71,87,0.45)' : 'var(--color-border-subtle)'}`,
              boxShadow: playing ? 'var(--shadow-pressed)' : 'var(--shadow-sm)',
              color: playing ? 'var(--color-accent-cyan)' : 'var(--color-text-secondary)',
            }}
          >
            {playing ? <Pause size={14} /> : <Play size={14} fill="currentColor" />}
          </button>
          <button
            type="button"
            onClick={handleReset}
            aria-label="Reset"
            className="grid h-9 w-9 place-items-center transition-transform hover:scale-105 active:scale-95"
            style={{
              background: 'var(--color-bg-sidebar)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border-subtle)',
              boxShadow: 'var(--shadow-sm)',
              color: 'var(--color-text-secondary)',
            }}
          >
            <RotateCcw size={14} />
          </button>
        </div>

        <div className="min-w-0">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-2 truncate text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              <span className="font-mono text-[9px] uppercase tracking-[0.18em]" style={{ color: 'var(--color-accent-green)' }}>Copilot</span>
              <span className="truncate font-medium">
                {copilotText}
                {!copilotDone && <span className="copilot-caret" aria-hidden="true">|</span>}
              </span>
            </span>
            <span className="shrink-0 font-mono text-[10px] tabular-nums" style={{ color: 'var(--color-text-muted)' }}>
              {START_YEAR}–{END_YEAR}
            </span>
          </div>
          <div className="relative h-5">
            <div
              className="absolute left-0 right-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full"
              style={{ background: 'var(--color-bg-hover)', boxShadow: 'var(--shadow-inset)' }}
            />
            <motion.div
              className="absolute left-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full"
              animate={{ width: `${progress}%` }}
              transition={{ type: 'spring', stiffness: 90, damping: 22, mass: 0.4 }}
              style={{ background: 'var(--color-accent-cyan)', opacity: 0.85 }}
            />
            <motion.div
              className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full"
              animate={{ left: `${progress}%` }}
              transition={{ type: 'spring', stiffness: 100, damping: 18, mass: 0.45 }}
              style={{
                background: 'var(--color-bg-sidebar)',
                border: '2px solid var(--color-accent-cyan)',
                boxShadow: 'var(--shadow-sm)',
              }}
            />
            <input
              type="range"
              min={START_YEAR}
              max={END_YEAR}
              step={1}
              value={displayYear}
              onChange={(event) => moveToYear(Number(event.target.value))}
              className="absolute inset-0 z-10 w-full cursor-pointer"
              style={{ accentColor: 'var(--color-accent-cyan)', opacity: 0 }}
              aria-label="Simulation year"
            />
          </div>
          <div className="mt-2 flex items-center gap-1.5">
            {DECADE_CHIPS.map((year) => {
              const active = displayYear === year || (Math.abs(displayYear - year) <= 4 && year !== 2026)
              return (
                <button
                  key={year}
                  type="button"
                  onClick={() => moveToYear(year)}
                  className="rounded-full px-2.5 py-0.5 font-mono text-[10px] tabular-nums transition-colors"
                  style={{
                    background: active ? 'var(--color-bg-hover)' : 'var(--color-bg-sidebar)',
                    color: active ? 'var(--color-accent-cyan)' : 'var(--color-text-muted)',
                    border: `1px solid ${active ? 'rgba(255,71,87,0.40)' : 'var(--color-border-subtle)'}`,
                    boxShadow: active ? 'var(--shadow-inset)' : 'none',
                  }}
                >
                  {year}
                </button>
              )
            })}
          </div>
        </div>

        <div className="hidden self-center text-right md:block">
          <div className="font-mono text-[9px] uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-muted)' }}>
            Population
          </div>
          <div className="font-mono text-base font-bold tabular-nums" style={{ color: 'var(--color-text-primary)' }}>
            {Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(displayPopulation)}
          </div>
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
