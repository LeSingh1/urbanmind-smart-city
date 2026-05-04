import { useMemo } from 'react'
import * as d3 from 'd3'
import { useSimulationStore } from '@/stores/simulationStore'
import { getZoneColor } from '@/utils/colorUtils'

export function BottomBar() {
  const currentYear = useSimulationStore((state) => state.currentYear)
  const frameHistory = useSimulationStore((state) => state.frameHistory)
  const scrubToYear = useSimulationStore((state) => state.scrubToYear)

  const zoneCounts = useMemo(() => {
    const counts = new Map<string, number>()
    const features = frameHistory.at(-1)?.zones_geojson.features ?? []
    features.forEach((feature) => {
      const zone = String(feature.properties?.zone_type_id ?? feature.properties?.zone_type ?? 'ZONE')
      counts.set(zone, (counts.get(zone) ?? 0) + 1)
    })
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)
  }, [frameHistory])

  return (
    <footer
      className="fixed left-0 right-0 bottom-0 h-16 z-50 flex"
      style={{
        background: 'var(--color-bg-sidebar)',
        borderTop: '1px solid var(--color-border-subtle)',
        boxShadow: '0 -1px 0 rgba(0,212,255,0.06)',
      }}
    >
      {/* Timeline */}
      <div className="flex-1 px-5 flex items-center">
        <Timeline
          currentYear={currentYear}
          years={frameHistory.map((f) => f.year)}
          onScrub={scrubToYear}
        />
      </div>

      {/* Zone legend */}
      <div
        className="w-72 flex items-center gap-1.5 flex-wrap px-4 overflow-hidden"
        style={{ borderLeft: '1px solid var(--color-border-subtle)' }}
      >
        {zoneCounts.length === 0 ? (
          <span className="font-mono text-[9px] tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
            Zone legend populates as simulation runs
          </span>
        ) : (
          zoneCounts.map(([zone]) => (
            <div
              key={zone}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded"
              style={{
                border: '1px solid var(--color-border-subtle)',
                background: 'transparent',
              }}
            >
              <span
                className="w-2 h-2 rounded-sm shrink-0"
                style={{ background: getZoneColor(zone) }}
              />
              <span
                className="font-mono text-[8px] uppercase tracking-wide"
                style={{ color: 'var(--color-text-muted)' }}
              >
                {zone.replace(/_/g, ' ').slice(0, 14)}
              </span>
            </div>
          ))
        )}
      </div>
    </footer>
  )
}

function Timeline({
  currentYear,
  years,
  onScrub,
}: {
  currentYear: number
  years: number[]
  onScrub: (year: number) => void
}) {
  const W = 700
  const H = 40
  const maxYear = Math.max(50, ...years, currentYear)
  const x = d3.scaleLinear().domain([0, maxYear]).range([16, W - 16])
  const progress = x(currentYear)
  const milestones = years.filter((y) => y % 10 === 0)

  return (
    <svg
      width="100%"
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      style={{ cursor: 'pointer' }}
      onClick={(e) => {
        const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect()
        const raw = ((e.clientX - rect.left) / rect.width) * W
        onScrub(Math.round(x.invert(raw)))
      }}
    >
      {/* Track */}
      <line
        x1="16" x2={W - 16} y1="22" y2="22"
        stroke="rgba(0,212,255,0.1)" strokeWidth="3" strokeLinecap="round"
      />
      {/* Filled track */}
      <line
        x1="16" x2={progress} y1="22" y2="22"
        stroke="var(--color-accent-cyan)" strokeWidth="3" strokeLinecap="round"
        style={{ filter: 'drop-shadow(0 0 4px rgba(0,212,255,0.6))' }}
      />
      {/* Milestone markers */}
      {milestones.map((year) => (
        <circle
          key={year}
          cx={x(year)} cy="22" r="3"
          fill={year % 20 === 0 ? 'var(--color-accent-purple)' : 'rgba(0,212,255,0.4)'}
          style={year % 20 === 0 ? { filter: 'drop-shadow(0 0 4px rgba(124,58,237,0.8))' } : {}}
        >
          <title>Year {year}</title>
        </circle>
      ))}
      {/* Playhead */}
      <circle
        cx={progress} cy="22" r="7"
        fill="var(--color-bg-sidebar)"
        stroke="var(--color-accent-cyan)"
        strokeWidth="1.5"
        style={{ filter: 'drop-shadow(0 0 6px rgba(0,212,255,0.7))' }}
      />
      {/* Year label */}
      <text
        x={progress} y="11"
        fill="var(--color-accent-cyan)"
        fontSize="9"
        textAnchor="middle"
        fontFamily="JetBrains Mono, monospace"
        letterSpacing="0.1em"
      >
        Y{currentYear}
      </text>
      {/* Start / end labels */}
      <text x="16" y="36" fill="rgba(0,212,255,0.3)" fontSize="8" fontFamily="JetBrains Mono, monospace">0</text>
      <text x={W - 16} y="36" fill="rgba(0,212,255,0.3)" fontSize="8" fontFamily="JetBrains Mono, monospace" textAnchor="end">{maxYear}</text>
    </svg>
  )
}
