import { useSimulationStore } from '@/stores/simulationStore'
import type { TimelineYear } from '@/types/city.types'

const YEARS: TimelineYear[] = [2026, 2028, 2030, 2032, 2036]

export function BottomBar() {
  const { planning, setTimelineYear } = useSimulationStore()

  return (
    <footer
      className="fixed bottom-0 left-0 right-0 z-[70] flex h-[72px] items-center gap-4 px-5"
      style={{
        background: 'var(--color-bg-sidebar)',
        borderTop: '1px solid var(--color-border-subtle)',
        boxShadow: '0 -10px 30px rgba(0,0,0,0.22)',
      }}
    >
      <div className="min-w-[180px]">
        <div className="font-display text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          Growth Timeline
        </div>
        <div className="mt-0.5 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          {planning.timelinePhase || 'Run analysis to simulate growth pressure.'}
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center gap-2">
        {YEARS.map((year) => {
          const active = planning.timelineYear === year
          return (
            <button
              key={year}
              onClick={() => setTimelineYear(year)}
              disabled={!planning.hasAnalyzed}
              className="rounded-xl px-4 py-2 font-mono text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40"
              style={{
                color: active ? 'var(--color-accent-cyan)' : 'var(--color-text-secondary)',
                border: active ? '1px solid rgba(0,212,255,0.45)' : '1px solid var(--color-border-subtle)',
                background: active ? 'var(--color-bg-hover)' : 'var(--color-bg-card)',
              }}
            >
              {year}
            </button>
          )
        })}
      </div>

      <div className="hidden min-w-[180px] text-right md:block">
        <div className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>
          Projected population
        </div>
        <div className="font-mono text-lg font-bold" style={{ color: 'var(--color-accent-warning)' }}>
          {planning.timelinePopulation.toLocaleString()}
        </div>
      </div>
    </footer>
  )
}
