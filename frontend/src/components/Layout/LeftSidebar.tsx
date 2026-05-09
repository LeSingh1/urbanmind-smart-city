import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  BarChart3,
  Building2,
  Bot,
  ChevronLeft,
  ChevronRight,
  FileText,
  Flame,
  Home,
  Leaf,
  Map,
  Scale,
  Sparkles,
  Train,
  Users,
} from 'lucide-react'
import { ZonePalette } from '@/components/UI/ZonePalette'
import { CopilotAdvisoryAlert } from '@/components/UI/CopilotAdvisoryAlert'
import { useCityStore } from '@/stores/cityStore'
import { useScenarioStore, scenarioColors, scenarioLabels } from '@/stores/scenarioStore'
import { useSimulationStore } from '@/stores/simulationStore'
import type { ScenarioId } from '@/types/city.types'

const TABS = [
  { id: 'scenario', icon: Map, label: 'Scenario' },
  { id: 'metrics', icon: BarChart3, label: 'Metrics' },
  { id: 'copilot', icon: Bot, label: 'Copilot' },
] as const

type TabId = typeof TABS[number]['id']

const SCENARIO_DETAILS: Record<ScenarioId, { icon: React.ElementType; description: string; weights: string; impact: string }> = {
  balanced: { icon: Scale, description: 'Balances access, growth, commute, and green space.', weights: 'All weights normal', impact: 'Stable baseline' },
  transit_first: { icon: Train, description: 'Prioritizes transit stops, rail access, and commute reduction.', weights: 'Transit + commute', impact: 'Lower commute' },
  climate_resilient: { icon: Leaf, description: 'Prioritizes parks, CO2, heat risk, and resilient green corridors.', weights: 'Green + CO2', impact: 'Lower emissions' },
  equity_focused: { icon: Users, description: 'Prioritizes underserved zones, schools, emergency access, and transit.', weights: 'Equity + access', impact: 'Fairer access' },
  emergency_ready: { icon: Flame, description: 'Prioritizes clinics, hospitals, police, fire, and response coverage.', weights: 'Emergency + response', impact: 'Faster response' },
  max_growth: { icon: Home, description: 'Prioritizes housing capacity while tracking commute and congestion risk.', weights: 'Housing + access', impact: 'More capacity' },
}

export function LeftSidebar() {
  const [activePanel, setActivePanel] = useState<TabId | null>('scenario')
  const [collapsed, setCollapsed] = useState(false)
  const dynamicAdvisory = useSimulationStore((state) => state.planning.dynamicAdvisory)
  const acknowledgeDynamicAdvisory = useSimulationStore((state) => state.acknowledgeDynamicAdvisory)

  return (
    <div
      className="flex shrink-0"
      style={{
        width: collapsed ? 48 : 330,
        transition: 'width 300ms cubic-bezier(0.16,1,0.3,1)',
      }}
    >
      <div
        className="flex w-12 shrink-0 flex-col items-center gap-1.5 px-1 py-3"
        style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(241,245,249,0.75) 100%)',
          borderRight: '1px solid rgba(203, 213, 225, 0.65)',
        }}
      >
        {TABS.map(({ id, icon: Icon, label }) => {
          const active = activePanel === id && !collapsed
          return (
            <motion.button
              key={id}
              onClick={() => {
                if (collapsed) setCollapsed(false)
                setActivePanel(activePanel === id && !collapsed ? null : id)
                if (id === 'copilot') acknowledgeDynamicAdvisory()
              }}
              whileHover={{ scale: 1.06, y: -1 }}
              whileTap={{ scale: 0.94 }}
              className="relative flex h-9 w-9 items-center justify-center rounded-lg"
              style={{
                background: active ? 'var(--color-bg-hover)' : 'transparent',
                color: active ? 'var(--color-accent-cyan)' : 'var(--color-text-muted)',
                border: active ? '1px solid rgba(var(--rgb-accent), 0.35)' : '1px solid transparent',
                boxShadow: active ? 'var(--shadow-pressed)' : 'none',
              }}
              title={label}
              aria-label={label}
            >
              <Icon size={16} />
              {id === 'copilot' && dynamicAdvisory?.unread && (
                <motion.span
                  initial={{ scale: 0.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full px-1 font-mono text-[9px] font-bold"
                  style={{
                    background: 'var(--color-accent-warning)',
                    color: '#111827',
                    border: '1px solid var(--color-bg-sidebar)',
                    boxShadow: '0 0 12px rgba(245,158,11,0.75)',
                  }}
                >
                  1
                </motion.span>
              )}
              {active && (
                <motion.div
                  initial={{ opacity: 0, scaleY: 0.65 }}
                  animate={{ opacity: 1, scaleY: 1 }}
                  exit={{ opacity: 0, scaleY: 0.65 }}
                  transition={{ duration: 0.16, ease: 'easeOut' }}
                  className="absolute rounded-full"
                  style={{
                    left: -2,
                    top: 6,
                    bottom: 6,
                    width: 4,
                    transformOrigin: 'center',
                    background: 'var(--color-accent-cyan)',
                    boxShadow: '0 0 10px rgba(var(--rgb-accent), 0.35)',
                  }}
                />
              )}
            </motion.button>
          )
        })}

        <div className="flex-1" />

        <motion.button
          onClick={() => setCollapsed((v) => !v)}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          className="flex h-9 w-9 items-center justify-center rounded-lg"
          style={{ color: 'var(--color-text-muted)', border: '1px solid transparent' }}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </motion.button>
      </div>

      <AnimatePresence>
        {!collapsed && activePanel && (
          <motion.div
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } }}
            exit={{ opacity: 0, x: -12, transition: { duration: 0.2 } }}
            className="flex-1 flex flex-col overflow-hidden"
            style={{
              background: 'linear-gradient(180deg, rgba(255,255,255,0.78) 0%, rgba(248,250,252,0.92) 100%)',
              borderRight: '1px solid rgba(203, 213, 225, 0.6)',
              boxShadow: '8px 0 32px rgba(15, 23, 42, 0.06)',
              backdropFilter: 'blur(14px)',
            }}
          >
            <div
              className="px-4 py-4 shrink-0"
              style={{ borderBottom: '1px solid var(--color-border-subtle)' }}
            >
              <div className="flex items-center gap-2">
                <div className="w-1 h-5 rounded-full" style={{ background: 'var(--color-accent-cyan)', boxShadow: 'var(--shadow-sm)' }} />
                <h2 className="font-display font-semibold text-sm tracking-wide" style={{ color: 'var(--color-text-primary)' }}>
                  {TABS.find((tab) => tab.id === activePanel)?.label}
                </h2>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {activePanel === 'scenario' && <ScenarioPanel />}
              {activePanel === 'metrics' && <MetricsPanel />}
              {activePanel === 'copilot' && <CopilotPanel />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ScenarioPanel() {
  const selectedCity = useCityStore((state) => state.selectedCity)
  const { activeScenario, setScenario } = useScenarioStore()
  const { planning, setBudgetLevel } = useSimulationStore()

  const chooseScenario = (id: ScenarioId) => {
    setScenario(id)
    useSimulationStore.setState((s) => ({ planning: { ...s.planning, priority: id } }))
    const st = useSimulationStore.getState()
    if (selectedCity && !st.planning.hasAnalyzed) {
      st.hydratePlanningForCity(selectedCity.id)
    }
  }

  return (
    <div className="p-3 space-y-4">
      <PanelSection title="Selected City">
        <div className="rounded-xl p-3" style={{ background: 'var(--color-bg-hover)', border: '1px solid var(--color-border-subtle)' }}>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl grid place-items-center shrink-0" style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border-subtle)', color: 'var(--color-accent-cyan)' }}>
              <Building2 size={16} />
            </div>
            <div className="min-w-0">
              <div className="font-display text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{selectedCity?.name ?? 'Choose a city from Home'}</div>
              <div className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{selectedCity ? `${selectedCity.country} · ${selectedCity.population_current.toLocaleString()} residents` : 'No city selector in this sidebar'}</div>
            </div>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
            City selection stays on the home page and top-level app flow. Use Scenario for plan setup, Metrics for scorecards, and Copilot for analysis and apply.
          </p>
        </div>
      </PanelSection>

      <PanelSection title="Scenario">
        <div className="grid gap-2">
          {(Object.keys(SCENARIO_DETAILS) as ScenarioId[]).map((id) => (
            <ScenarioCard key={id} id={id} active={activeScenario === id} onSelect={() => chooseScenario(id)} />
          ))}
        </div>
      </PanelSection>

      <PanelSection title="Constraints">
        <div className="grid grid-cols-3 gap-1.5">
          {[
            ['low', 'Low', '$25M'],
            ['medium', 'Medium', '$75M'],
            ['high', 'High', '$150M'],
          ].map(([level, label, amount]) => (
            <button
              key={level}
              onClick={() => setBudgetLevel(level as 'low' | 'medium' | 'high')}
              className="rounded-lg p-2 text-center"
              style={{
                background: planning.budgetLevel === level ? 'rgba(0,184,148,0.1)' : 'var(--color-bg-card)',
                border: planning.budgetLevel === level ? '1px solid rgba(0,184,148,0.4)' : '1px solid var(--color-border-subtle)',
                color: planning.budgetLevel === level ? 'var(--color-accent-green)' : 'var(--color-text-muted)',
              }}
            >
              <div className="font-display text-[11px] font-semibold">{label}</div>
              <div className="font-mono text-[9px]">{amount}</div>
            </button>
          ))}
        </div>
        <div className="mt-2 rounded-xl p-3" style={{ border: '1px solid rgba(0,184,148,0.3)', background: 'rgba(0,184,148,0.06)' }}>
          <div className="flex justify-between font-mono text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>
            <span>Used ${(planning.budgetSummary.used / 1_000_000).toFixed(0)}M</span>
            <span>Remaining ${(planning.budgetSummary.remaining / 1_000_000).toFixed(0)}M</span>
          </div>
          <p className="mt-1 text-[10px] leading-relaxed" style={{ color: 'var(--color-accent-green)' }}>{planning.budgetSummary.guidance}</p>
        </div>
      </PanelSection>

      <PanelSection title="Zone palette">
        <ZonePalette compact />
      </PanelSection>
      <TrustCard />
    </div>
  )
}

function MetricsPanel() {
  const frame = useSimulationStore((state) => state.currentFrame)
  const planning = useSimulationStore((state) => state.planning)
  const metrics = frame?.metrics_snapshot
  return (
    <div className="p-3 space-y-4">
      <PanelSection title="Scorecard">
        <div className="grid grid-cols-2 gap-2">
          <MiniMetric title="Population" value={metrics?.pop_total ? Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(metrics.pop_total) : '—'} />
          <MiniMetric title="Commute" value={metrics ? `${Math.round(metrics.mobility_commute)} min` : '—'} />
          <MiniMetric title="Transit" value={metrics ? `${Math.round(metrics.mobility_transit_coverage)}%` : '—'} />
          <MiniMetric title="Equity" value={planning.beforeScores?.equityScore ?? Math.round(100 - (metrics?.equity_infra_gini ?? 0))} />
          <MiniMetric title="City Health" value={planning.afterScores?.cityHealth ?? planning.beforeScores?.cityHealth ?? '—'} />
          <MiniMetric title="15 Min City" value={planning.afterScores?.fifteenMinuteCityScore ?? planning.beforeScores?.fifteenMinuteCityScore ?? '—'} />
        </div>
      </PanelSection>
      <PanelSection title="Before and After">
        <div className="grid gap-2">
          <ScoreLine label="Emergency Access" before={planning.beforeScores?.emergencyAccess} after={planning.afterScores?.emergencyAccess} />
          <ScoreLine label="Transit Coverage" before={planning.beforeScores?.transitCoverage} after={planning.afterScores?.transitCoverage} />
          <ScoreLine label="Education Access" before={planning.beforeScores?.educationAccess} after={planning.afterScores?.educationAccess} />
          <ScoreLine label="Green Space" before={planning.beforeScores?.greenSpace} after={planning.afterScores?.greenSpace} />
          <ScoreLine label="Housing Access" before={planning.beforeScores?.housingAccess} after={planning.afterScores?.housingAccess} />
        </div>
      </PanelSection>
    </div>
  )
}

function CopilotPanel() {
  const selectedCity = useCityStore((state) => state.selectedCity)
  const activeScenario = useScenarioStore((state) => state.activeScenario)
  const { planning, analyzeDemo, applyAIPlan, applyDynamicAdvisoryPlan, openReport, focusRecommendation, acknowledgeDynamicAdvisory } = useSimulationStore()
  const topItem = planning.aiRecommendations.find((item) => planning.topRecommendation.itemIds?.includes(item.id)) ?? planning.aiRecommendations[0]
  const advisory = planning.dynamicAdvisory
  return (
    <div className="p-3 space-y-4">
      {advisory && (
        <PanelSection title="Live Advisory">
          <CopilotAdvisoryAlert
            advisory={advisory}
            density="compact"
            onReview={() => {
              acknowledgeDynamicAdvisory()
              focusRecommendation(advisory.recommendationId)
            }}
            onApply={() => applyDynamicAdvisoryPlan(activeScenario)}
            onRecommendationHoverEnter={() => focusRecommendation(advisory.recommendationId)}
            onRecommendationHoverLeave={() => focusRecommendation(null)}
          />
        </PanelSection>
      )}
      <PanelSection title="Copilot">
        <div className="rounded-xl p-3" style={{ background: 'var(--color-bg-hover)', border: '1px solid rgba(var(--rgb-accent), 0.22)' }}>
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--color-accent-cyan)' }}>
            <Sparkles size={13} />
            {planning.hasAnalyzed ? 'Top Recommendation' : 'Ready'}
          </div>
          <h3 className="mt-2 font-display text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {planning.hasAnalyzed ? planning.topRecommendation.zoneName : 'Ready to analyze infrastructure gaps'}
          </h3>
          <p className="mt-2 text-[11px] leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
            {planning.hasAnalyzed
              ? `Add ${topItem?.name ?? planning.topRecommendation.title.replace(/^Add\s+/i, '')}. ${planning.topRecommendation.reason}`
              : 'Run analysis to identify underserved zones and recommended fixes.'}
          </p>
          <div className="mt-3 grid gap-2">
            {!planning.hasAnalyzed ? (
              <button onClick={() => selectedCity && analyzeDemo(selectedCity.id, activeScenario)} className="rounded-lg px-3 py-2 text-xs font-semibold" style={{ background: 'var(--color-bg-panel)', color: 'var(--color-accent-cyan)', border: '1px solid rgba(var(--rgb-accent), 0.35)' }}>
                Analyze Infrastructure Gaps
              </button>
            ) : (
              <>
                <button onClick={() => applyAIPlan(activeScenario)} disabled={planning.hasAppliedAIPlan} className="rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-50" style={{ background: 'rgba(0,184,148,0.09)', color: 'var(--color-accent-green)', border: '1px solid rgba(0,184,148,0.38)' }}>
                  {planning.hasAppliedAIPlan ? 'Plan Applied' : 'Apply AI Plan'}
                </button>
                <button onClick={openReport} className="inline-flex items-center justify-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold" style={{ background: 'var(--color-bg-panel)', color: 'var(--color-accent-purple)', border: '1px solid var(--color-border-subtle)' }}>
                  <FileText size={12} />
                  Generate Report
                </button>
              </>
            )}
          </div>
        </div>
      </PanelSection>
    </div>
  )
}

function MiniMetric({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="rounded-xl p-3" style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border-subtle)' }}>
      <div className="font-mono text-[9px] uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>{title}</div>
      <div className="mt-1 font-display text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>{value}</div>
    </div>
  )
}

function ScoreLine({ label, before, after }: { label: string; before?: number; after?: number }) {
  const current = after ?? before
  return (
    <div className="rounded-lg px-3 py-2" style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border-subtle)' }}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
        <span className="font-mono text-xs" style={{ color: after ? 'var(--color-accent-green)' : 'var(--color-text-muted)' }}>
          {before ?? '—'}{typeof current === 'number' && after ? ` to ${current}` : ''}
        </span>
      </div>
    </div>
  )
}

function ScenarioCard({ id, active, onSelect }: { id: ScenarioId; active: boolean; onSelect: () => void }) {
  const details = SCENARIO_DETAILS[id]
  const Icon = details.icon
  const color = scenarioColors[id]
  return (
    <motion.button
      onClick={onSelect}
      whileHover={{ y: -1, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      className="w-full rounded-xl p-3 text-left"
      style={{
        background: active ? `${color}16` : 'var(--color-bg-card)',
        border: active ? `1px solid ${color}88` : '1px solid var(--color-border-subtle)',
        boxShadow: active ? `0 0 20px ${color}22` : 'none',
      }}
    >
      <div className="flex gap-2">
        <div className="w-8 h-8 rounded-lg grid place-items-center shrink-0" style={{ color, border: `1px solid ${color}55`, background: `${color}12` }}>
          <Icon size={15} />
        </div>
        <div className="min-w-0">
          <div className="font-display text-xs font-semibold" style={{ color: active ? color : 'var(--color-text-primary)' }}>{scenarioLabels[id]}</div>
          <p className="mt-0.5 text-[10px] leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>{details.description}</p>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Chip color={color}>{details.weights}</Chip>
        <Chip color="var(--color-accent-green)">{details.impact}</Chip>
      </div>
    </motion.button>
  )
}

function PanelSection({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="font-mono text-[10px] tracking-widest uppercase" style={{ color: 'var(--color-text-muted)' }}>{title}</div>
        {action}
      </div>
      {children}
    </section>
  )
}

function Chip({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span className="rounded-full px-2 py-0.5 font-mono text-[9px]" style={{ color, border: `1px solid ${color}40`, background: `${color}10` }}>
      {children}
    </span>
  )
}

function TrustCard() {
  return (
    <div className="rounded-xl p-3" style={{ border: '1px solid var(--color-border-subtle)', background: 'var(--color-bg-hover)' }}>
      <div className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--color-accent-cyan)' }}>Trust and Assumptions</div>
      <p className="mt-2 text-[11px] leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
        UrbanMind estimates infrastructure needs using simulated growth data, visible service gaps, and scenario based scoring. It supports early stage planning comparison and does not replace formal zoning, environmental review, traffic engineering, or public approval.
      </p>
    </div>
  )
}
