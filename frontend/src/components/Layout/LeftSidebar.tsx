import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  CloudSun,
  Crosshair,
  Flame,
  GraduationCap,
  Home,
  Layers,
  Leaf,
  Map,
  Scale,
  Shield,
  Sparkles,
  Train,
  Users,
} from 'lucide-react'
import { ZonePalette } from '@/components/UI/ZonePalette'
import { useCityStore } from '@/stores/cityStore'
import { useScenarioStore, scenarioColors, scenarioLabels } from '@/stores/scenarioStore'
import { useSimulationStore } from '@/stores/simulationStore'
import { useUIStore } from '@/stores/uiStore'
import type { CityProfile, ScenarioId } from '@/types/city.types'

const CITY_PRESETS = ['fremon', 'fremont', 'san_jose']

const TABS = [
  { id: 'planner', icon: Map, label: 'Planner' },
] as const

type TabId = typeof TABS[number]['id']

const CITY_META: Record<string, { type: string; growth: string; challenge: string; badge: string }> = {
  san_jose: { type: 'Bay Area metro', growth: '22% in 10 years', challenge: 'housing, transit, heat', badge: 'Preset' },
  fremon: { type: 'Generated future suburb', growth: '35% in 10 years', challenge: 'emergency access, schools, transit, green space, housing growth', badge: 'Demo ready' },
  fremont: { type: 'Bay Area suburb', growth: '30% in 10 years', challenge: 'transit, schools, clinics, housing growth', badge: 'Demo ready' },
  sacramento: { type: 'Capital region', growth: '18% in 10 years', challenge: 'flood, heat, service access', badge: 'Preset' },
  phoenix: { type: 'Desert growth city', growth: '26% in 10 years', challenge: 'heat, water, service access', badge: 'Preset' },
  austin: { type: 'Fast-growth tech city', growth: '32% in 10 years', challenge: 'housing, congestion, emergency access', badge: 'Preset' },
}

const SCENARIO_DETAILS: Record<ScenarioId, { icon: React.ElementType; description: string; weights: string; impact: string }> = {
  balanced: { icon: Scale, description: 'Balances access, growth, commute, and green space.', weights: 'All weights normal', impact: 'Stable baseline' },
  transit_first: { icon: Train, description: 'Prioritizes transit stops, rail access, and commute reduction.', weights: 'Transit + commute', impact: 'Lower commute' },
  climate_resilient: { icon: Leaf, description: 'Prioritizes parks, CO2, heat risk, and resilient green corridors.', weights: 'Green + CO2', impact: 'Lower emissions' },
  equity_focused: { icon: Users, description: 'Prioritizes underserved zones, schools, emergency access, and transit.', weights: 'Equity + access', impact: 'Fairer access' },
  emergency_ready: { icon: Flame, description: 'Prioritizes clinics, hospitals, police, fire, and response coverage.', weights: 'Emergency + response', impact: 'Faster response' },
  max_growth: { icon: Home, description: 'Prioritizes housing capacity while tracking commute and congestion risk.', weights: 'Housing + access', impact: 'More capacity' },
}

const LAYER_ITEMS = [
  { id: 'Existing hospitals', icon: Shield, label: 'Existing Clinics', color: '#E74C3C', group: 'Existing Infrastructure' },
  { id: 'Existing schools', icon: GraduationCap, label: 'Existing Schools', color: '#2E86C1', group: 'Existing Infrastructure' },
  { id: 'Existing parks', icon: Leaf, label: 'Existing Parks', color: '#27AE60', group: 'Existing Infrastructure' },
  { id: 'Existing transit', icon: Train, label: 'Existing Transit', color: '#8E44AD', group: 'Existing Infrastructure' },
  { id: 'Existing police stations', icon: Shield, label: 'Existing Police', color: '#5D4E75', group: 'Existing Infrastructure' },
  { id: 'Existing fire stations', icon: Flame, label: 'Existing Fire', color: '#E74C3C', group: 'Existing Infrastructure' },
  { id: 'Growth Pressure', icon: Users, label: 'Housing Growth', color: '#E67E22', group: 'Analysis Overlays' },
  { id: 'Proposed infrastructure', icon: Crosshair, label: 'Proposed Infrastructure', color: '#00D4FF', group: 'Future Scenario' },
  { id: 'AI Recommendations', icon: Sparkles, label: 'AI Recommendations', color: '#00D4FF', group: 'Future Scenario' },
  { id: 'Underserved zones', icon: CloudSun, label: 'Underserved Zones', color: '#FF5A3D', group: 'Analysis Overlays' },
  { id: 'Coverage Rings', icon: Crosshair, label: 'Coverage Rings', color: '#00B894', group: 'Analysis Overlays' },
] as const

export function LeftSidebar() {
  const [activePanel, setActivePanel] = useState<TabId | null>('planner')
  const [collapsed, setCollapsed] = useState(false)

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
          background: 'var(--color-bg-sidebar)',
          borderRight: '1px solid var(--color-border-subtle)',
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
              }}
              whileHover={{ scale: 1.06, y: -1 }}
              whileTap={{ scale: 0.94 }}
              className="relative flex h-9 w-9 items-center justify-center rounded-lg"
              style={{
                background: active ? 'var(--color-bg-hover)' : 'transparent',
                color: active ? 'var(--color-accent-cyan)' : 'var(--color-text-muted)',
                border: active ? '1px solid rgba(255,71,87,0.32)' : '1px solid transparent',
                boxShadow: active ? 'var(--shadow-pressed)' : 'none',
              }}
              title={label}
              aria-label={label}
            >
              <Icon size={16} />
              {active && (
                <motion.div
                  initial={{ opacity: 0, scaleY: 0.65 }}
                  animate={{ opacity: 1, scaleY: 1 }}
                  exit={{ opacity: 0, scaleY: 0.65 }}
                  transition={{ duration: 0.16, ease: 'easeOut' }}
                  className="absolute rounded-full"
                  style={{
                    right: 5,
                    top: 8,
                    bottom: 8,
                    width: 4,
                    transformOrigin: 'center',
                    background: 'var(--color-accent-cyan)',
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
              background: 'var(--color-bg-sidebar)',
              borderRight: '1px solid var(--color-border-subtle)',
              boxShadow: '12px 0 34px rgba(0,0,0,0.18)',
              backdropFilter: 'blur(18px)',
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
              {activePanel === 'planner' && <PlannerPanel />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function PlannerPanel() {
  const { cities, selectedCity, selectCity } = useCityStore()
  const { activeScenario, setScenario } = useScenarioStore()
  const { planning, hydratePlanningForCity, setBudgetLevel, setTimelineYear } = useSimulationStore()
  const { activeLayers, toggleLayer } = useUIStore()

  const presetCities = useMemo(
    () => CITY_PRESETS.map((id) => cities.find((city) => city.id === id)).filter(Boolean) as CityProfile[],
    [cities]
  )
  const chooseCity = (city: CityProfile) => {
    selectCity(city)
    hydratePlanningForCity(city.id)
  }

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
      <PanelSection title="City">
        <div className="grid gap-2">
          {presetCities.map((city) => (
            <CityPresetCard
              key={city.id}
              city={city}
              active={selectedCity?.id === city.id}
              onSelect={() => chooseCity(city)}
            />
          ))}
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

      <PanelSection title="Layers">
        <div className="grid gap-3">
          {['Existing Infrastructure', 'Future Scenario', 'Analysis Overlays'].map((group) => (
            <div key={group}>
              <div className="mb-1.5 font-mono text-[9px] tracking-widest uppercase" style={{ color: 'var(--color-text-muted)' }}>{group}</div>
              <div className="grid gap-1.5">
                {LAYER_ITEMS.filter((item) => item.group === group).map((item) => (
                  <LayerSwitch
                    key={item.id}
                    item={item}
                    checked={activeLayers.has(item.id)}
                    onToggle={() => toggleLayer(item.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </PanelSection>

      <PanelSection title="Tools">
        <ZonePalette compact />
      </PanelSection>

      <PanelSection title="2026 to 2036 Growth Timeline">
        <details>
          <summary className="cursor-pointer text-xs font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
            Expand timeline
          </summary>
          <div className="mt-2 grid grid-cols-5 gap-1">
            {([2026, 2028, 2030, 2032, 2036] as const).map((year) => (
              <button
                key={year}
                onClick={() => setTimelineYear(year)}
                className="rounded-lg py-2 font-mono text-[9px]"
                style={{
                  border: year === planning.timelineYear ? '1px solid rgba(255,71,87,0.4)' : '1px solid var(--color-border-subtle)',
                  color: year === planning.timelineYear ? 'var(--color-accent-cyan)' : 'var(--color-text-muted)',
                  background: year === planning.timelineYear ? 'var(--color-bg-hover)' : 'var(--color-bg-card)',
                }}
              >
                {year}
              </button>
            ))}
          </div>
        </details>
      </PanelSection>

      <TrustCard />
    </div>
  )
}

function CityPresetCard({ city, active, onSelect }: { city: CityProfile; active: boolean; onSelect: () => void }) {
  const meta = CITY_META[city.id] ?? { type: 'City preset', growth: 'Scenario ready', challenge: city.key_planning_challenge, badge: 'Preset' }
  return (
    <motion.button
      onClick={onSelect}
      whileHover={{ y: -1, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      className="w-full rounded-xl p-3 text-left"
      style={{
        background: active ? 'var(--color-bg-hover)' : 'var(--color-bg-card)',
        border: active ? '1px solid rgba(255,71,87,0.35)' : '1px solid var(--color-border-subtle)',
        boxShadow: active ? 'var(--shadow-sm)' : 'none',
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex gap-2 min-w-0">
          <div className="w-9 h-9 rounded-xl grid place-items-center shrink-0" style={{ background: 'var(--color-bg-hover)', border: '1px solid var(--color-border-subtle)', color: 'var(--color-accent-cyan)' }}>
            <Building2 size={16} />
          </div>
          <div className="min-w-0">
            <div className="font-display text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{city.name}</div>
            <div className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{meta.type}</div>
          </div>
        </div>
        <span className="rounded-full px-2 py-0.5 font-mono text-[8px] uppercase" style={{ color: active ? 'var(--color-accent-green)' : 'var(--color-text-muted)', border: '1px solid var(--color-border-subtle)', background: 'var(--color-bg-hover)' }}>
          {meta.badge}
        </span>
      </div>
      <p className="mt-2 text-[11px] leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
        Challenge: {meta.challenge}
      </p>
      <div className="mt-2 font-mono text-[10px]" style={{ color: 'var(--color-accent-warning)' }}>Growth: {meta.growth}</div>
    </motion.button>
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

function LayerSwitch({ item, checked, onToggle }: { item: typeof LAYER_ITEMS[number]; checked: boolean; onToggle: () => void }) {
  const Icon = item.icon
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between gap-2 rounded-lg px-2.5 py-2"
      style={{ background: checked ? 'var(--color-bg-hover)' : 'var(--color-bg-card)', border: checked ? `1px solid ${item.color}55` : '1px solid var(--color-border-subtle)' }}
      aria-pressed={checked}
    >
      <span className="flex items-center gap-2 min-w-0">
        <span className="w-5 h-5 rounded-md grid place-items-center shrink-0" style={{ color: item.color, border: `1px solid ${item.color}55`, background: `${item.color}12` }}>
          <Icon size={11} />
        </span>
        <span className="text-[11px] truncate" style={{ color: 'var(--color-text-secondary)' }}>{item.label}</span>
      </span>
      <span style={{ width: 28, height: 16, borderRadius: 999, padding: 2, background: checked ? item.color : 'rgba(255,255,255,0.12)', display: 'flex', justifyContent: checked ? 'flex-end' : 'flex-start' }}>
        <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#fff' }} />
      </span>
    </button>
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
