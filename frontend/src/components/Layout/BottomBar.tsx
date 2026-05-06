import { useSimulationStore } from '@/stores/simulationStore'
import type { TimelineYear } from '@/types/city.types'
import { useCityStore } from '@/stores/cityStore'
import { getZoneColor } from '@/utils/colorUtils'

const YEARS: TimelineYear[] = [2026, 2028, 2030, 2032, 2036]

export function BottomBar() {
  const timelineYear = useSimulationStore((s) => s.planning.timelineYear)
  const setTimelineYear = useSimulationStore((s) => s.setTimelineYear)
  const timelinePhase = useSimulationStore((s) => s.planning.timelinePhase)
  const timelinePopulation = useSimulationStore((s) => s.planning.timelinePopulation)
  const hasAnalyzed = useSimulationStore((s) => s.planning.hasAnalyzed)
  const infrastructure = useSimulationStore((s) => s.planning.infrastructure)
  const selectedCity = useCityStore((s) => s.selectedCity)

  // Build a compact legend from current infrastructure categories
  const legendItems = Array.from(
    new Map(
      infrastructure.slice(0, 8).map((item) => [item.category, item])
    ).values()
  ).slice(0, 5)

  return (
    <footer
      className="shrink-0 flex items-center gap-0 px-4"
      style={{
        height: 52,
        background: 'rgba(8,13,22,0.96)',
        borderTop: '1px solid rgba(0,212,255,0.10)',
        backdropFilter: 'blur(14px)',
      }}
    >
      {/* Year selector */}
      <div className="flex items-center gap-1 shrink-0">
        <span className="font-mono text-[9px] uppercase tracking-widest mr-2" style={{ color: 'var(--color-text-muted)' }}>
          Timeline
        </span>
        {YEARS.map((year) => {
          const active = year === timelineYear
          return (
            <button
              key={year}
              onClick={() => setTimelineYear(year)}
              className="rounded-lg px-3 py-1.5 font-mono text-[10px] transition-all"
              style={{
                background: active ? 'rgba(0,212,255,0.12)' : 'rgba(255,255,255,0.03)',
                border: active ? '1px solid rgba(0,212,255,0.45)' : '1px solid rgba(255,255,255,0.07)',
                color: active ? 'var(--color-accent-cyan)' : 'var(--color-text-muted)',
                fontWeight: active ? 600 : 400,
              }}
            >
              {year}
            </button>
          )
        })}
      </div>

      {/* Separator */}
      <div className="mx-4 h-6 w-px" style={{ background: 'rgba(255,255,255,0.08)' }} />

      {/* Phase + population */}
      <div className="shrink-0 min-w-0">
        {timelinePhase ? (
          <div className="font-mono text-[10px] truncate" style={{ color: 'var(--color-text-secondary)' }}>
            {timelinePhase}
            {timelinePopulation > 0 && (
              <span className="ml-2" style={{ color: 'var(--color-accent-warning)' }}>
                {timelinePopulation.toLocaleString()} residents
              </span>
            )}
          </div>
        ) : selectedCity ? (
          <div className="font-mono text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
            {selectedCity.name} · Click Analyze to begin
          </div>
        ) : (
          <div className="font-mono text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
            Select a city to begin
          </div>
        )}
      </div>

      <div className="flex-1" />

      {/* Infrastructure legend */}
      {hasAnalyzed && legendItems.length > 0 && (
        <div className="flex items-center gap-3 shrink-0">
          {legendItems.map((item) => {
            const color = getZoneColor(item.category === 'clinic' ? 'HEALTH_CLINIC' : item.category === 'school' ? 'EDU_HIGH' : item.category === 'park' ? 'PARK_SMALL' : item.category === 'transit_stop' ? 'BUS_STATION' : 'RES_MED_APARTMENT')
            return (
              <div key={item.category} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: color }} />
                <span className="font-mono text-[9px] capitalize" style={{ color: 'var(--color-text-muted)' }}>
                  {item.category.replace(/_/g, ' ')}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </footer>
  )
}
