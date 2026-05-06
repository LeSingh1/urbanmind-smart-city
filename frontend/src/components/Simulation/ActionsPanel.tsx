import { motion } from 'framer-motion'
import { useSimulationStore } from '@/stores/simulationStore'
import { getZoneColor } from '@/utils/colorUtils'
import type { AgentAction } from '@/types/simulation.types'

export function ActionsPanel() {
  const { lastActions, currentYear } = useSimulationStore()

  return (
    <div className="p-3 space-y-3">
      {/* Year indicator */}
      <div
        className="rounded-lg p-3 text-center"
        style={{
          background: 'var(--color-bg-hover)',
          border: '1px solid var(--color-border-subtle)',
          boxShadow: 'var(--shadow-inset)',
        }}
      >
        <div
          className="font-mono font-bold text-xl"
          style={{ color: 'var(--color-accent-cyan)' }}
        >
          {currentYear}
        </div>
        <div
          className="font-mono text-[9px] tracking-widest uppercase mt-0.5"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Current Year
        </div>
      </div>

      {/* Zone distribution */}
      {lastActions.length > 0 && (
        <div>
          <div
            className="font-mono text-[9px] tracking-widest uppercase mb-2 flex items-center gap-1.5"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <span className="inline-block w-2 h-px" style={{ background: 'var(--color-border-subtle)' }} />
            Zone Distribution
          </div>
          <ZoneDistribution actions={lastActions} />
        </div>
      )}

      {/* Action log */}
      <div>
        <div
          className="font-mono text-[9px] tracking-widest uppercase mb-2 flex items-center gap-1.5"
          style={{ color: 'var(--color-text-muted)' }}
        >
          <span className="inline-block w-2 h-px" style={{ background: 'var(--color-border-subtle)' }} />
          Recent Actions ({lastActions.length})
        </div>
        <div className="space-y-1.5 max-h-64 overflow-y-auto">
          {lastActions.length === 0 ? (
            <p
              className="font-mono text-[10px] text-center py-4"
              style={{ color: 'var(--color-text-muted)' }}
            >
              No zone placements yet
            </p>
          ) : (
            lastActions.map((action: AgentAction, i: number) => (
              <motion.div
                key={`${action.x}-${action.y}-${i}`}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center gap-2 py-1.5 px-2 rounded"
                style={{
                  background: 'var(--color-bg-hover)',
                  border: '1px solid var(--color-border-subtle)',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <div
                  className="w-2 h-2 rounded-sm shrink-0"
                  style={{ background: getZoneColor(action.zone_type_id) }}
                />
                <div className="flex-1 min-w-0">
                  <div
                    className="font-display text-[10px] truncate"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {action.zone_display_name}
                  </div>
                  <div
                    className="font-mono text-[9px]"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    ({action.x}, {action.y})
                  </div>
                </div>
                <div
                  className="font-mono text-[9px] shrink-0"
                  style={{
                    color: action.sps_score > 0.7
                      ? 'var(--color-accent-green)'
                      : action.sps_score > 0.4
                      ? 'var(--color-accent-warning)'
                      : 'var(--color-accent-danger)',
                  }}
                >
                  {action.sps_score.toFixed(2)}
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function ZoneDistribution({ actions }: { actions: AgentAction[] }) {
  const counts: Record<string, number> = {}
  actions.forEach((a) => {
    counts[a.zone_type_id] = (counts[a.zone_type_id] ?? 0) + 1
  })
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const max = sorted[0]?.[1] ?? 1

  return (
    <div className="space-y-1.5">
      {sorted.map(([zone, count]) => {
        const color = getZoneColor(zone)
        return (
          <div key={zone} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-sm shrink-0" style={{ background: color }} />
            <div
              className="font-mono text-[9px] w-24 truncate"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {zone.replace(/_/g, ' ')}
            </div>
            <div
              className="flex-1 h-0.5 rounded-full overflow-hidden"
              style={{ background: 'var(--color-bg-hover)', boxShadow: 'var(--shadow-inset)' }}
            >
              <div
                className="h-full rounded-full"
                style={{ width: `${(count / max) * 100}%`, background: color }}
              />
            </div>
            <div
              className="font-mono text-[9px] w-4 text-right shrink-0"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {count}
            </div>
          </div>
        )
      })}
    </div>
  )
}
