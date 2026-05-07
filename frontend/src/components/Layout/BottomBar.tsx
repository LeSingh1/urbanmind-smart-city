import { useState } from 'react'
import { useSimulationStore } from '@/stores/simulationStore'

const START_YEAR = 2026

export function BottomBar() {
  const [expanded, setExpanded] = useState(false)
  const {
    currentYear,
    frameHistory,
    planning,
    scrubToYear,
    setTimelineYear,
  } = useSimulationStore()

  const displayYear = currentYear >= START_YEAR ? currentYear : planning.timelineYear

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
      className="fixed bottom-0 left-0 right-0 z-[70] flex h-[58px] items-center gap-3 px-4"
      style={{
        background: 'var(--color-bg-sidebar)',
        borderTop: '1px solid var(--color-border-subtle)',
        boxShadow: '0 -10px 30px rgba(0,0,0,0.18)',
      }}
    >
      <div className="flex min-w-[164px] items-center gap-2">
        <div>
          <div className="font-mono text-[9px] uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>Year</div>
          <div className="font-mono text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
            {displayYear}
          </div>
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <span className="text-xs font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
            {expanded ? (planning.timelinePhase || 'Move the timeline or press play to run the growth simulation.') : '2026 to 2036 Growth Timeline'}
          </span>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="rounded px-2 py-1 font-mono text-[10px]"
            style={{ color: 'var(--color-text-muted)', border: '1px solid var(--color-border-subtle)', background: 'var(--color-bg-panel)' }}
          >
            {expanded ? 'Collapse' : 'Expand'}
          </button>
        </div>
        {expanded ? (
          <div className="flex flex-wrap gap-1.5">
            {[2026, 2028, 2030, 2032, 2036].map((year) => (
              <button
                key={year}
                onClick={() => moveToYear(year)}
                className="rounded px-2 py-1 font-mono text-[10px]"
                style={{
                  color: year === displayYear ? 'var(--color-accent-cyan)' : 'var(--color-text-muted)',
                  border: year === displayYear ? '1px solid rgba(0,212,255,0.45)' : '1px solid var(--color-border-subtle)',
                  background: year === displayYear ? 'var(--color-bg-hover)' : 'var(--color-bg-panel)',
                }}
              >
                {year}
              </button>
            ))}
          </div>
        ) : (
          <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            Timeline controls are collapsed for the demo.
          </div>
        )}
      </div>

      <div className="hidden min-w-[132px] text-right md:block">
        <div className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>
          Population
        </div>
        <div className="font-mono text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>
          {planning.timelinePopulation.toLocaleString()}
        </div>
      </div>
    </footer>
  )
}
