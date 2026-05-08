import { motion } from 'framer-motion'
import { Pause, Play, RotateCcw } from 'lucide-react'
import { useCityStore } from '@/stores/cityStore'
import { useScenarioStore } from '@/stores/scenarioStore'
import { useSimulationStore } from '@/stores/simulationStore'

const START_YEAR = 2026
const END_YEAR = 2101

export function BottomBar() {
  const selectedCity = useCityStore((state) => state.selectedCity)
  const activeScenario = useScenarioStore((state) => state.activeScenario)
  const {
    currentYear,
    frameHistory,
    isRunning,
    isPaused,
    currentFrame,
    planning,
    startSimulation,
    pauseSimulation,
    resumeSimulation,
    scrubToYear,
    setTimelineYear,
    analyzeDemo,
  } = useSimulationStore()

  const displayYear = currentYear >= START_YEAR ? currentYear : planning.timelineYear
  const displayPopulation = currentFrame?.metrics_snapshot.pop_total ?? planning.timelinePopulation
  const progress = Math.max(0, Math.min(100, ((displayYear - START_YEAR) / (END_YEAR - START_YEAR)) * 100))

  const togglePlayback = () => {
    if (!selectedCity) return
    if (isRunning) {
      pauseSimulation()
      return
    }
    if (isPaused && currentYear < END_YEAR) {
      resumeSimulation()
      return
    }
    startSimulation(selectedCity.id, activeScenario)
  }

  const reset = () => {
    if (selectedCity) analyzeDemo(selectedCity.id, activeScenario)
  }

  const moveToYear = (year: number) => {
    const frame = frameHistory.find((item) => item.year === year)
    if (frame) {
      scrubToYear(year)
      return
    }
    setTimelineYear(year)
  }

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
        <button
          onClick={togglePlayback}
          disabled={!selectedCity}
          className="grid h-9 w-9 place-items-center rounded-lg disabled:cursor-not-allowed disabled:opacity-40"
          style={{ color: 'var(--color-accent-cyan)', border: '1px solid rgba(255,71,87,0.32)', background: 'var(--color-bg-panel)', boxShadow: 'var(--shadow-sm)' }}
          aria-label={isRunning ? 'Pause simulation' : 'Play simulation'}
          title={isRunning ? 'Pause simulation' : 'Play simulation'}
        >
          {isRunning ? <Pause size={17} /> : <Play size={17} />}
        </button>
        <button
          onClick={reset}
          disabled={!selectedCity}
          className="grid h-9 w-9 place-items-center rounded-lg disabled:cursor-not-allowed disabled:opacity-40"
          style={{ color: 'var(--color-text-secondary)', border: '1px solid var(--color-border-subtle)', background: 'var(--color-bg-panel)', boxShadow: 'var(--shadow-sm)' }}
          aria-label="Reset simulation"
          title="Reset simulation"
        >
          <RotateCcw size={16} />
        </button>
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
          <span className="truncate text-xs font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
            {planning.timelinePhase || 'Move the timeline or press play to run the growth simulation.'}
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
