import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Bike,
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
  Mountain,
  Plus,
  Route,
  Scale,
  Shield,
  Sparkles,
  Train,
  Users,
  Waves,
  Zap,
} from 'lucide-react'
import { MetricsDashboard } from '@/components/Simulation/MetricsDashboard'
import { AIPanel } from '@/components/AI/AIPanel'
import { ActionsPanel } from '@/components/Simulation/ActionsPanel'
import { ZonePalette } from '@/components/UI/ZonePalette'
import { useCityStore } from '@/stores/cityStore'
import { useScenarioStore, scenarioColors, scenarioLabels } from '@/stores/scenarioStore'
import { useSimulationStore } from '@/stores/simulationStore'
import { useUIStore } from '@/stores/uiStore'
import type { CityProfile, ScenarioId } from '@/types/city.types'

const TABS = [
  { id: 'planner', icon: Map, label: 'Planner' },
  { id: 'metrics', icon: Scale, label: 'Metrics' },
  { id: 'ai', icon: Sparkles, label: 'Copilot' },
  { id: 'actions', icon: Layers, label: 'Actions' },
  { id: 'placement', icon: Crosshair, label: 'Tools' },
] as const

type TabId = typeof TABS[number]['id']

const CITY_PRESETS = ['san_jose', 'fremont', 'sacramento', 'phoenix', 'austin']

const CITY_META: Record<string, { type: string; growth: string; challenge: string; badge: string }> = {
  san_jose: { type: 'Bay Area metro', growth: '22% in 10 years', challenge: 'housing, transit, heat', badge: 'Preset' },
  fremont: { type: 'Bay Area suburb', growth: '30% in 10 years', challenge: 'transit, schools, clinics, housing growth', badge: 'Demo ready' },
  sacramento: { type: 'Capital region', growth: '18% in 10 years', challenge: 'flood, heat, service access', badge: 'Preset' },
  phoenix: { type: 'Desert growth city', growth: '26% in 10 years', challenge: 'heat, water, roads', badge: 'Preset' },
  austin: { type: 'Fast-growth tech city', growth: '32% in 10 years', challenge: 'housing, congestion, emergency access', badge: 'Preset' },
}

const SCENARIO_DETAILS: Record<ScenarioId, { icon: React.ElementType; description: string; weights: string; impact: string }> = {
  balanced: { icon: Scale, description: 'Balances access, growth, commute, and green space.', weights: 'All weights normal', impact: 'Stable baseline' },
  transit_first: { icon: Train, description: 'Prioritizes bus routes, rail access, bike lanes, and commute reduction.', weights: 'Transit + commute', impact: 'Lower commute' },
  climate_resilient: { icon: Leaf, description: 'Prioritizes parks, CO2, heat risk, and resilient green corridors.', weights: 'Green + CO2', impact: 'Lower emissions' },
  equity_focused: { icon: Users, description: 'Prioritizes underserved zones, schools, emergency access, and transit.', weights: 'Equity + access', impact: 'Fairer access' },
  emergency_ready: { icon: Flame, description: 'Prioritizes clinics, hospitals, police, fire, and response coverage.', weights: 'Emergency + response', impact: 'Faster response' },
  max_growth: { icon: Home, description: 'Prioritizes housing capacity while tracking commute and congestion risk.', weights: 'Housing + roads', impact: 'More capacity' },
}

const LAYER_ITEMS = [
  { id: 'Existing hospitals', icon: Shield, label: 'Existing Clinics', color: '#E74C3C', group: 'Existing Infrastructure' },
  { id: 'Existing schools', icon: GraduationCap, label: 'Existing Schools', color: '#2E86C1', group: 'Existing Infrastructure' },
  { id: 'Existing parks', icon: Leaf, label: 'Existing Parks', color: '#27AE60', group: 'Existing Infrastructure' },
  { id: 'Existing transit', icon: Train, label: 'Existing Transit', color: '#8E44AD', group: 'Existing Infrastructure' },
  { id: 'Existing police stations', icon: Shield, label: 'Existing Police', color: '#5D4E75', group: 'Existing Infrastructure' },
  { id: 'Existing fire stations', icon: Flame, label: 'Existing Fire', color: '#E74C3C', group: 'Existing Infrastructure' },
  { id: 'Existing Roads', icon: Route, label: 'Existing Roads', color: '#8B949E', group: 'Existing Infrastructure' },
  { id: 'Growth Pressure', icon: Users, label: 'Housing Growth', color: '#E67E22', group: 'Analysis Overlays' },
  { id: 'Proposed infrastructure', icon: Crosshair, label: 'Proposed Infrastructure', color: '#00D4FF', group: 'Future Scenario' },
  { id: 'AI Recommendations', icon: Sparkles, label: 'AI Recommendations', color: '#00D4FF', group: 'Future Scenario' },
  { id: 'Underserved zones', icon: CloudSun, label: 'Underserved Zones', color: '#FF5A3D', group: 'Analysis Overlays' },
  { id: 'Heatmap Mode', icon: Zap, label: 'Heatmap Mode', color: '#FFB800', group: 'Analysis Overlays' },
] as const

const TERRAIN_OPTIONS = [
  { id: 'coastal', label: 'Coastal', icon: Waves },
  { id: 'suburban', label: 'Suburban', icon: Home },
  { id: 'desert', label: 'Desert', icon: CloudSun },
  { id: 'mountain', label: 'Mountain', icon: Mountain },
  { id: 'river_valley', label: 'River Valley', icon: Waves },
  { id: 'dense_urban', label: 'Dense Urban', icon: Building2 },
]

export function LeftSidebar() {
  const [activePanel, setActivePanel] = useState<TabId | null>('planner')
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div
      className="flex shrink-0"
      style={{
        width: collapsed ? 52 : 368,
        transition: 'width 300ms cubic-bezier(0.16,1,0.3,1)',
      }}
    >
      <div
        className="flex flex-col items-center gap-1.5 py-3 px-1.5 shrink-0 w-13"
        style={{
          width: 52,
          background: 'rgba(8,13,22,0.82)',
          borderRight: '1px solid rgba(0,212,255,0.12)',
          backdropFilter: 'blur(18px)',
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
              whileHover={{ scale: 1.08, y: -1 }}
              whileTap={{ scale: 0.94 }}
              className="w-10 h-10 flex items-center justify-center rounded-xl transition-all relative"
              style={
                active
                  ? {
                      background: 'linear-gradient(135deg, rgba(0,212,255,0.18), rgba(124,58,237,0.15))',
                      color: 'var(--color-accent-cyan)',
                      border: '1px solid rgba(0,212,255,0.32)',
                      boxShadow: '0 0 18px rgba(0,212,255,0.12)',
                    }
                  : {
                      color: 'var(--color-text-muted)',
                      border: '1px solid transparent',
                    }
              }
              title={label}
              aria-label={label}
            >
              <Icon size={16} />
              {active && (
                <motion.div
                  layoutId="sidebar-active-dot"
                  className="absolute right-0.5 top-1/2 -translate-y-1/2 w-1 h-5 rounded-full"
                  style={{ background: 'var(--color-accent-cyan)' }}
                />
              )}
            </motion.button>
          )
        })}

        <div className="flex-1" />

        <motion.button
          onClick={() => setCollapsed((v) => !v)}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.93 }}
          className="w-10 h-10 flex items-center justify-center rounded-xl"
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
              background: 'linear-gradient(180deg, rgba(17,24,39,0.92), rgba(10,15,25,0.96))',
              borderRight: '1px solid rgba(0,212,255,0.12)',
              boxShadow: '12px 0 34px rgba(0,0,0,0.18)',
              backdropFilter: 'blur(18px)',
            }}
          >
            <div
              className="px-4 py-4 shrink-0"
              style={{ borderBottom: '1px solid rgba(0,212,255,0.1)' }}
            >
              <div className="flex items-center gap-2">
                <div className="w-1 h-5 rounded-full" style={{ background: 'var(--color-accent-cyan)', boxShadow: '0 0 12px rgba(0,212,255,0.6)' }} />
                <h2 className="font-display font-semibold text-sm tracking-wide" style={{ color: 'var(--color-text-primary)' }}>
                  {TABS.find((t) => t.id === activePanel)?.label}
                </h2>
              </div>
              {activePanel === 'planner' && (
                <p className="mt-2 text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                  Pick a city, set the scenario, then run an infrastructure gap analysis.
                </p>
              )}
            </div>

            <div className="flex-1 overflow-y-auto">
              {activePanel === 'planner' && <PlannerPanel />}
              {activePanel === 'metrics' && <MetricsDashboard />}
              {activePanel === 'ai' && <AIPanel />}
              {activePanel === 'actions' && <ActionsPanel />}
              {activePanel === 'placement' && <ZonePalette />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function PlannerPanel() {
  const { cities, selectedCity, selectCity, addCity } = useCityStore()
  const { activeScenario, setScenario } = useScenarioStore()
  const { planning, analyzeDemo, setPlanningConstraint } = useSimulationStore()
  const { activeLayers, toggleLayer } = useUIStore()
  const [createOpen, setCreateOpen] = useState(false)

  const presetCities = useMemo(
    () => cities.filter((city) => CITY_PRESETS.includes(city.id)),
    [cities]
  )

  const createCity = (city: CityProfile) => {
    addCity(city)
    setCreateOpen(false)
    analyzeDemo(city.id, activeScenario)
  }

  return (
    <div className="p-4 space-y-5">
      <PanelSection title="City" action={<button onClick={() => setCreateOpen(true)} className="panel-link"><Plus size={11} />Create New City</button>}>
        <div className="grid gap-2">
          {presetCities.map((city) => (
            <CityPresetCard
              key={city.id}
              city={city}
              active={selectedCity?.id === city.id}
              onSelect={() => selectCity(city)}
            />
          ))}
          <button
            onClick={() => setCreateOpen(true)}
            className="w-full rounded-xl p-3 text-left"
            style={{
              background: 'rgba(0,212,255,0.035)',
              border: '1px dashed rgba(0,212,255,0.24)',
              color: 'var(--color-accent-cyan)',
            }}
          >
            <div className="flex items-center gap-2 font-display text-sm font-semibold">
              <Plus size={15} />
              Create New City
            </div>
            <p className="mt-1 text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
              Generate a simulated city grid with starter infrastructure and gaps.
            </p>
          </button>
        </div>
      </PanelSection>

      <PanelSection title="Growth Scenario">
        <div className="grid gap-2">
          {(Object.keys(SCENARIO_DETAILS) as ScenarioId[]).map((id) => (
            <ScenarioCard key={id} id={id} active={activeScenario === id} onSelect={() => setScenario(id)} />
          ))}
        </div>
      </PanelSection>

      <PanelSection title="Constraints">
        <div className="grid gap-3">
          <ConstraintRow label="Budget" value={planning.budget / 1_000_000} min={25} max={250} suffix="M" onChange={(value) => setPlanningConstraint('budget', value * 1_000_000)} />
          <ConstraintRow label="Population Growth" value={planning.growthPercent} min={5} max={60} suffix="%" onChange={() => undefined} />
          <ConstraintRow label="Service Radius" value={planning.serviceRadius} min={600} max={2400} suffix="m" onChange={(value) => setPlanningConstraint('serviceRadius', value)} />
          <div className="grid grid-cols-4 gap-1">
            {[5, 10, 20, 50].map((year) => (
              <button key={year} className="rounded-lg py-2 font-mono text-[10px]" style={{ border: year === planning.horizonYears ? '1px solid rgba(0,212,255,0.35)' : '1px solid rgba(255,255,255,0.08)', color: year === planning.horizonYears ? 'var(--color-accent-cyan)' : 'var(--color-text-muted)', background: year === planning.horizonYears ? 'rgba(0,212,255,0.08)' : 'rgba(255,255,255,0.025)' }}>
                {year}Y
              </button>
            ))}
          </div>
        </div>
      </PanelSection>

      <PanelSection title="Map Layers">
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

      <PanelSection title="Infrastructure Tools">
        <ZonePalette compact />
      </PanelSection>

      <TrustCard />

      <CreateCityModal open={createOpen} onClose={() => setCreateOpen(false)} onCreate={createCity} />
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
        background: active ? 'linear-gradient(135deg, rgba(0,212,255,0.13), rgba(124,58,237,0.08))' : 'rgba(255,255,255,0.035)',
        border: active ? '1px solid rgba(0,212,255,0.38)' : '1px solid rgba(255,255,255,0.07)',
        boxShadow: active ? '0 0 22px rgba(0,212,255,0.08)' : 'none',
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex gap-2 min-w-0">
          <div className="w-9 h-9 rounded-xl grid place-items-center shrink-0" style={{ background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.18)', color: 'var(--color-accent-cyan)' }}>
            <Building2 size={16} />
          </div>
          <div className="min-w-0">
            <div className="font-display text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{city.name}</div>
            <div className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{meta.type}</div>
          </div>
        </div>
        <span className="rounded-full px-2 py-0.5 font-mono text-[8px] uppercase" style={{ color: active ? 'var(--color-accent-green)' : 'var(--color-accent-cyan)', border: '1px solid rgba(0,212,255,0.22)', background: 'rgba(0,212,255,0.06)' }}>
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
        background: active ? `${color}16` : 'rgba(255,255,255,0.032)',
        border: active ? `1px solid ${color}88` : '1px solid rgba(255,255,255,0.07)',
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
      style={{ background: checked ? 'rgba(0,212,255,0.055)' : 'rgba(255,255,255,0.025)', border: checked ? `1px solid ${item.color}55` : '1px solid rgba(255,255,255,0.06)' }}
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

function CreateCityModal({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (city: CityProfile) => void }) {
  const [name, setName] = useState('Fremont')
  const [terrain, setTerrain] = useState('suburban')
  const [population, setPopulation] = useState(230000)
  const [growth, setGrowth] = useState(30)
  const [priority, setPriority] = useState('balanced')
  const [budget, setBudget] = useState('medium')
  const [horizon, setHorizon] = useState(10)

  const generate = () => {
    const cityName = name.trim() || 'Fremont'
    const id = `generated_${cityName.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_${Date.now()}`
    onCreate({
      id,
      name: cityName,
      country: 'Simulated City',
      center_lat: 37.5485,
      center_lng: -121.9886,
      default_zoom: 12,
      climate_zone: terrain.replace(/_/g, ' '),
      population_current: population,
      gdp_per_capita: 82000,
      urban_growth_rate: growth / 10,
      key_planning_challenge: `${cityName} is a generated ${terrain.replace(/_/g, ' ')} planning scenario focused on ${priority}, ${growth}% growth, ${budget} budget, and a ${horizon}-year horizon.`,
      expansion_constraint: 'Generated scenario constraints from local demo inputs',
      bbox: [-122.09, 37.45, -121.86, 37.62],
      landmarks: [
        { name: `${cityName} Civic Clinic`, lat: 37.548, lng: -121.982, zone_type_id: 'HEALTH_CLINIC', category: 'Healthcare', data_source: 'projected' },
        { name: `${cityName} Central School`, lat: 37.537, lng: -121.984, zone_type_id: 'EDU_HIGH', category: 'Education', data_source: 'projected' },
        { name: `${cityName} Green Corridor`, lat: 37.542, lng: -121.972, zone_type_id: 'PARK_SMALL', category: 'Parks & Green', data_source: 'projected' },
        { name: `${cityName} Transit Hub`, lat: 37.557, lng: -121.976, zone_type_id: 'BUS_STATION', category: 'Transit', data_source: 'projected' },
        { name: `${cityName} Mixed-Use Growth Area`, lat: 37.506, lng: -121.943, zone_type_id: 'RES_MIXED_USE', category: 'Residential', data_source: 'projected' },
      ],
    })
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[90] flex items-center justify-center p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(8px)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 18 }}
            className="scanline"
            style={{ width: 680, maxWidth: '94vw', background: 'linear-gradient(180deg, rgba(17,24,39,0.98), rgba(8,13,22,0.98))', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 18, boxShadow: '0 24px 90px rgba(0,0,0,0.65), 0 0 40px rgba(0,212,255,0.08)' }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="p-5" style={{ borderBottom: '1px solid rgba(0,212,255,0.12)' }}>
              <div className="font-display text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Create New City</div>
              <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>Generate a simulated city plan with starter zones, services, and growth gaps.</p>
            </div>
            <div className="p-5 grid grid-cols-2 gap-4">
              <Field label="City Name">
                <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Fremont" className="premium-input" />
              </Field>
              <Field label="Population Size">
                <input type="number" value={population} onChange={(event) => setPopulation(Number(event.target.value))} className="premium-input" />
              </Field>
              <Field label="Growth Rate">
                <input type="range" min={5} max={60} value={growth} onChange={(event) => setGrowth(Number(event.target.value))} style={{ width: '100%', accentColor: 'var(--color-accent-cyan)' }} />
                <div className="font-mono text-[10px]" style={{ color: 'var(--color-accent-cyan)' }}>{growth}% growth</div>
              </Field>
              <Field label="Time Horizon">
                <select value={horizon} onChange={(event) => setHorizon(Number(event.target.value))} className="premium-input">
                  {[5, 10, 20, 50].map((value) => <option key={value} value={value}>{value} years</option>)}
                </select>
              </Field>
              <Field label="Terrain Type">
                <div className="grid grid-cols-3 gap-2">
                  {TERRAIN_OPTIONS.map((option) => {
                    const Icon = option.icon
                    const active = terrain === option.id
                    return (
                      <button key={option.id} onClick={() => setTerrain(option.id)} className="rounded-lg p-2 text-[10px]" style={{ border: active ? '1px solid rgba(0,212,255,0.45)' : '1px solid rgba(255,255,255,0.08)', color: active ? 'var(--color-accent-cyan)' : 'var(--color-text-muted)', background: active ? 'rgba(0,212,255,0.08)' : 'rgba(255,255,255,0.03)' }}>
                        <Icon size={13} className="mx-auto mb-1" />
                        {option.label}
                      </button>
                    )
                  })}
                </div>
              </Field>
              <Field label="Planning Priority">
                <select value={priority} onChange={(event) => setPriority(event.target.value)} className="premium-input">
                  {['balanced', 'transit', 'climate', 'equity', 'emergency', 'housing'].map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
              </Field>
              <Field label="Budget Level">
                <select value={budget} onChange={(event) => setBudget(event.target.value)} className="premium-input">
                  {['low', 'medium', 'high'].map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
              </Field>
              <div className="rounded-xl p-3" style={{ border: '1px solid rgba(0,212,255,0.12)', background: 'rgba(0,212,255,0.04)' }}>
                <div className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--color-accent-cyan)' }}>Generated plan includes</div>
                <p className="mt-2 text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                  Residential, commercial, parks, transit corridors, schools, clinics, roads, utilities, starting metrics, and seeded infrastructure gaps.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-5" style={{ borderTop: '1px solid rgba(0,212,255,0.12)' }}>
              <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm" style={{ border: '1px solid rgba(255,255,255,0.1)', color: 'var(--color-text-secondary)' }}>Cancel</button>
              <button onClick={generate} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ border: '1px solid rgba(0,212,255,0.42)', color: 'var(--color-accent-cyan)', background: 'rgba(0,212,255,0.1)' }}>Generate City</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1.5 font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>{label}</div>
      {children}
    </label>
  )
}

function ConstraintRow({ label, value, min, max, suffix, onChange }: { label: string; value: number; min: number; max: number; suffix: string; onChange: (value: number) => void }) {
  return (
    <label>
      <div className="mb-1 flex justify-between">
        <span className="font-mono text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{label}</span>
        <span className="font-mono text-[10px]" style={{ color: 'var(--color-accent-cyan)' }}>{Math.round(value)}{suffix}</span>
      </div>
      <input type="range" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} className="w-full" style={{ accentColor: 'var(--color-accent-cyan)' }} />
    </label>
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
    <div className="rounded-xl p-3" style={{ border: '1px solid rgba(0,212,255,0.14)', background: 'linear-gradient(135deg, rgba(0,212,255,0.055), rgba(124,58,237,0.045))' }}>
      <div className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--color-accent-cyan)' }}>Trust and Assumptions</div>
      <p className="mt-2 text-[11px] leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
        UrbanMind estimates infrastructure needs using simulated growth data, visible service gaps, and scenario based scoring. It supports early stage planning comparison and does not replace formal zoning, environmental review, traffic engineering, or public approval.
      </p>
    </div>
  )
}
