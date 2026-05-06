import { motion } from 'framer-motion'
import { Building2, Check, Copy, RotateCcw, Save, Sparkles } from 'lucide-react'
import { useCityStore } from '@/stores/cityStore'
import { useSimulationStore } from '@/stores/simulationStore'
import { useAIStore } from '@/stores/aiStore'
import { useScenarioStore } from '@/stores/scenarioStore'
import { getZoneColor } from '@/utils/colorUtils'
import type { AgentAction, ZoneExplanation } from '@/types/simulation.types'

export function RightPanel() {
  const { selectedCity } = useCityStore()
  const {
    lastActions,
    metricsHistory,
    planning,
    applyAIPlan,
    saveScenario,
    loadScenario,
    duplicateScenario,
    resetScenario,
    setDemoMode,
    setPlanningConstraint,
  } = useSimulationStore()
  const { lastExplanations } = useAIStore()
  const activeScenario = useScenarioStore((s) => s.activeScenario)

  const currentMetrics = metricsHistory.at(-1) ?? null
  const latestExplanation: ZoneExplanation | undefined = lastExplanations[0]

  return (
    <div
      className="w-72 flex flex-col overflow-hidden shrink-0"
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

      <Section label="Demo Flow">
        <DemoStepper analyzed={planning.hasAnalyzed} applied={planning.hasAppliedAIPlan} reportOpen={planning.isReportOpen} />
      </Section>

      {planning.hasAnalyzed && (
        <Section label="AI Recommendation">
          <div className="rounded-lg p-3" style={{ background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.2)' }}>
            <div className="font-display text-xs font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>
              {planning.topRecommendation.title}
            </div>
            <p className="text-[10px] leading-relaxed mb-2" style={{ color: 'var(--color-text-secondary)' }}>
              {planning.topRecommendation.reason}
            </p>
            <DataGrid rows={[
              ['Impact', `City Health +${planning.topRecommendation.expectedImpact.cityHealth}`],
              ['Cost', `$${(planning.topRecommendation.estimatedCost / 1_000_000).toFixed(0)}M`],
              ['Confidence', `${Math.round(planning.topRecommendation.confidence * 100)}%`],
            ]} />
            <button
              onClick={() => applyAIPlan(activeScenario)}
              disabled={planning.hasAppliedAIPlan}
              className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-display font-semibold disabled:opacity-40"
              style={{ background: 'rgba(0,255,156,0.08)', color: 'var(--color-accent-green)', border: '1px solid rgba(0,255,156,0.3)' }}
            >
              <Sparkles size={11} />
              {planning.hasAppliedAIPlan ? 'AI Plan Applied' : 'Apply AI Plan'}
            </button>
          </div>
        </Section>
      )}

      <Section label="Constraints">
        <div className="space-y-2">
          <SliderRow label="Budget" value={planning.budget / 1_000_000} min={25} max={250} suffix="M" onChange={(value) => setPlanningConstraint('budget', value * 1_000_000)} />
          <SliderRow label="Service Radius" value={planning.serviceRadius} min={600} max={2400} suffix="m" onChange={(value) => setPlanningConstraint('serviceRadius', value)} />
          <SliderRow label="Climate Priority" value={planning.climatePriority} min={0} max={100} suffix="" onChange={(value) => setPlanningConstraint('climatePriority', value)} />
          <SliderRow label="Equity Priority" value={planning.equityPriority} min={0} max={100} suffix="" onChange={(value) => setPlanningConstraint('equityPriority', value)} />
          <div className="grid grid-cols-4 gap-1">
            {[5, 10, 20, 50].map((year) => (
              <button key={year} className="rounded-md py-1 font-mono text-[9px]" style={{ border: year === planning.horizonYears ? '1px solid rgba(0,212,255,0.35)' : '1px solid var(--color-border-subtle)', color: year === planning.horizonYears ? 'var(--color-accent-cyan)' : 'var(--color-text-muted)' }}>
                {year}Y
              </button>
            ))}
          </div>
        </div>
      </Section>

      <Section label="Demo Mode">
        <label className="flex items-start gap-2 cursor-pointer">
          <input type="checkbox" checked={planning.demoMode} onChange={(event) => setDemoMode(event.target.checked)} style={{ marginTop: 2, accentColor: 'var(--color-accent-cyan)' }} />
          <span className="text-[10px] leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
            Demo Mode: Reliable seeded city data for hackathon presentation.
          </span>
        </label>
      </Section>

      <Section label="Scenario Files">
        <div className="grid grid-cols-2 gap-1.5 mb-2">
          <button onClick={saveScenario} className="flex items-center justify-center gap-1 rounded-lg py-1.5 text-[10px]" style={{ border: '1px solid rgba(0,212,255,0.25)', color: 'var(--color-accent-cyan)' }}><Save size={10} />Save</button>
          <button onClick={resetScenario} className="flex items-center justify-center gap-1 rounded-lg py-1.5 text-[10px]" style={{ border: '1px solid var(--color-border-subtle)', color: 'var(--color-text-muted)' }}><RotateCcw size={10} />Reset</button>
        </div>
        <div className="space-y-1 max-h-28 overflow-y-auto">
          {planning.savedScenarios.length === 0 ? (
            <p className="font-mono text-[9px]" style={{ color: 'var(--color-text-muted)' }}>No saved scenarios yet.</p>
          ) : planning.savedScenarios.slice(-4).reverse().map((saved) => (
            <div key={saved.id} className="rounded-md p-2" style={{ border: '1px solid var(--color-border-subtle)' }}>
              <div className="font-mono text-[9px] truncate" style={{ color: 'var(--color-text-secondary)' }}>{saved.city} · {saved.growthRate}% · {saved.timeHorizon}Y</div>
              <div className="flex gap-1 mt-1">
                <button onClick={() => loadScenario(saved.id)} className="text-[9px]" style={{ color: 'var(--color-accent-cyan)' }}>Load</button>
                <button onClick={() => duplicateScenario(saved.id)} className="flex items-center gap-0.5 text-[9px]" style={{ color: 'var(--color-text-muted)' }}><Copy size={8} />Duplicate</button>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section label="Assumptions">
        <ul className="space-y-1 text-[10px] leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
          <li>Population growth is simulated.</li>
          <li>Infrastructure data may be incomplete.</li>
          <li>Scores are estimates for early-stage scenario comparison.</li>
          <li>UrbanMind does not replace zoning, environmental review, engineering, or public approval.</li>
        </ul>
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

function DemoStepper({ analyzed, applied, reportOpen }: { analyzed: boolean; applied: boolean; reportOpen: boolean }) {
  const steps = [
    ['Choose city', true],
    ['Choose growth scenario', true],
    ['Analyze current infrastructure', analyzed],
    ['View underserved zones', analyzed],
    ['Review AI recommendations', analyzed],
    ['Apply AI plan', applied],
    ['Compare before and after', applied],
    ['Export report', reportOpen],
  ] as const
  const current = steps.findIndex(([, done]) => !done)
  return (
    <div className="space-y-1.5">
      {steps.map(([label, done], index) => {
        const active = current === index || (current === -1 && index === steps.length - 1)
        return (
          <div key={label} className="flex items-center gap-2">
            <span
              className="w-4 h-4 rounded-full grid place-items-center font-mono text-[8px] shrink-0"
              style={{
                background: done ? 'rgba(0,255,156,0.12)' : active ? 'rgba(0,212,255,0.12)' : 'rgba(255,255,255,0.04)',
                border: done ? '1px solid rgba(0,255,156,0.35)' : active ? '1px solid rgba(0,212,255,0.35)' : '1px solid var(--color-border-subtle)',
                color: done ? 'var(--color-accent-green)' : active ? 'var(--color-accent-cyan)' : 'var(--color-text-muted)',
              }}
            >
              {done ? <Check size={9} /> : index + 1}
            </span>
            <span className="font-display text-[10px]" style={{ color: active ? 'var(--color-accent-cyan)' : done ? 'var(--color-text-secondary)' : 'var(--color-text-muted)' }}>{label}</span>
          </div>
        )
      })}
    </div>
  )
}

function SliderRow({ label, value, min, max, suffix, onChange }: { label: string; value: number; min: number; max: number; suffix: string; onChange: (value: number) => void }) {
  return (
    <label className="block">
      <div className="flex justify-between mb-1">
        <span className="font-mono text-[9px]" style={{ color: 'var(--color-text-muted)' }}>{label}</span>
        <span className="font-mono text-[9px]" style={{ color: 'var(--color-accent-cyan)' }}>{Math.round(value)}{suffix}</span>
      </div>
      <input aria-label={label} type="range" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} className="w-full" style={{ accentColor: 'var(--color-accent-cyan)' }} />
    </label>
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
          style={{ background: color }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}
