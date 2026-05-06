import { create } from 'zustand'
import { STATIC_CITIES } from '@/data/staticCities'
import {
  calculatePlanningScores,
  DEFAULT_GROWTH_PERCENT,
  DEFAULT_HORIZON_YEARS,
  FREMONT_AI_RECOMMENDATIONS,
  FREMONT_EXISTING_INFRASTRUCTURE,
  FREMONT_GROWTH_PRESSURE_ZONES,
  FREMONT_TOP_RECOMMENDATION,
  FREMONT_UNDERSERVED_ZONES,
  markImprovedZones,
} from '@/data/fremontDemo'
import type { AIRecommendation, GrowthPressureZone, InfrastructureItem, MetricsSnapshot, PlanningScores, SavedPlanningScenario, ScenarioId, UnderservedZone } from '@/types/city.types'
import type { AgentAction, SimulationFrame } from '@/types/simulation.types'

type Speed = 1 | 5 | 10 | 50

export interface UserPlacedZone {
  id: string
  lat: number
  lng: number
  zone_type_id: string
  infrastructureId?: string
}

interface PlanningState {
  cityId: string
  growthPercent: number
  horizonYears: number
  infrastructure: InfrastructureItem[]
  underservedZones: UnderservedZone[]
  growthPressureZones: GrowthPressureZone[]
  aiRecommendations: InfrastructureItem[]
  topRecommendation: AIRecommendation
  beforeScores: PlanningScores | null
  afterScores: PlanningScores | null
  hasAnalyzed: boolean
  hasAppliedAIPlan: boolean
  isReportOpen: boolean
  selectedInfrastructureId: string | null
  undoStack: InfrastructureItem[][]
  savedScenarios: SavedPlanningScenario[]
  demoMode: boolean
  budget: number
  priority: ScenarioId
  serviceRadius: number
  climatePriority: number
  equityPriority: number
}

interface SimulationStore {
  sessionId: string | null
  wsUrl: string | null
  isRunning: boolean
  isPaused: boolean
  currentYear: number
  speed: Speed
  currentFrame: SimulationFrame | null
  frameHistory: SimulationFrame[]
  metricsHistory: MetricsSnapshot[]
  lastActions: AgentAction[]
  userZones: UserPlacedZone[]
  planning: PlanningState
  startSimulation: (cityId: string, scenarioId: string, sandboxConfig?: Record<string, unknown>) => Promise<void>
  setSession: (sessionId: string, wsUrl?: string) => void
  pauseSimulation: () => void
  resumeSimulation: () => void
  setSpeed: (speed: number) => void
  receiveFrame: (frame: SimulationFrame) => void
  scrubToYear: (year: number) => void
  addUserZone: (zone: UserPlacedZone) => void
  removeUserZone: (id: string) => void
  analyzeDemo: (cityId: string, scenarioId: string) => void
  applyAIPlan: (scenarioId?: string) => void
  addInfrastructure: (item: InfrastructureItem) => void
  deleteInfrastructure: (id: string) => void
  selectInfrastructure: (id: string | null) => void
  undoInfrastructure: () => void
  saveScenario: () => void
  loadScenario: (id: string) => void
  duplicateScenario: (id: string) => void
  resetScenario: () => void
  setDemoMode: (enabled: boolean) => void
  setPlanningConstraint: (key: 'budget' | 'serviceRadius' | 'climatePriority' | 'equityPriority', value: number) => void
  openReport: () => void
  closeReport: () => void
  reset: () => void
}

const API_BASE = import.meta.env.VITE_API_URL ?? '/api'

const initialState = {
  sessionId: null,
  wsUrl: null,
  isRunning: false,
  isPaused: false,
  currentYear: 0,
  speed: 1 as Speed,
  currentFrame: null,
  frameHistory: [],
  metricsHistory: [],
  lastActions: [],
  userZones: [] as UserPlacedZone[],
  planning: createInitialPlanningState(),
}

export const useSimulationStore = create<SimulationStore>((set, get) => ({
  ...initialState,

  startSimulation: async (cityId, scenarioId, sandboxConfig) => {
    try {
      const response = await fetch(`${API_BASE}/simulation/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city_id: cityId, scenario_id: scenarioId, sandbox_config: sandboxConfig }),
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()
      set({ ...initialState, sessionId: data.session_id, wsUrl: data.ws_url, isRunning: true, currentYear: 0 })
    } catch {
      set({ ...initialState, sessionId: 'offline', isRunning: true, currentYear: 0 })
    }
  },

  setSession: (sessionId, wsUrl) => set({ sessionId, wsUrl: wsUrl ?? `/ws/${sessionId}`, isRunning: true }),
  pauseSimulation: () => set({ isPaused: true, isRunning: false }),
  resumeSimulation: () => set({ isPaused: false, isRunning: true }),
  setSpeed: (speed) => set({ speed: ([1, 5, 10, 50].includes(speed) ? speed : 1) as Speed }),

  receiveFrame: (frame) =>
    set((state) => ({
      currentFrame: frame,
      currentYear: frame.year,
      frameHistory: [...state.frameHistory.filter((item) => item.year !== frame.year), frame].sort((a, b) => a.year - b.year),
      metricsHistory: [...state.metricsHistory.filter((item) => item.year !== frame.metrics_snapshot.year), frame.metrics_snapshot].sort((a, b) => a.year - b.year),
      lastActions: [...frame.agent_actions, ...state.lastActions].slice(0, 10),
    })),

  scrubToYear: (year) => {
    const frame = get().frameHistory.find((item) => item.year === year)
    if (frame) set({ currentFrame: frame, currentYear: frame.year })
  },

  addUserZone: (zone) => set((state) => ({ userZones: [...state.userZones, zone] })),
  removeUserZone: (id) => set((state) => ({ userZones: state.userZones.filter((z) => z.id !== id) })),

  analyzeDemo: (cityId, scenarioId) => {
    const shift = cityShift(cityId)
    const infrastructure = shiftInfrastructure(FREMONT_EXISTING_INFRASTRUCTURE, shift)
    const underservedZones = shiftZones(FREMONT_UNDERSERVED_ZONES, shift).map((zone) => ({ ...zone, isImproved: false, improved: false }))
    const growthPressureZones = shiftGrowthZones(FREMONT_GROWTH_PRESSURE_ZONES, shift)
    const scenario = normalizeScenario(scenarioId)
    const beforeScores = calculatePlanningScores(infrastructure, underservedZones, DEFAULT_GROWTH_PERCENT, scenario)
    const frame = scoresToFrame(beforeScores, 10, infrastructure, underservedZones)
    set((state) => ({
      sessionId: state.sessionId ?? 'offline',
      isRunning: false,
      isPaused: true,
      currentYear: DEFAULT_HORIZON_YEARS,
      currentFrame: frame,
      frameHistory: [frame],
      metricsHistory: [frame.metrics_snapshot],
      lastActions: [
        {
          x: 0,
          y: 0,
          lat: 37.494,
          lng: -121.927,
          zone_type_id: 'HEALTH_CLINIC',
          zone_display_name: 'Southeast Fremont Medical Clinic',
          sps_score: FREMONT_TOP_RECOMMENDATION.confidence,
          placement_reason: FREMONT_TOP_RECOMMENDATION.reason,
        },
      ],
      planning: {
        ...state.planning,
        cityId,
        growthPercent: DEFAULT_GROWTH_PERCENT,
        horizonYears: DEFAULT_HORIZON_YEARS,
        infrastructure,
        underservedZones,
        growthPressureZones,
        aiRecommendations: shiftInfrastructure(FREMONT_AI_RECOMMENDATIONS, shift),
        beforeScores,
        afterScores: null,
        hasAnalyzed: true,
        hasAppliedAIPlan: false,
        selectedInfrastructureId: null,
        undoStack: [],
      },
    }))
  },

  applyAIPlan: (scenarioId = 'balanced') => set((state) => {
    if (!state.planning.hasAnalyzed || state.planning.hasAppliedAIPlan) return state
    const applied = state.planning.aiRecommendations.map((item) => ({ ...item, status: 'proposed' as const }))
    const infrastructure = [...state.planning.infrastructure, ...applied]
    const underservedZones = markImprovedZones(state.planning.underservedZones, applied.map((item) => item.id))
    const afterScores = calculatePlanningScores(infrastructure, underservedZones, state.planning.growthPercent, normalizeScenario(scenarioId))
    const frame = scoresToFrame(afterScores, state.planning.horizonYears, infrastructure, underservedZones)
    return {
      currentFrame: frame,
      frameHistory: [state.frameHistory[0] ?? frame, frame],
      metricsHistory: [state.metricsHistory[0] ?? frame.metrics_snapshot, frame.metrics_snapshot],
      lastActions: [
        ...applied.map((item, index) => ({
          x: index,
          y: 0,
          lng: Array.isArray(item.coordinates[0]) ? undefined : item.coordinates[0] as number,
          lat: Array.isArray(item.coordinates[0]) ? undefined : item.coordinates[1] as number,
          zone_type_id: categoryToZoneType(item.category),
          zone_display_name: item.name,
          sps_score: item.confidence,
          placement_reason: item.reason,
        })),
        ...state.lastActions,
      ].slice(0, 12),
      planning: {
        ...state.planning,
        infrastructure,
        underservedZones,
        afterScores,
        hasAppliedAIPlan: true,
        undoStack: [...state.planning.undoStack, state.planning.infrastructure],
      },
    }
  }),

  addInfrastructure: (item) => set((state) => {
    const infrastructure = [...state.planning.infrastructure, item]
    const underservedZones = state.planning.underservedZones.map((zone) =>
      item.category === 'clinic' && (zone.gapType === 'hospital_access' || zone.gapType === 'emergency_access')
        ? { ...zone, isImproved: true, improved: true, afterScore: Math.min(100, zone.beforeScore + 18) }
        : item.category === 'school' && zone.gapType === 'school_access'
        ? { ...zone, isImproved: true, improved: true, afterScore: Math.min(100, zone.beforeScore + 14) }
        : item.category === 'park' && (zone.gapType === 'park_access' || zone.gapType === 'green_space')
        ? { ...zone, isImproved: true, improved: true, afterScore: Math.min(100, zone.beforeScore + 12) }
        : item.category === 'transit_stop' && zone.gapType === 'transit_access'
        ? { ...zone, isImproved: true, improved: true, afterScore: Math.min(100, zone.beforeScore + 13) }
        : item.category === 'mixed_use' && zone.gapType === 'housing_access'
        ? { ...zone, isImproved: true, improved: true, afterScore: Math.min(100, zone.beforeScore + 10) }
        : zone
    )
    const before = state.planning.beforeScores ?? calculatePlanningScores(state.planning.infrastructure, state.planning.underservedZones, state.planning.growthPercent, 'balanced')
    const afterScores = calculatePlanningScores(infrastructure, underservedZones, state.planning.growthPercent, 'balanced')
    const frame = scoresToFrame(afterScores, state.planning.horizonYears, infrastructure, underservedZones)
    return {
      currentFrame: frame,
      metricsHistory: [before, afterScores].map((score, index) => scoresToMetrics(score, index === 0 ? 0 : state.planning.horizonYears)),
      planning: {
        ...state.planning,
        infrastructure,
        underservedZones,
        beforeScores: state.planning.beforeScores ?? before,
        afterScores,
        hasAnalyzed: true,
        undoStack: [...state.planning.undoStack, state.planning.infrastructure],
      },
    }
  }),

  deleteInfrastructure: (id) => set((state) => ({
    planning: {
      ...state.planning,
      infrastructure: state.planning.infrastructure.filter((item) => item.id !== id),
      selectedInfrastructureId: null,
      undoStack: [...state.planning.undoStack, state.planning.infrastructure],
    },
    userZones: state.userZones.filter((zone) => zone.infrastructureId !== id),
  })),

  selectInfrastructure: (id) => set((state) => ({ planning: { ...state.planning, selectedInfrastructureId: id } })),

  undoInfrastructure: () => set((state) => {
    const previous = state.planning.undoStack.at(-1)
    if (!previous) return state
    return {
      planning: {
        ...state.planning,
        infrastructure: previous,
        selectedInfrastructureId: null,
        undoStack: state.planning.undoStack.slice(0, -1),
      },
    }
  }),

  saveScenario: () => set((state) => {
    const now = new Date().toISOString()
    const saved: SavedPlanningScenario = {
      id: `scenario-${Date.now()}`,
      city: state.planning.cityId,
      growthRate: state.planning.growthPercent,
      timeHorizon: state.planning.horizonYears,
      scenarioType: state.planning.priority,
      features: state.planning.infrastructure,
      metrics: state.planning.afterScores ?? state.planning.beforeScores,
      createdAt: now,
      updatedAt: now,
    }
    const savedScenarios = [...state.planning.savedScenarios, saved]
    persistScenarios(savedScenarios)
    return { planning: { ...state.planning, savedScenarios } }
  }),
  loadScenario: (id) => set((state) => {
    const saved = state.planning.savedScenarios.find((scenario) => scenario.id === id)
    if (!saved) return state
    const frame = saved.metrics ? scoresToFrame(saved.metrics, saved.timeHorizon, saved.features, state.planning.underservedZones) : state.currentFrame
    return {
      currentFrame: frame,
      metricsHistory: saved.metrics ? [scoresToMetrics(saved.metrics, saved.timeHorizon)] : state.metricsHistory,
      planning: {
        ...state.planning,
        cityId: saved.city,
        growthPercent: saved.growthRate,
        horizonYears: saved.timeHorizon,
        infrastructure: saved.features,
        afterScores: saved.metrics,
        hasAnalyzed: true,
        hasAppliedAIPlan: saved.features.some((item) => item.status === 'proposed'),
      },
    }
  }),
  duplicateScenario: (id) => set((state) => {
    const saved = state.planning.savedScenarios.find((scenario) => scenario.id === id)
    if (!saved) return state
    const now = new Date().toISOString()
    const duplicate = { ...saved, id: `scenario-${Date.now()}`, createdAt: now, updatedAt: now }
    persistScenarios([...state.planning.savedScenarios, duplicate])
    return { planning: { ...state.planning, savedScenarios: [...state.planning.savedScenarios, duplicate] } }
  }),
  resetScenario: () => {
    const next = createInitialPlanningState()
    set({ ...initialState, planning: next })
  },
  setDemoMode: (enabled) => set((state) => ({ planning: { ...state.planning, demoMode: enabled } })),
  setPlanningConstraint: (key, value) => set((state) => ({ planning: { ...state.planning, [key]: value } })),
  openReport: () => set((state) => ({ planning: { ...state.planning, isReportOpen: true } })),
  closeReport: () => set((state) => ({ planning: { ...state.planning, isReportOpen: false } })),

  reset: () => set(initialState),
}))

function createInitialPlanningState(): PlanningState {
  const infrastructure = FREMONT_EXISTING_INFRASTRUCTURE.map((item) => ({ ...item }))
  const underservedZones = FREMONT_UNDERSERVED_ZONES.map((zone) => ({ ...zone, isImproved: false }))
  return {
    cityId: 'fremont',
    growthPercent: DEFAULT_GROWTH_PERCENT,
    horizonYears: DEFAULT_HORIZON_YEARS,
    infrastructure,
    underservedZones,
    growthPressureZones: FREMONT_GROWTH_PRESSURE_ZONES,
    aiRecommendations: FREMONT_AI_RECOMMENDATIONS.map((item) => ({ ...item })),
    topRecommendation: FREMONT_TOP_RECOMMENDATION,
    beforeScores: null,
    afterScores: null,
    hasAnalyzed: false,
    hasAppliedAIPlan: false,
    isReportOpen: false,
    selectedInfrastructureId: null,
    undoStack: [],
    savedScenarios: loadPersistedScenarios(),
    demoMode: true,
    budget: 120_000_000,
    priority: 'balanced',
    serviceRadius: 1200,
    climatePriority: 50,
    equityPriority: 50,
  }
}

const FREMONT_CENTER = { lat: 37.5485, lng: -121.9886 }

function cityShift(cityId: string) {
  const city = STATIC_CITIES.find((item) => item.id === cityId) ?? STATIC_CITIES.find((item) => item.id === 'fremont')
  return {
    lat: (city?.center_lat ?? FREMONT_CENTER.lat) - FREMONT_CENTER.lat,
    lng: (city?.center_lng ?? FREMONT_CENTER.lng) - FREMONT_CENTER.lng,
  }
}

function shiftPosition(position: GeoJSON.Position, shift: { lat: number; lng: number }): GeoJSON.Position {
  return [position[0] + shift.lng, position[1] + shift.lat]
}

function shiftInfrastructure(items: InfrastructureItem[], shift: { lat: number; lng: number }): InfrastructureItem[] {
  return items.map((item) => {
    const coordinates = item.geometryType === 'Point'
      ? shiftPosition(item.coordinates as GeoJSON.Position, shift)
      : (item.coordinates as GeoJSON.Position[]).map((position) => shiftPosition(position, shift))
    return {
      ...item,
      coordinates,
      geometry: item.geometryType === 'Point'
        ? { type: 'Point', coordinates: coordinates as GeoJSON.Position }
        : { type: 'LineString', coordinates: coordinates as GeoJSON.Position[] },
    }
  })
}

function shiftZones(zones: UnderservedZone[], shift: { lat: number; lng: number }): UnderservedZone[] {
  return zones.map((zone) => ({
    ...zone,
    center: [zone.center[0] + shift.lat, zone.center[1] + shift.lng],
  }))
}

function shiftGrowthZones(zones: GrowthPressureZone[], shift: { lat: number; lng: number }): GrowthPressureZone[] {
  return zones.map((zone) => ({
    ...zone,
    center: [zone.center[0] + shift.lat, zone.center[1] + shift.lng],
  }))
}

function normalizeScenario(scenarioId: string): ScenarioId {
  return ['balanced', 'max_growth', 'climate_resilient', 'equity_focused', 'transit_first', 'emergency_ready'].includes(scenarioId)
    ? scenarioId as ScenarioId
    : 'balanced'
}

function scoresToFrame(scores: PlanningScores, year: number, infrastructure: InfrastructureItem[], zones: UnderservedZone[]): SimulationFrame {
  return {
    type: 'SIM_FRAME',
    year,
    zones_geojson: {
      type: 'FeatureCollection',
      features: infrastructure
        .filter((item) => item.geometryType === 'Point')
        .map((item) => pointFeature(item)),
    },
    roads_geojson: {
      type: 'FeatureCollection',
      features: infrastructure
        .filter((item) => item.geometryType === 'LineString')
        .map((item) => lineFeature(item)),
    },
    metrics_snapshot: scoresToMetrics(scores, year),
    agent_actions: zones.filter((zone) => !zone.isImproved).slice(0, 4).map((zone, index) => ({
      x: index,
      y: 0,
      lng: zone.center[1],
      lat: zone.center[0],
      zone_type_id: 'SMART_TRAFFIC_LIGHT',
      zone_display_name: zone.name,
      sps_score: zone.severity,
      placement_reason: zone.reason,
    })),
  }
}

function pointFeature(item: InfrastructureItem): GeoJSON.Feature {
  const coords = item.coordinates as GeoJSON.Position
  return {
    type: 'Feature',
    properties: {
      zone_type_id: categoryToZoneType(item.category),
      zone_display_name: item.name,
      placement_reason: item.reason,
      sps_score: item.confidence,
      infrastructureId: item.id,
    },
    geometry: {
      type: 'Polygon',
      coordinates: squareAround(coords[0], coords[1], 0.001),
    },
  }
}

function lineFeature(item: InfrastructureItem): GeoJSON.Feature {
  return {
    type: 'Feature',
    properties: { infrastructureId: item.id, zone_type_id: categoryToZoneType(item.category), zone_display_name: item.name },
    geometry: { type: 'LineString', coordinates: item.coordinates as GeoJSON.Position[] },
  }
}

function squareAround(lng: number, lat: number, size: number) {
  const h = size / 2
  return [[[lng - h, lat - h], [lng + h, lat - h], [lng + h, lat + h], [lng - h, lat + h], [lng - h, lat - h]]]
}

function scoresToMetrics(scores: PlanningScores, year: number): MetricsSnapshot {
  return {
    year,
    pop_total: 294000,
    pop_density_avg: 1250,
    pop_growth_rate: DEFAULT_GROWTH_PERCENT / DEFAULT_HORIZON_YEARS,
    mobility_commute: scores.averageCommute,
    mobility_congestion: scores.congestion,
    mobility_transit_coverage: scores.transitCoverage,
    mobility_walkability: scores.walkability,
    econ_gdp_est: 28_000_000_000,
    econ_housing_afford: scores.housingAccess,
    econ_jobs_created: 4200,
    env_green_ratio: scores.greenSpace / 2.5,
    env_co2_est: scores.co2Estimate,
    env_impervious: 46,
    env_flood_exposure: 16,
    equity_infra_gini: 100 - scores.equityScore,
    equity_hosp_coverage: scores.emergencyAccess,
    equity_school_access: Math.round((scores.housingAccess + scores.equityScore) / 2),
    infra_power_load: 72,
    infra_water_capacity: 71,
    safety_response_time: Math.round((12 - scores.emergencyAccess / 14) * 10) / 10,
  }
}

export function categoryToZoneType(category: InfrastructureItem['category']) {
  const mapping: Record<InfrastructureItem['category'], string> = {
    hospital: 'HEALTH_HOSPITAL',
    clinic: 'HEALTH_CLINIC',
    school: 'EDU_HIGH',
    park: 'PARK_SMALL',
    transit_stop: 'BUS_STATION',
    transit_line: 'TRAIN_STATION',
    fire_station: 'DIS_FIRE_STATION',
    police_station: 'GOV_POLICE_STATION',
    housing_zone: 'RES_MED_APARTMENT',
    commercial_zone: 'COM_OFFICE_PLAZA',
    road: 'ROAD_ARTERIAL',
    utility: 'POWER_SUBSTATION',
    industrial_zone: 'IND_WAREHOUSE',
    bike_lane: 'ROAD_ARTERIAL',
    water: 'WATER_COASTAL',
    power: 'POWER_SUBSTATION',
    mixed_use: 'RES_MED_APARTMENT',
    community_center: 'GOV_CITY_HALL',
  }
  return mapping[category]
}

function loadPersistedScenarios(): SavedPlanningScenario[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(window.localStorage.getItem('urbanmind.savedScenarios') ?? '[]')
  } catch {
    return []
  }
}

function persistScenarios(scenarios: SavedPlanningScenario[]) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem('urbanmind.savedScenarios', JSON.stringify(scenarios))
  } catch {
    // Local save is optional; the app remains usable without storage.
  }
}
