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
import {
  budgetRecommendations,
  FREMON_AI_RECOMMENDATIONS,
  FREMON_BASE_METRICS,
  FREMON_BUDGET_AMOUNTS,
  FREMON_DISTRICTS,
  FREMON_EXISTING_INFRASTRUCTURE,
  FREMON_GROWTH_PERCENT,
  FREMON_GROWTH_PRESSURE_ZONES,
  FREMON_HORIZON_YEARS,
  FREMON_PLACEMENT_SUGGESTIONS,
  FREMON_PLAN_BATTLE,
  FREMON_POPULATION,
  FREMON_TIMELINE,
  FREMON_TOP_RECOMMENDATION,
  FREMON_UNDERSERVED_ZONES,
  getFremonBudgetSummary,
  markFremonImprovedZones,
} from '@/data/fremonDemo'
import type { AIRecommendation, BudgetLevel, BudgetSummary, CityMode, CityProfile, DistrictProfile, GrowthPressureZone, InfrastructureItem, MetricsSnapshot, PlacementFeedback, PlacementSuggestion, PlanBattlePlan, PlanningScores, SavedPlanningScenario, ScenarioId, TimelineYear, UnderservedZone } from '@/types/city.types'
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
  cityMode: CityMode
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
  budgetLevel: BudgetLevel
  budgetSummary: BudgetSummary
  planBattlePlans: PlanBattlePlan[]
  recommendedPlanId: PlanBattlePlan['id']
  selectedPlanId: PlanBattlePlan['id']
  hasComparedPlans: boolean
  timelineYear: TimelineYear
  timelinePhase: string
  timelinePopulation: number
  equityLens: boolean
  presentationMode: boolean
  presentationStep: number
  districtProfiles: DistrictProfile[]
  selectedDistrictId: string | null
  placementSuggestions: PlacementSuggestion[]
  placementFeedback: PlacementFeedback | null
  impactSummary: {
    residentsServed: number
    gapsFixed: number
    commuteReduction: number
    emergencyDelta: number
    greenAccessDelta: number
    budgetUsed: number
  } | null
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
  comparePlans: () => void
  applyRecommendedPlan: () => void
  setCityMode: (mode: CityMode) => void
  setBudgetLevel: (level: BudgetLevel) => void
  setTimelineYear: (year: TimelineYear) => void
  toggleEquityLens: () => void
  togglePresentationMode: () => void
  nextPresentationStep: () => void
  previousPresentationStep: () => void
  selectDistrict: (id: string | null) => void
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
    const existingState = get()
    const dotAware = buildDotAwareAnalysis(cityId, scenarioId, existingState)
    if (dotAware) {
      set((state) => ({
        sessionId: state.sessionId ?? 'offline',
        isRunning: false,
        isPaused: true,
        currentYear: 2026,
        currentFrame: dotAware.frame,
        frameHistory: [dotAware.frame],
        metricsHistory: [dotAware.frame.metrics_snapshot],
        lastActions: dotAware.lastActions,
        planning: {
          ...state.planning,
          cityMode: cityId === 'fremon' ? 'generated' : 'real',
          cityId,
          growthPercent: dotAware.growthPercent,
          horizonYears: 50,
          infrastructure: dotAware.infrastructure,
          underservedZones: dotAware.underservedZones,
          growthPressureZones: dotAware.growthPressureZones,
          aiRecommendations: dotAware.aiRecommendations,
          topRecommendation: dotAware.topRecommendation,
          beforeScores: dotAware.beforeScores,
          afterScores: null,
          hasAnalyzed: true,
          hasAppliedAIPlan: false,
          hasComparedPlans: false,
          planBattlePlans: [],
          selectedInfrastructureId: null,
          undoStack: [],
          timelineYear: 2026,
          timelinePhase: `${dotAware.cityName}: 50-year baseline to 2076 · fill the largest visible service gaps first`,
          timelinePopulation: dotAware.frame.metrics_snapshot.pop_total,
          districtProfiles: dotAware.districtProfiles,
          placementSuggestions: dotAware.placementSuggestions,
          placementFeedback: null,
          impactSummary: null,
        },
      }))
      return
    }
    if (cityId === 'fremon') {
      const beforeScores = { ...FREMON_BASE_METRICS }
      const baseInfrastructure = withoutRoadInfrastructure(FREMON_EXISTING_INFRASTRUCTURE)
      const frame = scoresToFrame(beforeScores, 2026, baseInfrastructure, FREMON_UNDERSERVED_ZONES)
      set((state) => ({
        sessionId: state.sessionId ?? 'offline',
        isRunning: false,
        isPaused: true,
        currentYear: 2026,
        currentFrame: frame,
        frameHistory: [frame],
        metricsHistory: [frame.metrics_snapshot],
        lastActions: FREMON_UNDERSERVED_ZONES.slice(0, 4).map((zone, index) => ({
          x: index,
          y: 0,
          lat: zone.center[0],
          lng: zone.center[1],
          zone_type_id: 'SMART_TRAFFIC_LIGHT',
          zone_display_name: zone.name,
          sps_score: zone.severity,
          placement_reason: zone.reason,
        })),
        planning: {
          ...state.planning,
          cityMode: 'generated',
          cityId: 'fremon',
          growthPercent: FREMON_GROWTH_PERCENT,
          horizonYears: FREMON_HORIZON_YEARS,
          infrastructure: baseInfrastructure.map((item) => ({ ...item })),
          underservedZones: FREMON_UNDERSERVED_ZONES.map((zone) => ({ ...zone, improved: false, isImproved: false })),
          growthPressureZones: FREMON_GROWTH_PRESSURE_ZONES.map((zone) => ({ ...zone })),
          aiRecommendations: budgetRecommendations(state.planning.budgetLevel).map((item) => ({ ...item })),
          topRecommendation: FREMON_TOP_RECOMMENDATION,
          beforeScores,
          afterScores: null,
          hasAnalyzed: true,
          hasAppliedAIPlan: false,
          hasComparedPlans: false,
          planBattlePlans: [],
          recommendedPlanId: 'equity_first',
          selectedPlanId: 'equity_first',
          selectedInfrastructureId: null,
          undoStack: [],
          timelineYear: 2026,
          timelinePhase: FREMON_TIMELINE[2026].phase,
          timelinePopulation: FREMON_TIMELINE[2026].population,
          districtProfiles: FREMON_DISTRICTS,
          placementSuggestions: FREMON_PLACEMENT_SUGGESTIONS,
          placementFeedback: null,
          impactSummary: null,
        },
      }))
      return
    }
    const shift = cityShift(cityId)
    const infrastructure = withoutRoadInfrastructure(shiftInfrastructure(FREMONT_EXISTING_INFRASTRUCTURE, shift))
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
        cityMode: 'real',
        growthPercent: DEFAULT_GROWTH_PERCENT,
        horizonYears: DEFAULT_HORIZON_YEARS,
        infrastructure,
        underservedZones,
        growthPressureZones,
        aiRecommendations: withoutRoadInfrastructure(shiftInfrastructure(FREMONT_AI_RECOMMENDATIONS, shift)),
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
    const infrastructure = withoutRoadInfrastructure([...state.planning.infrastructure, ...applied])
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

  comparePlans: () => set((state) => ({
    planning: {
      ...state.planning,
      hasComparedPlans: true,
      planBattlePlans: FREMON_PLAN_BATTLE,
      recommendedPlanId: 'equity_first',
      selectedPlanId: 'equity_first',
    },
  })),

  applyRecommendedPlan: () => set((state) => {
    if (!state.planning.hasAnalyzed) return state
    if (state.planning.cityId !== 'fremon') {
      return state
    }
    const selectedPlan = FREMON_PLAN_BATTLE.find((plan) => plan.id === state.planning.selectedPlanId) ?? FREMON_PLAN_BATTLE.find((plan) => plan.isRecommended)!
    const featureIds = selectedPlan.featureIds.filter((id) => state.planning.aiRecommendations.some((item) => item.id === id))
    const applied = state.planning.aiRecommendations
      .filter((item) => featureIds.includes(item.id))
      .map((item) => ({ ...item, status: 'proposed' as const }))
    const infrastructure = [
      ...state.planning.infrastructure.filter((item) => !FREMON_AI_RECOMMENDATIONS.some((rec) => rec.id === item.id) && item.category !== 'road' && item.category !== 'bike_lane'),
      ...applied,
    ]
    const underservedZones = markFremonImprovedZones(applied.map((item) => item.id))
    const metrics = selectedPlan.metrics
    const afterScores = {
      ...metrics,
      totalEstimatedCost: applied.reduce((sum, item) => sum + item.costEstimate, 0),
      populationServed: selectedPlan.populationServed,
      serviceGapCount: underservedZones.filter((zone) => !zone.isImproved).length,
    }
    const frame = scoresToFrame(afterScores, state.planning.timelineYear, infrastructure, underservedZones)
    return {
      currentFrame: frame,
      currentYear: state.planning.timelineYear,
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
        hasComparedPlans: true,
        planBattlePlans: FREMON_PLAN_BATTLE,
        undoStack: [...state.planning.undoStack, state.planning.infrastructure],
        impactSummary: {
          residentsServed: 74_000,
          gapsFixed: 4,
          commuteReduction: 12,
          emergencyDelta: 18,
          greenAccessDelta: 22,
          budgetUsed: state.planning.budgetSummary.used,
        },
      },
    }
  }),

  setCityMode: (mode) => set((state) => ({
    planning: { ...state.planning, cityMode: mode },
  })),

  setBudgetLevel: (level) => set((state) => {
    const budgetSummary = getFremonBudgetSummary(level)
    const aiRecommendations = state.planning.cityId === 'fremon'
      ? budgetRecommendations(level).map((item) => ({ ...item }))
      : state.planning.aiRecommendations
    return {
      planning: {
        ...state.planning,
        budgetLevel: level,
        budget: FREMON_BUDGET_AMOUNTS[level],
        budgetSummary,
        aiRecommendations,
        placementFeedback: null,
      },
    }
  }),

  setTimelineYear: (year) => set((state) => {
    const timeline = timelineForYear(year, state.planning)
    const pressureScale = timeline.pressure
    const growthBase = state.planning.cityId === 'fremon'
      ? FREMON_GROWTH_PRESSURE_ZONES
      : state.planning.growthPressureZones
    const growthPressureZones = growthBase.map((zone) => ({
      ...zone,
      radiusMeters: Math.round(zone.radiusMeters * pressureScale),
      projectedGrowthPercent: Math.round(zone.projectedGrowthPercent * pressureScale),
    }))
    const improvedIds = new Set(state.planning.underservedZones.filter((zone) => zone.isImproved || zone.improved).map((zone) => zone.id))
    const underservedBase = state.planning.cityId === 'fremon'
      ? FREMON_UNDERSERVED_ZONES
      : state.planning.underservedZones
    const underservedZones = underservedBase.map((zone) => ({
      ...zone,
      isImproved: improvedIds.has(zone.id),
      improved: improvedIds.has(zone.id),
      radiusMeters: improvedIds.has(zone.id) ? Math.round(zone.radiusMeters * 0.55) : Math.round(zone.radiusMeters * pressureScale),
      severity: improvedIds.has(zone.id) ? zone.severity : Math.min(0.98, zone.severity * pressureScale),
    }))
    const metrics = state.planning.hasAppliedAIPlan ? state.planning.afterScores ?? timeline.metrics : timeline.metrics
    const frame = scoresToFrame(metrics, year, state.planning.infrastructure, underservedZones)
    return {
      currentYear: year,
      currentFrame: frame,
      metricsHistory: [frame.metrics_snapshot],
      planning: {
        ...state.planning,
        timelineYear: year,
        timelinePhase: timeline.phase,
        timelinePopulation: timeline.population,
        growthPressureZones,
        underservedZones,
        beforeScores: state.planning.hasAppliedAIPlan ? state.planning.beforeScores : timeline.metrics,
      },
    }
  }),

  toggleEquityLens: () => set((state) => ({ planning: { ...state.planning, equityLens: !state.planning.equityLens } })),
  togglePresentationMode: () => set((state) => ({ planning: { ...state.planning, presentationMode: !state.planning.presentationMode } })),
  nextPresentationStep: () => set((state) => ({ planning: { ...state.planning, presentationStep: Math.min(6, state.planning.presentationStep + 1), presentationMode: true } })),
  previousPresentationStep: () => set((state) => ({ planning: { ...state.planning, presentationStep: Math.max(0, state.planning.presentationStep - 1), presentationMode: true } })),
  selectDistrict: (id) => set((state) => ({ planning: { ...state.planning, selectedDistrictId: id } })),

  addInfrastructure: (item) => set((state) => {
    if (item.category === 'road' || item.category === 'bike_lane') return state
    const infrastructure = withoutRoadInfrastructure([...state.planning.infrastructure, item])
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
    const placementFeedback = detectPlacementFeedback(item, state.planning)
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
        placementFeedback,
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
  const infrastructure = withoutRoadInfrastructure(FREMONT_EXISTING_INFRASTRUCTURE).map((item) => ({ ...item }))
  const underservedZones = FREMONT_UNDERSERVED_ZONES.map((zone) => ({ ...zone, isImproved: false }))
  return {
    cityId: 'fremont',
    growthPercent: DEFAULT_GROWTH_PERCENT,
    horizonYears: DEFAULT_HORIZON_YEARS,
    infrastructure,
    underservedZones,
    growthPressureZones: FREMONT_GROWTH_PRESSURE_ZONES,
    aiRecommendations: withoutRoadInfrastructure(FREMONT_AI_RECOMMENDATIONS).map((item) => ({ ...item })),
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
    budgetLevel: 'high',
    budgetSummary: getFremonBudgetSummary('high'),
    planBattlePlans: [],
    recommendedPlanId: 'equity_first',
    selectedPlanId: 'equity_first',
    hasComparedPlans: false,
    timelineYear: 2026,
    timelinePhase: FREMON_TIMELINE[2026].phase,
    timelinePopulation: FREMON_POPULATION,
    equityLens: false,
    presentationMode: false,
    presentationStep: 0,
    districtProfiles: [],
    selectedDistrictId: null,
    placementSuggestions: [],
    placementFeedback: null,
    impactSummary: null,
    cityMode: 'real',
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

function withoutRoadInfrastructure(items: InfrastructureItem[]): InfrastructureItem[] {
  return items.filter((item) =>
    item.category !== 'road' &&
    item.category !== 'bike_lane' &&
    item.geometryType !== 'LineString'
  )
}

const DOT_SERVICE_CATEGORIES: InfrastructureItem['category'][] = [
  'clinic',
  'school',
  'transit_stop',
  'park',
  'fire_station',
  'police_station',
  'housing_zone',
  'utility',
]

const CATEGORY_GAP_TYPE: Partial<Record<InfrastructureItem['category'], UnderservedZone['gapType']>> = {
  clinic: 'emergency_access',
  hospital: 'hospital_access',
  school: 'school_access',
  transit_stop: 'transit_access',
  park: 'green_space',
  fire_station: 'emergency_access',
  police_station: 'emergency_access',
  housing_zone: 'housing_access',
  utility: 'housing_access',
}

const CATEGORY_LABEL: Partial<Record<InfrastructureItem['category'], string>> = {
  clinic: 'clinic',
  school: 'school',
  transit_stop: 'transit hub',
  park: 'park',
  fire_station: 'fire station',
  police_station: 'police station',
  housing_zone: 'housing support node',
  utility: 'utility support',
}

function buildDotAwareAnalysis(cityId: string, scenarioId: string, state: SimulationStore) {
  const city = STATIC_CITIES.find((item) => item.id === cityId)
  if (!city) return null
  const scenario = normalizeScenario(scenarioId)
  const visibleDots = currentMapDotsAsInfrastructure(state.currentFrame, city)
  const existing = dedupeInfrastructure(withoutRoadInfrastructure([...state.planning.infrastructure, ...visibleDots]), 0.006)
  if (existing.length === 0) return null

  const anchors = cityAnalysisAnchors(city)
  const needs = rankServiceNeeds(existing, anchors, scenario)
  const selectedNeeds = needs.slice(0, 6)
  const usedAnchors: Array<[number, number]> = []
  const underservedZones = selectedNeeds.map((need, index) => {
    const center = chooseGapAnchor(need.category, existing, anchors, usedAnchors)
    usedAnchors.push(center)
    const severity = Math.max(0.46, Math.min(0.94, need.severity - index * 0.035))
    return {
      id: `${cityId}-${need.category}-gap-${index}`,
      name: `${city.name} ${titleCase(CATEGORY_LABEL[need.category] ?? need.category)} Gap`,
      gapType: CATEGORY_GAP_TYPE[need.category] ?? 'equity',
      center,
      radiusMeters: Math.round(900 + severity * 1250),
      severity,
      improvedBy: [`${cityId}-ai-${need.category}-${index}`],
      improved: false,
      isImproved: false,
      reason: `Current map dots show weak ${CATEGORY_LABEL[need.category] ?? need.category} coverage near this part of ${city.name}.`,
      beforeScore: Math.round(38 + (1 - severity) * 34),
    } satisfies UnderservedZone
  })
  const aiRecommendations = underservedZones.map((zone, index) => {
    const category = selectedNeeds[index].category
    return pointInfrastructure(
      `${cityId}-ai-${category}-${index}`,
      `${city.name} ${titleCase(CATEGORY_LABEL[category] ?? category)} ${index + 1}`,
      category,
      zone.center,
      `Placed at the center of a visible underserved zone and spaced away from nearby ${CATEGORY_LABEL[category] ?? category} dots.`,
      12_000_000 + index * 5_500_000,
      Math.round(82 + zone.severity * 16),
      Math.min(0.94, 0.72 + zone.severity * 0.2),
      'ai_recommended'
    )
  })
  const beforeScores = dotCoverageScores(existing, underservedZones, city, scenario)
  const frame = scoresToFrame(beforeScores, 2026, existing, underservedZones)
  const topItem = aiRecommendations[0]
  const topZone = underservedZones[0]
  const topRecommendation: AIRecommendation = {
    id: `${cityId}-dot-aware-top`,
    title: topItem ? `Add ${topItem.name}` : `Improve ${city.name} Coverage`,
    zoneName: topZone?.name ?? `${city.name} service gap`,
    locationName: topZone?.name,
    infrastructureType: topItem?.category ?? 'clinic',
    coordinates: topItem?.coordinates as GeoJSON.Position | undefined,
    reason: topZone?.reason ?? `UrbanMind compared the visible dots on ${city.name}'s map and found the biggest service gap.`,
    expectedImpact: {
      emergencyAccess: Math.round(8 + (topZone?.severity ?? 0.6) * 14),
      cityHealth: Math.round(7 + (topZone?.severity ?? 0.6) * 12),
      averageResponseTime: -Math.round(2 + (topZone?.severity ?? 0.6) * 3),
      equityScore: Math.round(6 + (topZone?.severity ?? 0.6) * 10),
    },
    estimatedCost: topItem?.costEstimate ?? 18_000_000,
    costEstimate: topItem?.costEstimate ?? 18_000_000,
    confidence: topItem?.confidence ?? 0.78,
    relatedGapIds: topZone ? [topZone.id] : [],
    itemIds: topItem ? [topItem.id] : [],
  }
  return {
    cityName: city.name,
    growthPercent: Math.round(city.urban_growth_rate * 100),
    infrastructure: existing,
    underservedZones,
    growthPressureZones: underservedZones.slice(0, 4).map((zone, index) => ({
      id: `${zone.id}-growth`,
      name: zone.name.replace('Gap', 'Growth Pressure'),
      center: zone.center,
      radiusMeters: Math.round(zone.radiusMeters * 0.8),
      pressure: index < 2 ? 'high' as const : 'medium' as const,
      projectedGrowthPercent: Math.round(18 + zone.severity * 28),
      reason: `Growth pressure is highest where current visible dots leave service coverage thin.`,
    })),
    aiRecommendations,
    topRecommendation,
    beforeScores,
    frame,
    lastActions: underservedZones.slice(0, 5).map((zone, index) => ({
      x: index,
      y: 0,
      lat: zone.center[0],
      lng: zone.center[1],
      zone_type_id: categoryToZoneType(aiRecommendations[index]?.category ?? 'clinic'),
      zone_display_name: zone.name,
      sps_score: zone.severity,
      placement_reason: zone.reason,
    })),
    districtProfiles: underservedZones.map((zone, index) => ({
      id: `${zone.id}-district`,
      name: zone.name,
      mainIssue: zone.gapType.replace(/_/g, ' '),
      severity: zone.severity,
      populationAffected: Math.round(city.population_current * (0.012 + index * 0.004)),
      recommendedFix: aiRecommendations[index]?.name ?? 'Add service coverage',
      beforeScore: zone.beforeScore,
      afterScore: Math.min(96, zone.beforeScore + 24),
      center: zone.center,
      relatedGapId: zone.id,
    })),
    placementSuggestions: aiRecommendations.slice(0, 3).map((item, index) => ({
      id: `${item.id}-suggestion`,
      rank: index + 1,
      title: item.name,
      category: item.category,
      coordinates: item.coordinates as GeoJSON.Position,
      expectedImpact: `Coverage +${Math.round(item.impactScore / 6)}`,
      costEstimate: item.costEstimate,
      reason: item.reason,
      confidence: item.confidence,
    })),
  }
}

function currentMapDotsAsInfrastructure(frame: SimulationFrame | null, city: CityProfile): InfrastructureItem[] {
  return (frame?.zones_geojson.features ?? [])
    .map((feature, index) => {
      const center = centroidOfFeature(feature)
      if (!center || !insideCityBBox(center[1], center[0], city)) return null
      const zoneType = String(feature.properties?.zone_type_id ?? '')
      const category = zoneTypeToInfrastructureCategory(zoneType)
      if (!category || category === 'road' || category === 'bike_lane') return null
      return pointInfrastructure(
        `visible-dot-${city.id}-${index}-${zoneType.toLowerCase()}`,
        String(feature.properties?.zone_display_name ?? `${city.name} visible ${category}`),
        category,
        [center[1], center[0]],
        String(feature.properties?.placement_reason ?? 'Visible map dot included in the current infrastructure analysis.'),
        0,
      Math.round(Number(feature.properties?.sps_score ?? 0.65) * 100),
      Math.max(0.55, Math.min(0.96, Number(feature.properties?.sps_score ?? 0.72))),
      'existing',
      'simulation'
      )
    })
    .filter((item): item is InfrastructureItem => Boolean(item))
}

function pointInfrastructure(
  id: string,
  name: string,
  category: InfrastructureItem['category'],
  center: [number, number],
  reason: string,
  costEstimate: number,
  impactScore: number,
  confidence: number,
  status: InfrastructureItem['status'] = 'existing',
  source: InfrastructureItem['source'] = status === 'ai_recommended' ? 'ai_recommended' : 'simulation'
): InfrastructureItem {
  const coordinates: GeoJSON.Position = [center[1], center[0]]
  return {
    id,
    name,
    category,
    status,
    source,
    coordinates,
    geometryType: 'Point',
    geometry: { type: 'Point', coordinates },
    reason,
    costEstimate,
    impactScore,
    confidence,
    createdAt: new Date(2026, 0, 1).toISOString(),
  }
}

function centroidOfFeature(feature: GeoJSON.Feature): [number, number] | null {
  const geometry = feature.geometry
  if (!geometry) return null
  if (geometry.type === 'Point') {
    const [lng, lat] = geometry.coordinates
    return [lat, lng]
  }
  if (geometry.type === 'Polygon') {
    const ring = geometry.coordinates[0]
    if (!ring?.length) return null
    const sum = ring.reduce((acc, [lng, lat]) => ({ lat: acc.lat + lat, lng: acc.lng + lng }), { lat: 0, lng: 0 })
    return [sum.lat / ring.length, sum.lng / ring.length]
  }
  return null
}

function insideCityBBox(lat: number, lng: number, city: CityProfile) {
  const [west, south, east, north] = city.bbox
  return lng >= west - 0.08 && lng <= east + 0.08 && lat >= south - 0.08 && lat <= north + 0.08
}

function zoneTypeToInfrastructureCategory(zoneType: string): InfrastructureItem['category'] | null {
  if (zoneType.includes('HEALTH')) return 'clinic'
  if (zoneType.includes('EDU')) return 'school'
  if (zoneType.includes('PARK') || zoneType.includes('ENV_TREE')) return 'park'
  if (zoneType.includes('BUS') || zoneType.includes('TRAIN') || zoneType.includes('TRANSIT')) return 'transit_stop'
  if (zoneType.includes('FIRE')) return 'fire_station'
  if (zoneType.includes('POLICE')) return 'police_station'
  if (zoneType.includes('RES')) return 'housing_zone'
  if (zoneType.includes('POWER') || zoneType.includes('UTILITY') || zoneType.includes('INFRA')) return 'utility'
  if (zoneType.includes('COM')) return 'commercial_zone'
  return null
}

function cityAnalysisAnchors(city: CityProfile): Array<[number, number]> {
  const landmarkAnchors = (city.landmarks ?? [])
    .map((item) => [item.lat, item.lng] as [number, number])
    .filter(([lat, lng]) => insideCityBBox(lat, lng, city))
  const [west, south, east, north] = city.bbox
  const grid: Array<[number, number]> = [
    [city.center_lat, city.center_lng],
    [south + (north - south) * 0.28, west + (east - west) * 0.28],
    [south + (north - south) * 0.28, west + (east - west) * 0.72],
    [south + (north - south) * 0.50, west + (east - west) * 0.22],
    [south + (north - south) * 0.50, west + (east - west) * 0.78],
    [south + (north - south) * 0.72, west + (east - west) * 0.28],
    [south + (north - south) * 0.72, west + (east - west) * 0.72],
  ]
  return dedupeAnchors([...landmarkAnchors, ...grid])
}

function rankServiceNeeds(items: InfrastructureItem[], anchors: Array<[number, number]>, scenario: ScenarioId) {
  const priorityBoost: Partial<Record<ScenarioId, InfrastructureItem['category'][]>> = {
    emergency_ready: ['clinic', 'fire_station', 'police_station'],
    transit_first: ['transit_stop', 'housing_zone'],
    climate_resilient: ['park', 'utility'],
    equity_focused: ['clinic', 'school', 'transit_stop', 'park'],
    max_growth: ['housing_zone', 'utility', 'school'],
  }
  return DOT_SERVICE_CATEGORIES.map((category) => {
    const categoryItems = items.filter((item) => item.category === category || (category === 'clinic' && item.category === 'hospital'))
    const maxDistance = Math.max(...anchors.map((anchor) => nearestDistance(anchor, categoryItems)), 0.08)
    const duplicatePenalty = nearbyPairCount(categoryItems, 0.012) * 0.08
    const scenarioBoost = priorityBoost[scenario]?.includes(category) ? 0.18 : 0
    const scarcity = 1 / Math.max(1, categoryItems.length)
    return { category, severity: Math.min(0.98, maxDistance * 5 + scarcity * 0.2 + scenarioBoost - duplicatePenalty) }
  }).sort((a, b) => b.severity - a.severity)
}

function chooseGapAnchor(category: InfrastructureItem['category'], items: InfrastructureItem[], anchors: Array<[number, number]>, usedAnchors: Array<[number, number]>) {
  const sameCategory = items.filter((item) => item.category === category || (category === 'clinic' && item.category === 'hospital'))
  return [...anchors]
    .sort((a, b) => {
      const distanceA = nearestDistance(a, sameCategory) + nearestDistance(a, usedAnchors.map((center, index) => pointInfrastructure(`used-${index}`, 'used', category, center, '', 0, 0, 0)))
      const distanceB = nearestDistance(b, sameCategory) + nearestDistance(b, usedAnchors.map((center, index) => pointInfrastructure(`used-${index}`, 'used', category, center, '', 0, 0, 0)))
      return distanceB - distanceA
    })[0] ?? anchors[0]
}

function nearestDistance(anchor: [number, number], items: InfrastructureItem[]) {
  if (!items.length) return 0.12
  return Math.min(...items.map((item) => {
    const [lng, lat] = item.coordinates as GeoJSON.Position
    return Math.hypot(anchor[0] - lat, anchor[1] - lng)
  }))
}

function nearbyPairCount(items: InfrastructureItem[], threshold: number) {
  let count = 0
  items.forEach((item, i) => {
    const [lng, lat] = item.coordinates as GeoJSON.Position
    items.slice(i + 1).forEach((other) => {
      const [otherLng, otherLat] = other.coordinates as GeoJSON.Position
      if (Math.hypot(lat - otherLat, lng - otherLng) < threshold) count += 1
    })
  })
  return count
}

function dedupeInfrastructure(items: InfrastructureItem[], threshold: number) {
  const kept: InfrastructureItem[] = []
  items.forEach((item) => {
    if (item.geometryType !== 'Point') return
    const [lng, lat] = item.coordinates as GeoJSON.Position
    const duplicate = kept.some((other) => {
      const [otherLng, otherLat] = other.coordinates as GeoJSON.Position
      return other.category === item.category && Math.hypot(lat - otherLat, lng - otherLng) < threshold
    })
    if (!duplicate) kept.push(item)
  })
  return kept
}

function dedupeAnchors(anchors: Array<[number, number]>) {
  const kept: Array<[number, number]> = []
  anchors.forEach((anchor) => {
    if (!kept.some((item) => Math.hypot(anchor[0] - item[0], anchor[1] - item[1]) < 0.01)) kept.push(anchor)
  })
  return kept
}

function dotCoverageScores(items: InfrastructureItem[], zones: UnderservedZone[], city: CityProfile, scenario: ScenarioId): PlanningScores {
  const count = (category: InfrastructureItem['category']) => items.filter((item) => item.category === category).length
  const gapPenalty = zones.reduce((sum, zone) => sum + zone.severity, 0) / Math.max(1, zones.length)
  const emergency = clampScore(48 + (count('clinic') + count('fire_station') + count('police_station')) * 5 - gapPenalty * 16)
  const transit = clampScore(44 + count('transit_stop') * 7 - gapPenalty * 12 + (scenario === 'transit_first' ? 6 : 0))
  const green = clampScore(46 + count('park') * 7 - gapPenalty * 10 + (scenario === 'climate_resilient' ? 7 : 0))
  const education = clampScore(47 + count('school') * 8 - gapPenalty * 12)
  const housing = clampScore(50 + count('housing_zone') * 6 + count('utility') * 3 - gapPenalty * 10)
  const equity = clampScore(Math.round((emergency + transit + green + education) / 4) + (scenario === 'equity_focused' ? 5 : 0))
  const cityHealth = clampScore(Math.round(emergency * 0.22 + transit * 0.2 + green * 0.16 + education * 0.16 + housing * 0.14 + equity * 0.12))
  return {
    cityHealth,
    transitCoverage: transit,
    emergencyAccess: emergency,
    housingAccess: housing,
    greenSpace: green,
    fifteenMinuteCityScore: clampScore(Math.round((transit + green + education + emergency) / 4)),
    walkability: clampScore(54 + count('park') * 4 + count('transit_stop') * 3),
    congestion: clampScore(64 - count('transit_stop') * 4 + (scenario === 'max_growth' ? 8 : 0)),
    congestionRisk: clampScore(60 - count('transit_stop') * 4 + zones.length * 3),
    averageCommute: Math.max(18, Math.round(43 - count('transit_stop') * 1.7 + gapPenalty * 5)),
    co2Estimate: Math.round(city.population_current / 14000 + 620 - green * 2.2),
    equityScore: equity,
    educationAccess: education,
    populationServed: Math.round(city.population_current * 0.08),
    serviceGapCount: zones.length,
    totalEstimatedCost: 0,
  }
}

function clampScore(value: number) {
  return Math.max(25, Math.min(96, Math.round(value)))
}

function titleCase(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
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
    roads_geojson: { type: 'FeatureCollection', features: [] },
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

function squareAround(lng: number, lat: number, size: number) {
  const h = size / 2
  return [[[lng - h, lat - h], [lng + h, lat - h], [lng + h, lat + h], [lng - h, lat + h], [lng - h, lat - h]]]
}

function timelineForYear(year: number, planning: PlanningState) {
  const fremonPoint = FREMON_TIMELINE[year as keyof typeof FREMON_TIMELINE]
  if (planning.cityId === 'fremon' && fremonPoint) return fremonPoint
  const t = Math.max(0, Math.min(1, (year - 2026) / 50))
  const base = planning.beforeScores ?? FREMON_BASE_METRICS
  const city = STATIC_CITIES.find((item) => item.id === planning.cityId)
  const basePopulation = planning.timelinePopulation || city?.population_current || FREMON_POPULATION
  return {
    population: Math.round(basePopulation * (1 + t * (planning.growthPercent / 100))),
    pressure: 1 + t * 0.68,
    label: `${year}`,
    phase: `${year} · 50-year planning horizon · prioritize distributed service coverage`,
    metrics: {
      ...base,
      cityHealth: clampScore(base.cityHealth - t * 4),
      emergencyAccess: clampScore(base.emergencyAccess - t * 6),
      transitCoverage: clampScore(base.transitCoverage - t * 5),
      greenSpace: clampScore(base.greenSpace - t * 5),
      housingAccess: clampScore(base.housingAccess - t * 6),
      averageCommute: Math.round((base.averageCommute + t * 7) * 10) / 10,
      congestion: clampScore(base.congestion + t * 12),
      congestionRisk: clampScore(base.congestionRisk + t * 14),
      co2Estimate: Math.round(base.co2Estimate + t * 120),
      serviceGapCount: planning.underservedZones.filter((zone) => !zone.isImproved).length,
    },
  }
}

function estimateTimelinePopulation(year: number) {
  const fremonPoint = FREMON_TIMELINE[year as keyof typeof FREMON_TIMELINE]
  if (fremonPoint) return fremonPoint.population
  const t = Math.max(0, Math.min(1, (year - 2026) / 50))
  return Math.round(FREMON_POPULATION * (1 + t * 0.45))
}

function scoresToMetrics(scores: PlanningScores, year: number): MetricsSnapshot {
  return {
    year,
    pop_total: estimateTimelinePopulation(year),
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
    equity_school_access: scores.educationAccess ?? Math.round((scores.housingAccess + scores.equityScore) / 2),
    infra_power_load: 72,
    infra_water_capacity: 71,
    safety_response_time: Math.round((12 - scores.emergencyAccess / 14) * 10) / 10,
  }
}

function detectPlacementFeedback(item: InfrastructureItem, planning: PlanningState): PlacementFeedback {
  const coords = item.geometryType === 'Point' ? item.coordinates as GeoJSON.Position : null
  const near = (target: [number, number], threshold = 0.026) => {
    if (!coords) return false
    return Math.hypot((coords[1] as number) - target[0], (coords[0] as number) - target[1]) < threshold
  }
  const duplicate = coords && planning.infrastructure.some((other) => {
    if (other.geometryType !== 'Point' || other.category !== item.category) return false
    const otherCoords = other.coordinates as GeoJSON.Position
    return Math.hypot((coords[1] as number) - otherCoords[1], (coords[0] as number) - otherCoords[0]) < 0.01
  })
  const budgetExceeded = (planning.afterScores?.totalEstimatedCost ?? planning.budgetSummary.used) + item.costEstimate > planning.budgetSummary.amount

  if (budgetExceeded) {
    return { type: 'warning', title: 'Planning Conflict', message: 'Budget exceeded. This placement pushes the scenario beyond the selected budget level.' }
  }
  if (duplicate) {
    return { type: 'warning', title: 'Planning Conflict', message: 'Duplicate infrastructure is too close to an existing item. Move it to serve a different gap.' }
  }
  if (item.category === 'school' && near([37.515, -122.035], 0.032)) {
    return { type: 'warning', title: 'Planning Conflict', message: 'This school is too close to the Industrial Edge. Move it closer to East or New Housing growth to improve Education Access.' }
  }
  if (item.category === 'school' && !near([37.548, -121.936], 0.04) && !near([37.512, -121.945], 0.04)) {
    return { type: 'warning', title: 'Planning Conflict', message: 'This school is too far from the projected housing growth zone. Move it closer to improve Education Access.' }
  }
  if ((item.category === 'clinic' || item.category === 'hospital') && near([37.500, -121.990], 0.045)) {
    return { type: 'good', title: 'Good Placement', message: 'This clinic fills a high severity emergency access gap and serves about 18,000 projected residents.' }
  }
  if (item.category === 'transit_stop' && !near([37.586, -121.990], 0.05) && !near([37.512, -121.945], 0.05)) {
    return { type: 'warning', title: 'Planning Conflict', message: 'Transit stop is too far from housing growth. Place it near North Transit Gap or New Housing Expansion.' }
  }
  if (item.category === 'park' && near([37.552, -121.990], 0.045)) {
    return { type: 'good', title: 'Good Placement', message: 'This park expands 15 Minute City coverage in the central green-space gap.' }
  }
  return { type: 'good', title: 'Good Placement', message: 'This proposed infrastructure improves local access in the current scenario.' }
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
    road: 'SMART_TRAFFIC_LIGHT',
    utility: 'POWER_SUBSTATION',
    industrial_zone: 'IND_WAREHOUSE',
    bike_lane: 'BUS_STATION',
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
