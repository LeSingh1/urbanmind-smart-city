import { motion } from 'framer-motion'
import { Building2 } from 'lucide-react'
import { useCityStore } from '@/stores/cityStore'
import { useSimulationStore } from '@/stores/simulationStore'
import { useAIStore } from '@/stores/aiStore'
import { getZoneColor } from '@/utils/colorUtils'
import type { AgentAction, ZoneExplanation } from '@/types/simulation.types'

export function RightPanel() {
  const { selectedCity } = useCityStore()
  const { lastActions, metricsHistory } = useSimulationStore()
  const { lastExplanations } = useAIStore()

  const currentMetrics = metricsHistory.at(-1) ?? null
  const latestExplanation: ZoneExplanation | undefined = lastExplanations[0]

  return (
    <div
      className="w-56 flex flex-col overflow-hidden shrink-0"
      style={{
        background: 'var(--color-bg-sidebar)',
        borderLeft: '1px solid var(--color-border-subtle)',
      }}
    >
      {/* City info */}
      <Section label="City Info">
        {selectedCity ? (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{
                  background: 'rgba(0,212,255,0.08)',
                  border: '1px solid rgba(0,212,255,0.2)',
                }}
              >
                <Building2 size={14} style={{ color: 'var(--color-accent-cyan)' }} />
              </div>
              <div>
                <div
                  className="font-display font-medium text-xs"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {selectedCity.name}
                </div>
                <div
                  className="font-mono text-[10px]"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  {selectedCity.country}
                </div>
              </div>
            </div>
            <DataGrid rows={[
              ['Population', selectedCity.population_current.toLocaleString()],
              ['Climate', selectedCity.climate_zone],
            ]} />
          </div>
        ) : (
          <p className="font-mono text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
            Select a city to begin
          </p>
        )}
      </Section>

      {/* AI insight */}
      {latestExplanation && (
        <Section label="AI Insight">
          <div
            className="rounded-lg p-3"
            style={{
              background: 'rgba(124,58,237,0.06)',
              border: '1px solid rgba(124,58,237,0.2)',
            }}
          >
            <div className="flex items-center gap-1.5 mb-2">
              <div
                className="w-2.5 h-2.5 rounded-sm shrink-0"
                style={{ background: getZoneColor(latestExplanation.zone_type_id) }}
              />
              <span
                className="font-display font-medium text-[10px]"
                style={{ color: 'var(--color-accent-purple)' }}
              >
                {latestExplanation.zone_display_name}
              </span>
              <span
                className="font-mono text-[9px] ml-auto"
                style={{ color: 'var(--color-text-muted)' }}
              >
                Y{latestExplanation.year}
              </span>
            </div>
            <p className="text-[10px] leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
              {latestExplanation.explanation_text}
            </p>
          </div>
        </Section>
      )}

      {/* Recent actions */}
      <Section label="Recent Actions" flex>
        <div className="space-y-1.5 overflow-y-auto flex-1">
          {lastActions.length === 0 ? (
            <p className="font-mono text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
              No actions yet
            </p>
          ) : (
            lastActions.slice(0, 15).map((action: AgentAction, i: number) => (
              <motion.div
                key={`${action.x}-${action.y}-${i}`}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25, delay: i * 0.03 }}
                className="flex items-center gap-2 py-1 px-2 rounded"
                style={{ background: 'rgba(0,212,255,0.03)', border: '1px solid rgba(0,212,255,0.06)' }}
              >
                <div
                  className="w-2 h-2 rounded-sm shrink-0"
                  style={{ background: getZoneColor(action.zone_type_id) }}
                />
                <span
                  className="font-display text-[10px] flex-1 truncate"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {action.zone_display_name}
                </span>
                <span
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
                </span>
              </motion.div>
            ))
          )}
        </div>
      </Section>

      {/* City vitals */}
      {currentMetrics && (
        <div
          className="p-3 shrink-0"
          style={{ borderTop: '1px solid var(--color-border-subtle)' }}
        >
          <SectionLabel>City Vitals</SectionLabel>
          <div className="space-y-2 mt-2">
            <VitalBar
              label="Transit"
              value={currentMetrics.mobility_transit_coverage}
              max={100}
              color="var(--color-accent-cyan)"
            />
            <VitalBar
              label="Healthcare"
              value={currentMetrics.equity_hosp_coverage}
              max={100}
              color="var(--color-accent-purple)"
            />
            <VitalBar
              label="Green Space"
              value={Math.min(100, currentMetrics.env_green_ratio * 2.5)}
              max={100}
              color="var(--color-accent-green)"
            />
          </div>
        </div>
      )}
    </div>
  )
}

function Section({
  label,
  children,
  flex = false,
}: {
  label: string
  children: React.ReactNode
  flex?: boolean
}) {
  return (
    <div
      className={`p-3 shrink-0 ${flex ? 'flex flex-col flex-1 overflow-hidden' : ''}`}
      style={{ borderBottom: '1px solid var(--color-border-subtle)' }}
    >
      <SectionLabel>{label}</SectionLabel>
      <div className={`mt-2 ${flex ? 'flex flex-col flex-1 overflow-hidden' : ''}`}>
        {children}
      </div>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="font-mono text-[9px] tracking-widest uppercase flex items-center gap-1.5"
      style={{ color: 'var(--color-text-muted)' }}
    >
      <span
        className="inline-block w-2 h-px"
        style={{ background: 'var(--color-accent-cyan)', opacity: 0.5 }}
      />
      {children}
    </div>
  )
}

function DataGrid({ rows }: { rows: [string, string][] }) {
  return (
    <div className="grid grid-cols-2 gap-x-2 gap-y-1">
      {rows.map(([key, val]) => (
        <div key={key} className="contents">
          <span className="font-mono text-[9px]" style={{ color: 'var(--color-text-muted)' }}>
            {key}
          </span>
          <span className="font-mono text-[9px]" style={{ color: 'var(--color-text-secondary)' }}>
            {val}
          </span>
        </div>
      ))}
    </div>
  )
}

function VitalBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = Math.min(100, (value / max) * 100)
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="font-mono text-[9px]" style={{ color: 'var(--color-text-muted)' }}>{label}</span>
        <span className="font-mono text-[9px]" style={{ color }}>
          {value.toFixed(0)}%
        </span>
      </div>
      <div className="h-0.5 rounded-full overflow-hidden" style={{ background: 'var(--color-bg-card)' }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: color, boxShadow: `0 0 4px ${color}` }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}
