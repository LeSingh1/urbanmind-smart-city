import { create } from 'zustand'
import { notify } from '@/lib/notify'
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
  FREMON_EQUITY_FIRST_METRICS,
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
    cityHealthDelta: number
    equityDelta: number
    fifteenMinuteDelta: number
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
  hydratePlanningForCity: (cityId: string) => void
  resetPlanningAnalysis: () => void
  resetProposedPlan: () => void
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

  analyzeDemo: (cityIdArg, scenarioId) => {
    try {
      const existingState = get()
      const cityId = cityIdArg || existingState.planning.cityId || 'fremon'
      const scenario = normalizeScenario(scenarioId)
      const userPieces =
        existingState.planning.cityId === cityId
          ? existingState.planning.infrastructure.filter((item) => item.source === 'user_added')
          : []

      if (!isSeededDemoCity(cityId)) {
        const dotAware = buildDotAwareAnalysis(cityId, scenarioId, existingState)
        if (dotAware) {
          const infrastructure = mergeUserPieces(dotAware.infrastructure, userPieces)
          const frame = scoresToFrame(dotAware.beforeScores, 2026, infrastructure, dotAware.underservedZones, cityId)
          set((state) => ({
            sessionId: state.sessionId ?? 'offline',
            isRunning: false,
            isPaused: true,
            currentYear: 2026,
            currentFrame: frame,
            frameHistory: [frame],
            metricsHistory: [frame.metrics_snapshot],
            lastActions: dotAware.lastActions,
            planning: {
              ...state.planning,
              cityMode: cityId === 'fremon' ? 'generated' : 'real',
              cityId,
              growthPercent: dotAware.growthPercent,
              horizonYears: 50,
              infrastructure,
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
              timelinePhase: `${dotAware.cityName}: baseline · advance timeline for growth pressures`,
              timelinePopulation: dotAware.frame.metrics_snapshot.pop_total,
              districtProfiles: dotAware.districtProfiles,
              placementSuggestions: dotAware.placementSuggestions,
              placementFeedback: null,
              impactSummary: null,
            },
          }))
          notify('Analysis complete.')
          return
        }
      }

      const bundle = getSeedPlanningBundle(cityId, existingState.planning.budgetLevel)
      const infrastructure = mergeUserPieces(withoutRoadInfrastructure(bundle.existing.map((item) => ({ ...item }))), userPieces)

      if (cityId === 'fremon') {
        const beforeScores = { ...FREMON_BASE_METRICS }
        const underservedZones = bundle.underserved.map((zone) => ({ ...zone, improved: false, isImproved: false }))
        const frame = scoresToFrame(beforeScores, 2026, infrastructure, underservedZones, cityId)
        set((state) => ({
          sessionId: state.sessionId ?? 'offline',
          isRunning: false,
          isPaused: true,
          currentYear: 2026,
          currentFrame: frame,
          frameHistory: [frame],
          metricsHistory: [frame.metrics_snapshot],
          lastActions: underservedZones.slice(0, 4).map((zone, index) => ({
            x: index,
            y: 0,
            lat: zone.center[0],
            lng: zone.center[1],
            zone_type_id: gapTypeToSyntheticZoneType(zone.gapType),
            zone_display_name: zone.name,
            sps_score: zone.severity,
            placement_reason: zone.reason,
          })),
          planning: {
            ...state.planning,
            cityMode: 'generated',
            cityId,
            growthPercent: bundle.growthPercent,
            horizonYears: bundle.horizonYears,
            infrastructure,
            underservedZones,
            growthPressureZones: bundle.growth.map((zone) => ({ ...zone })),
            aiRecommendations: bundle.ai.map((item) => ({ ...item })),
            topRecommendation: bundle.top,
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
            timelinePhase: FREMON_TIMELINE[2026]?.phase ?? '2026 · demo baseline',
            timelinePopulation: FREMON_TIMELINE[2026]?.population ?? FREMON_POPULATION,
            districtProfiles: FREMON_DISTRICTS,
            placementSuggestions: FREMON_PLACEMENT_SUGGESTIONS,
            placementFeedback: null,
            impactSummary: null,
          },
        }))
        notify('Infrastructure gap analysis complete.')
        return
      }

      const underservedZones = bundle.underserved.map((zone) => ({ ...zone, improved: false, isImproved: false }))
      const growthPressureZones = bundle.growth.map((zone) => ({ ...zone }))
      const beforeScores = calculatePlanningScores(infrastructure, underservedZones, bundle.growthPercent, scenario)
      const frame = scoresToFrame(beforeScores, DEFAULT_HORIZON_YEARS, infrastructure, underservedZones, cityId)
      set((state) => ({
        sessionId: state.sessionId ?? 'offline',
        isRunning: false,
        isPaused: true,
        currentYear: DEFAULT_HORIZON_YEARS,
        currentFrame: frame,
        frameHistory: [frame],
        metricsHistory: [frame.metrics_snapshot],
        lastActions: underservedZones.slice(0, 4).map((zone, index) => ({
          x: index,
          y: 0,
          lat: zone.center[0],
          lng: zone.center[1],
          zone_type_id: gapTypeToSyntheticZoneType(zone.gapType),
          zone_display_name: zone.name,
          sps_score: zone.severity,
          placement_reason: zone.reason,
        })),
        planning: {
          ...state.planning,
          cityId,
          cityMode: bundle.cityMode,
          growthPercent: bundle.growthPercent,
          horizonYears: bundle.horizonYears,
          infrastructure,
          underservedZones,
          growthPressureZones,
          aiRecommendations: bundle.ai.map((item) => ({ ...item })),
          topRecommendation: bundle.top,
          beforeScores,
          afterScores: null,
          hasAnalyzed: true,
          hasAppliedAIPlan: false,
          hasComparedPlans: false,
          districtProfiles: [],
          placementSuggestions: [],
          timelineYear: 2026,
          timelinePhase: `${cityId.replace(/_/g, ' ')} · ${bundle.growthPercent}% growth scenario`,
          timelinePopulation: frame.metrics_snapshot.pop_total,
          selectedInfrastructureId: null,
          undoStack: [],
          placementFeedback: null,
          impactSummary: null,
        },
      }))
      notify('Infrastructure gap analysis complete.')
    } catch (err) {
      console.error(err)
      notify('Analysis could not load. Try again or pick Fremont / San José / Fremon.', 'error')
    }
  },

  hydratePlanningForCity: (cityId) => {
    try {
      const state = get()
      const preservedUser =
        state.planning.cityId === cityId ? state.planning.infrastructure.filter((item) => item.source === 'user_added') : []
      const bundle = getSeedPlanningBundle(cityId, state.planning.budgetLevel)
      const infrastructure = mergeUserPieces(withoutRoadInfrastructure(bundle.existing.map((item) => ({ ...item }))), preservedUser)
      const scenario = normalizeScenario(state.planning.priority)
      const scores = calculatePlanningScores(infrastructure, [], bundle.growthPercent, scenario)
      const frame = scoresToFrame(scores, 2026, infrastructure, [], cityId)
      set({
        sessionId: state.sessionId ?? 'offline',
        isRunning: false,
        isPaused: true,
        currentYear: 2026,
        currentFrame: frame,
        frameHistory: [frame],
        metricsHistory: [frame.metrics_snapshot],
        lastActions: [],
        planning: {
          ...state.planning,
          cityId,
          cityMode: bundle.cityMode,
          growthPercent: bundle.growthPercent,
          horizonYears: bundle.horizonYears,
          infrastructure,
          underservedZones: [],
          growthPressureZones: bundle.growth.map((item) => ({ ...item })),
          aiRecommendations: bundle.ai.map((item) => ({ ...item })),
          topRecommendation: bundle.top,
          beforeScores: null,
          afterScores: null,
          hasAnalyzed: false,
          hasAppliedAIPlan: false,
          hasComparedPlans: false,
          planBattlePlans: [],
          districtProfiles: cityId === 'fremon' ? FREMON_DISTRICTS : [],
          placementSuggestions: cityId === 'fremon' ? FREMON_PLACEMENT_SUGGESTIONS : [],
          timelineYear: 2026,
          timelinePhase:
            cityId === 'fremon'
              ? FREMON_TIMELINE[2026]?.phase ?? ''
              : `${cityId.replace(/_/g, ' ')} · run Analyze Infrastructure Gaps to view underserved zones`,
          timelinePopulation:
            cityId === 'fremon' ? FREMON_TIMELINE[2026]?.population ?? FREMON_POPULATION : frame.metrics_snapshot.pop_total,
          selectedInfrastructureId: null,
          undoStack: [],
          placementFeedback: null,
          impactSummary: null,
        },
      })
    } catch (err) {
      console.error(err)
      notify('Using demo data fallback for this city.', 'error')
    }
  },

  resetPlanningAnalysis: () => {
    const cid = get().planning.cityId
    get().hydratePlanningForCity(cid)
    notify('Analysis cleared. Run Analyze Infrastructure Gaps when ready.')
  },

  resetProposedPlan: () => {
    const state = get()
    if (!state.planning.hasAnalyzed) {
      notify('Run analysis first.', 'info')
      return
    }
    const bundle = getSeedPlanningBundle(state.planning.cityId, state.planning.budgetLevel)
    const userPieces = state.planning.infrastructure.filter((item) => item.source === 'user_added')
    const scenario = normalizeScenario(state.planning.priority)
    const baseInfra = mergeUserPieces(withoutRoadInfrastructure(bundle.existing.map((item) => ({ ...item }))), userPieces)
    const underservedZones = bundle.underserved.map((zone) => ({ ...zone, improved: false, isImproved: false }))
    const beforeScores =
      state.planning.cityId === 'fremon'
        ? { ...FREMON_BASE_METRICS }
        : calculatePlanningScores(baseInfra, underservedZones, bundle.growthPercent, scenario)
    const frame = scoresToFrame(beforeScores, state.planning.horizonYears, baseInfra, underservedZones, state.planning.cityId)
    set({
      currentFrame: frame,
      frameHistory: [frame],
      metricsHistory: [frame.metrics_snapshot],
      planning: {
        ...state.planning,
        infrastructure: baseInfra,
        underservedZones,
        aiRecommendations: bundle.ai.map((item) => ({ ...item })),
        topRecommendation: bundle.top,
        beforeScores,
        afterScores: null,
        hasAppliedAIPlan: false,
        impactSummary: null,
      },
    })
    notify('Proposed AI plan cleared.')
  },

  applyAIPlan: (scenarioId = 'balanced') => set((state) => {
    if (!state.planning.hasAnalyzed) return state
    const aiIds = new Set(state.planning.aiRecommendations.map((item) => item.id))
    const baseInfra = state.planning.infrastructure.filter((item) => !(item.status === 'proposed' && aiIds.has(item.id)))
    const applied = state.planning.aiRecommendations.map((item) => ({ ...item, status: 'proposed' as const }))
    const infrastructure = withoutRoadInfrastructure([...baseInfra, ...applied])
    const underservedZones =
      state.planning.cityId === 'fremon'
        ? markFremonImprovedZones(applied.map((item) => item.id))
        : markImprovedZones(state.planning.underservedZones, applied.map((item) => item.id))
    const afterScores =
      state.planning.cityId === 'fremon'
        ? {
            ...FREMON_EQUITY_FIRST_METRICS,
            totalEstimatedCost: 137_000_000,
            populationServed: FREMON_EQUITY_FIRST_METRICS.populationServed ?? 74_000,
            serviceGapCount: underservedZones.filter((zone) => !zone.isImproved).length,
          }
        : calculatePlanningScores(infrastructure, underservedZones, state.planning.growthPercent, normalizeScenario(scenarioId))
    const frame = scoresToFrame(afterScores, state.planning.horizonYears, infrastructure, underservedZones, state.planning.cityId)
    const baselineFrame = state.frameHistory[0] ?? frame
    const baselineMetrics = state.metricsHistory[0] ?? baselineFrame.metrics_snapshot
    return {
      currentFrame: frame,
      frameHistory: [baselineFrame, frame],
      metricsHistory: [baselineMetrics, frame.metrics_snapshot],
      lastActions: [
        ...applied
          .filter((item) => item.geometryType === 'Point')
          .map((item, index) => ({
            x: index,
            y: 0,
            lng: (item.coordinates as GeoJSON.Position)[0],
            lat: (item.coordinates as GeoJSON.Position)[1],
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
        impactSummary: {
          residentsServed:
            state.planning.cityId === 'fremon' ? 74_000 : afterScores.populationServed ?? state.planning.impactSummary?.residentsServed ?? 0,
          gapsFixed: underservedZones.filter((zone) => zone.isImproved).length,
          commuteReduction: Math.max(
            0,
            Math.round(
              (state.planning.beforeScores?.averageCommute ?? afterScores.averageCommute) - afterScores.averageCommute,
            ),
          ),
          emergencyDelta: Math.round(
            afterScores.emergencyAccess - (state.planning.beforeScores?.emergencyAccess ?? afterScores.emergencyAccess),
          ),
          cityHealthDelta: Math.round(afterScores.cityHealth - (state.planning.beforeScores?.cityHealth ?? afterScores.cityHealth)),
          equityDelta: Math.round(afterScores.equityScore - (state.planning.beforeScores?.equityScore ?? afterScores.equityScore)),
          fifteenMinuteDelta: Math.round((afterScores.fifteenMinuteCityScore ?? 0) - (state.planning.beforeScores?.fifteenMinuteCityScore ?? 0)),
          greenAccessDelta: Math.round(afterScores.greenSpace - (state.planning.beforeScores?.greenSpace ?? afterScores.greenSpace)),
          budgetUsed: state.planning.cityId === 'fremon' ? 137_000_000 : applied.reduce((sum, item) => sum + item.costEstimate, 0),
        },
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
    const frame = scoresToFrame(afterScores, state.planning.timelineYear, infrastructure, underservedZones, state.planning.cityId)
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
          gapsFixed: 5,
          commuteReduction: 10,
          emergencyDelta: 24,
          cityHealthDelta: 21,
          equityDelta: 37,
          fifteenMinuteDelta: 25,
          greenAccessDelta: 22,
          budgetUsed: 137_000_000,
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
    const frame = scoresToFrame(metrics, year, state.planning.infrastructure, underservedZones, state.planning.cityId)
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
      itemImprovesZone(item, zone)
        ? { ...zone, isImproved: true, improved: true, afterScore: Math.min(100, zone.beforeScore + 18) }
        : zone
    )
    const before = state.planning.beforeScores ?? calculatePlanningScores(state.planning.infrastructure, state.planning.underservedZones, state.planning.growthPercent, 'balanced')
    const afterScores = calculatePlanningScores(infrastructure, underservedZones, state.planning.growthPercent, 'balanced')
    const frame = scoresToFrame(afterScores, state.planning.horizonYears, infrastructure, underservedZones, state.planning.cityId)
    const placementFeedback = detectPlacementFeedback(item, state.planning)
    const city = STATIC_CITIES.find((city) => city.id === state.planning.cityId)
    return {
      currentFrame: frame,
      metricsHistory: [before, afterScores].map((score, index) => scoresToMetrics(score, index === 0 ? 2026 : state.planning.horizonYears, city)),
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
    const frame = saved.metrics ? scoresToFrame(saved.metrics, saved.timeHorizon, saved.features, state.planning.underservedZones, state.planning.cityId) : state.currentFrame
    return {
      currentFrame: frame,
      metricsHistory: saved.metrics
        ? [scoresToMetrics(saved.metrics, saved.timeHorizon, STATIC_CITIES.find((item) => item.id === state.planning.cityId))]
        : state.metricsHistory,
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
  const bundle = getSeedPlanningBundle('fremon', 'high')
  const infrastructure = withoutRoadInfrastructure(bundle.existing.map((item) => ({ ...item })))
  return {
    cityId: 'fremon',
    growthPercent: bundle.growthPercent,
    horizonYears: bundle.horizonYears,
    infrastructure,
    underservedZones: [],
    growthPressureZones: bundle.growth.map((item) => ({ ...item })),
    aiRecommendations: bundle.ai.map((item) => ({ ...item })),
    topRecommendation: bundle.top,
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
    timelinePhase: 'Fremon · run Analyze Infrastructure Gaps to reveal underserved zones',
    timelinePopulation: FREMON_POPULATION,
    equityLens: false,
    presentationMode: false,
    presentationStep: 0,
    districtProfiles: FREMON_DISTRICTS,
    selectedDistrictId: null,
    placementSuggestions: FREMON_PLACEMENT_SUGGESTIONS,
    placementFeedback: null,
    impactSummary: null,
    cityMode: 'generated',
  }
}

const FREMONT_CENTER = { lat: 37.5485, lng: -121.9886 }
function mergeUserPieces(base: InfrastructureItem[], users: InfrastructureItem[]): InfrastructureItem[] {
  const byId = new Map(base.map((item) => [item.id, { ...item }]))
  users.forEach((item) => byId.set(item.id, { ...item }))
  return Array.from(byId.values())
}

function isSeededDemoCity(cityId: string): boolean {
  return cityId === 'fremont' || cityId === 'san_jose' || cityId === 'fremon'
}

function gapTypeToSyntheticZoneType(gapType: UnderservedZone['gapType']): string {
  switch (gapType) {
    case 'emergency_access':
    case 'hospital_access':
      return 'HEALTH_CLINIC'
    case 'school_access':
      return 'EDU_HIGH'
    case 'park_access':
    case 'green_space':
      return 'PARK_SMALL'
    case 'transit_access':
      return 'BUS_STATION'
    case 'housing_access':
      return 'RES_MED_APARTMENT'
    case 'congestion':
      return 'BUS_STATION'
    default:
      return 'POWER_SUBSTATION'
  }
}

function getSeedPlanningBundle(cityId: string, budgetLevel: BudgetLevel) {
  if (cityId === 'fremont') {
    return {
      cityMode: 'real' as CityMode,
      growthPercent: DEFAULT_GROWTH_PERCENT,
      horizonYears: DEFAULT_HORIZON_YEARS,
      existing: FREMONT_EXISTING_INFRASTRUCTURE.map((item) => ({ ...item })),
      growth: FREMONT_GROWTH_PRESSURE_ZONES.map((item) => ({ ...item })),
      ai: withoutRoadInfrastructure(FREMONT_AI_RECOMMENDATIONS).map((item) => ({ ...item })),
      top: FREMONT_TOP_RECOMMENDATION,
      underserved: FREMONT_UNDERSERVED_ZONES.map((item) => ({ ...item })),
    }
  }
  if (cityId === 'san_jose') {
    const city = STATIC_CITIES.find((item) => item.id === cityId)
    if (city) return createCityNativePlanningBundle(city)
  }
  if (cityId === 'fremon') {
    return {
      cityMode: 'generated' as CityMode,
      growthPercent: FREMON_GROWTH_PERCENT,
      horizonYears: FREMON_HORIZON_YEARS,
      existing: FREMON_EXISTING_INFRASTRUCTURE.map((item) => ({ ...item })),
      growth: FREMON_GROWTH_PRESSURE_ZONES.map((item) => ({ ...item })),
      ai: budgetRecommendations(budgetLevel).map((item) => ({ ...item })),
      top: FREMON_TOP_RECOMMENDATION,
      underserved: FREMON_UNDERSERVED_ZONES.map((item) => ({ ...item })),
    }
  }
  const city = STATIC_CITIES.find((item) => item.id === cityId) ?? STATIC_CITIES.find((item) => item.id === 'fremont')!
  return createCityNativePlanningBundle(city)
}

function createCityNativePlanningBundle(city: CityProfile) {
  const existing = buildCityNativeInfrastructure(city)
  const anchors = cityAnalysisAnchors(city)
  const needs = rankServiceNeeds(existing, anchors, 'balanced').slice(0, 6)
  const usedAnchors: Array<[number, number]> = []
  const underserved = needs.map((need, index) => {
    const center = chooseGapAnchor(need.category, existing, anchors, usedAnchors)
    usedAnchors.push(center)
    const severity = Math.max(0.52, Math.min(0.92, need.severity - index * 0.025))
    const district = districtNameForPoint(city, center)
    return {
      id: `${city.id}-${need.category}-gap-${index}`,
      name: `${district} ${titleCase(CATEGORY_LABEL[need.category] ?? need.category)} Gap`,
      gapType: CATEGORY_GAP_TYPE[need.category] ?? 'equity',
      center,
      radiusMeters: Math.round(950 + severity * 1200),
      severity,
      improvedBy: [`${city.id}-ai-${need.category}-${index}`],
      improved: false,
      isImproved: false,
      reason: `${district} has weaker ${CATEGORY_LABEL[need.category] ?? need.category} coverage relative to ${city.name}'s current landmarks, growth pattern, and planning constraints.`,
      beforeScore: Math.round(40 + (1 - severity) * 32),
    } satisfies UnderservedZone
  })
  const ai = underserved.map((zone, index) => {
    const category = needs[index].category
    const label = CATEGORY_LABEL[category] ?? category
    const district = zone.name.replace(/ Gap$/, '')
    return pointInfrastructure(
      `${city.id}-ai-${category}-${index}`,
      `${district} ${titleCase(label)}`,
      category,
      zone.center,
      `Recommended for ${city.name}: closes the ${zone.name.toLowerCase()} using the selected city's own bounds, landmarks, and growth context.`,
      estimatedCostForCategory(category, index),
      Math.round(80 + zone.severity * 17),
      Math.min(0.94, 0.74 + zone.severity * 0.18),
      'ai_recommended',
    )
  })
  const topItem = ai[0]
  const topZone = underserved[0]
  return {
    cityMode: 'real' as CityMode,
    growthPercent: Math.max(8, Math.round(city.urban_growth_rate * 10)),
    horizonYears: DEFAULT_HORIZON_YEARS,
    existing,
    growth: underserved.slice(0, 4).map((zone, index) => ({
      id: `${zone.id}-growth`,
      name: zone.name.replace('Gap', 'Growth Pressure'),
      center: zone.center,
      radiusMeters: Math.round(zone.radiusMeters * 0.8),
      pressure: index < 2 ? 'high' as const : 'medium' as const,
      projectedGrowthPercent: Math.round(16 + zone.severity * 24),
      reason: `${city.name}'s growth scenario concentrates demand where existing ${zone.gapType.replace(/_/g, ' ')} coverage is weakest.`,
    })),
    ai,
    top: {
      id: `${city.id}-top-recommendation`,
      title: topItem ? `Add ${topItem.name}` : `Improve ${city.name} service coverage`,
      zoneName: topZone?.name ?? `${city.name} service gap`,
      locationName: topZone?.name ?? city.name,
      infrastructureType: topItem?.category ?? 'clinic',
      coordinates: topItem?.coordinates as GeoJSON.Position | undefined,
      reason: topZone?.reason ?? `${city.name} needs targeted infrastructure based on its own local context.`,
      expectedImpact: {
        emergencyAccess: topItem?.category === 'clinic' || topItem?.category === 'fire_station' ? 18 : 8,
        cityHealth: 12,
        averageResponseTime: -3,
        equityScore: 10,
        populationServed: Math.round(city.population_current * 0.018),
      },
      estimatedCost: topItem?.costEstimate ?? 18_000_000,
      costEstimate: topItem?.costEstimate ?? 18_000_000,
      confidence: topItem?.confidence ?? 0.82,
      relatedGapIds: topZone ? [topZone.id] : [],
      itemIds: topItem ? [topItem.id] : [],
      featuresToAdd: ai,
    },
    underserved,
  }
}

function buildCityNativeInfrastructure(city: CityProfile): InfrastructureItem[] {
  const landmarkItems = (city.landmarks ?? [])
    .map((landmark, index) => {
      const category = zoneTypeToInfrastructureCategory(landmark.zone_type_id)
      if (!category || category === 'road' || category === 'bike_lane') return null
      return pointInfrastructure(
        `${city.id}-landmark-${index}`,
        landmark.name,
        category,
        [landmark.lat, landmark.lng],
        `${landmark.name} is part of ${city.name}'s baseline map data and is used only for this city's analysis.`,
        0,
        landmark.data_source === 'real' ? 84 : 70,
        landmark.data_source === 'real' ? 0.9 : 0.72,
        'existing',
        landmark.data_source === 'real' ? 'openstreetmap' : 'demo_seed',
      )
    })
    .filter((item): item is InfrastructureItem => Boolean(item))

  if (landmarkItems.length >= 4) return dedupeInfrastructure(landmarkItems, 0.006)

  const [west, south, east, north] = city.bbox
  const districtAnchors = CITY_DISTRICT_ANCHORS[city.id]?.filter((anchor) => insideCityBBox(anchor.center[0], anchor.center[1], city)) ?? []
  const fallbackAnchors = [
    { name: 'Central', center: [south + (north - south) * 0.5, west + (east - west) * 0.48] as [number, number] },
    { name: 'East', center: [south + (north - south) * 0.56, west + (east - west) * 0.68] as [number, number] },
    { name: 'Civic', center: [south + (north - south) * 0.47, west + (east - west) * 0.42] as [number, number] },
    { name: 'Transit', center: [south + (north - south) * 0.54, west + (east - west) * 0.52] as [number, number] },
    { name: 'South', center: [south + (north - south) * 0.38, west + (east - west) * 0.34] as [number, number] },
    { name: 'Growth', center: [south + (north - south) * 0.32, west + (east - west) * 0.72] as [number, number] },
  ]
  const anchors = districtAnchors.length >= 5 ? districtAnchors : fallbackAnchors
  const generated: Array<{ category: InfrastructureItem['category']; suffix: string; anchor: { name: string; center: [number, number] }; score: number }> = [
    { category: 'clinic', suffix: 'Clinic', anchor: anchors[0], score: 70 },
    { category: 'school', suffix: 'School', anchor: anchors[1] ?? anchors[0], score: 68 },
    { category: 'park', suffix: 'Park', anchor: anchors[2] ?? anchors[0], score: 72 },
    { category: 'transit_stop', suffix: 'Transit Hub', anchor: anchors[3] ?? anchors[0], score: 74 },
    { category: 'fire_station', suffix: 'Response Station', anchor: anchors[4] ?? anchors[0], score: 69 },
    { category: 'housing_zone', suffix: 'Housing Growth Node', anchor: anchors[5] ?? anchors[1] ?? anchors[0], score: 66 },
  ]

  return generated.map((item, index) => pointInfrastructure(
    `${city.id}-baseline-${item.category}-${index}`,
    `${item.anchor.name} ${item.suffix}`,
    item.category,
    item.anchor.center,
    `${item.anchor.name} ${item.suffix} is seeded from ${city.name}'s own district anchors because detailed landmark coverage is limited for this city.`,
    0,
    item.score,
    0.7,
    'existing',
    'demo_seed',
  ))
}

function districtNameForPoint(city: CityProfile, center: [number, number]) {
  const namedDistricts = CITY_DISTRICT_ANCHORS[city.id]
  if (namedDistricts?.length) {
    return [...namedDistricts].sort((a, b) =>
      Math.hypot(center[0] - a.center[0], center[1] - a.center[1]) -
      Math.hypot(center[0] - b.center[0], center[1] - b.center[1])
    )[0].name
  }
  const [west, south, east, north] = city.bbox
  const latRatio = (center[0] - south) / Math.max(0.001, north - south)
  const lngRatio = (center[1] - west) / Math.max(0.001, east - west)
  const vertical = latRatio > 0.62 ? 'North' : latRatio < 0.38 ? 'South' : 'Central'
  const horizontal = lngRatio > 0.62 ? 'East' : lngRatio < 0.38 ? 'West' : ''
  const direction = vertical === 'Central' ? horizontal || 'Central' : horizontal ? `${vertical} ${horizontal}` : vertical
  return `${direction} ${city.name}`
}

function estimatedCostForCategory(category: InfrastructureItem['category'], index: number) {
  const base: Partial<Record<InfrastructureItem['category'], number>> = {
    clinic: 18_000_000,
    hospital: 120_000_000,
    school: 35_000_000,
    park: 12_000_000,
    transit_stop: 9_000_000,
    transit_line: 42_000_000,
    fire_station: 22_000_000,
    police_station: 20_000_000,
    housing_zone: 48_000_000,
    utility: 16_000_000,
    community_center: 24_000_000,
  }
  return (base[category] ?? 14_000_000) + index * 2_500_000
}

function withoutRoadInfrastructure(items: InfrastructureItem[]): InfrastructureItem[] {
  return items.filter((item) => item.category !== 'road' && item.category !== 'bike_lane')
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

const CITY_DISTRICT_ANCHORS: Record<string, Array<{ name: string; center: [number, number] }>> = {
  new_york: [
    { name: 'Lower Manhattan', center: [40.7074, -74.0104] },
    { name: 'Chelsea Hudson Yards', center: [40.7465, -74.0014] },
    { name: 'Midtown East', center: [40.7527, -73.9772] },
    { name: 'Upper West Side', center: [40.7870, -73.9754] },
    { name: 'Harlem', center: [40.8116, -73.9465] },
    { name: 'South Bronx', center: [40.8151, -73.8937] },
    { name: 'Williamsburg Brooklyn', center: [40.7081, -73.9571] },
    { name: 'Park Slope Brooklyn', center: [40.6712, -73.9776] },
    { name: 'Red Hook Brooklyn', center: [40.6744, -74.0005] },
    { name: 'Long Island City Queens', center: [40.7447, -73.9453] },
    { name: 'Jackson Heights Queens', center: [40.7557, -73.8831] },
    { name: 'North Shore Staten Island', center: [40.6437, -74.0740] },
  ],
  los_angeles: [
    { name: 'Downtown LA', center: [34.0522, -118.2437] },
    { name: 'Hollywood', center: [34.0928, -118.3287] },
    { name: 'Westwood', center: [34.0689, -118.4452] },
    { name: 'South LA', center: [33.9542, -118.2012] },
    { name: 'Santa Monica Corridor', center: [34.0195, -118.4912] },
    { name: 'San Fernando Valley', center: [34.1811, -118.3090] },
  ],
  tokyo: [
    { name: 'Shinjuku', center: [35.6896, 139.7006] },
    { name: 'Shibuya', center: [35.6580, 139.7016] },
    { name: 'Ueno Bunkyo', center: [35.7142, 139.7613] },
    { name: 'Tokyo Station Marunouchi', center: [35.6812, 139.7671] },
    { name: 'Odaiba Waterfront', center: [35.6267, 139.7745] },
    { name: 'Koto East', center: [35.6722, 139.8175] },
  ],
  lagos: [
    { name: 'Ikeja', center: [6.6018, 3.3515] },
    { name: 'Yaba University District', center: [6.5158, 3.4022] },
    { name: 'Victoria Island', center: [6.4281, 3.4219] },
    { name: 'Apapa Port', center: [6.4493, 3.3636] },
    { name: 'Makoko Waterfront', center: [6.4969, 3.3947] },
    { name: 'Lekki Growth Corridor', center: [6.4698, 3.5852] },
  ],
  london: [
    { name: 'Westminster', center: [51.5010, -0.1418] },
    { name: 'Waterloo South Bank', center: [51.5036, -0.1143] },
    { name: 'Canary Wharf', center: [51.5054, -0.0235] },
    { name: 'Stratford', center: [51.5415, -0.0023] },
    { name: 'Battersea', center: [51.4827, -0.1442] },
    { name: 'Heathrow West', center: [51.4700, -0.4543] },
  ],
  sao_paulo: [
    { name: 'Paulista Corridor', center: [-23.5643, -46.6543] },
    { name: 'Pinheiros USP', center: [-23.5613, -46.7301] },
    { name: 'Luz Centro', center: [-23.5382, -46.6396] },
    { name: 'Ibirapuera South', center: [-23.5874, -46.6576] },
    { name: 'Paraisopolis', center: [-23.6073, -46.7142] },
    { name: 'ABC Industrial Corridor', center: [-23.6740, -46.5639] },
  ],
  singapore: [
    { name: 'Outram Health District', center: [1.2797, 103.8360] },
    { name: 'Queenstown NUS', center: [1.2966, 103.7764] },
    { name: 'Marina Bay', center: [1.2802, 103.8545] },
    { name: 'Jurong West', center: [1.3162, 103.7062] },
    { name: 'Tengah Growth Town', center: [1.3733, 103.7356] },
    { name: 'Pasir Ris East', center: [1.3721, 103.9490] },
  ],
  dubai: [
    { name: 'Deira Health District', center: [25.2716, 55.3128] },
    { name: 'Downtown Dubai', center: [25.1972, 55.2744] },
    { name: 'Dubai Marina', center: [25.0805, 55.1373] },
    { name: 'Al Quoz', center: [25.1485, 55.2219] },
    { name: 'Jebel Ali', center: [25.0069, 55.0662] },
    { name: 'Airport Free Zone', center: [25.2532, 55.3657] },
  ],
  stockton: [
    { name: 'Downtown Stockton', center: [37.9577, -121.2908] },
    { name: 'Port Stockton', center: [37.9400, -121.3100] },
    { name: 'North Stockton', center: [38.0000, -121.3000] },
    { name: 'South Stockton', center: [37.9200, -121.2700] },
    { name: 'East Stockton', center: [37.9700, -121.2600] },
  ],
  san_jose: [
    { name: 'Downtown San Jose', center: [37.3382, -121.8863] },
    { name: 'Berryessa Transit District', center: [37.3720, -121.9200] },
    { name: 'East San Jose', center: [37.3600, -121.8700] },
    { name: 'South San Jose', center: [37.3000, -121.9100] },
    { name: 'North San Jose Innovation District', center: [37.3850, -121.8600] },
    { name: 'West San Jose', center: [37.3400, -121.9500] },
  ],
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
    const district = districtNameForPoint(city, center)
    const label = titleCase(CATEGORY_LABEL[need.category] ?? need.category)
    return {
      id: `${cityId}-${need.category}-gap-${index}`,
      name: `${district} ${label} Gap`,
      gapType: CATEGORY_GAP_TYPE[need.category] ?? 'equity',
      center,
      radiusMeters: Math.round(900 + severity * 1250),
      severity,
      improvedBy: [`${cityId}-ai-${need.category}-${index}`],
      improved: false,
      isImproved: false,
      reason: `${district} has weak ${CATEGORY_LABEL[need.category] ?? need.category} coverage in ${city.name}'s current city-specific infrastructure layer.`,
      beforeScore: Math.round(38 + (1 - severity) * 34),
    } satisfies UnderservedZone
  })
  const aiRecommendations = underservedZones.map((zone, index) => {
    const category = selectedNeeds[index].category
    const district = districtNameForPoint(city, zone.center)
    const label = titleCase(CATEGORY_LABEL[category] ?? category)
    return pointInfrastructure(
      `${cityId}-ai-${category}-${index}`,
      `${district} ${label}`,
      category,
      zone.center,
      `Recommended for ${city.name}: adds a ${CATEGORY_LABEL[category] ?? category} in ${district}, spaced away from existing city-specific infrastructure.`,
      estimatedCostForCategory(category, index),
      Math.round(82 + zone.severity * 16),
      Math.min(0.94, 0.72 + zone.severity * 0.2),
      'ai_recommended'
    )
  })
  const beforeScores = dotCoverageScores(existing, underservedZones, city, scenario)
  const frame = scoresToFrame(beforeScores, 2026, existing, underservedZones, cityId)
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
  const namedAnchors = CITY_DISTRICT_ANCHORS[city.id]
    ?.map((item) => item.center)
    .filter(([lat, lng]) => insideCityBBox(lat, lng, city)) ?? []
  if (namedAnchors.length >= 5) return dedupeAnchors(namedAnchors)

  const landmarkAnchors = (city.landmarks ?? [])
    .map((item) => [item.lat, item.lng] as [number, number])
    .filter(([lat, lng]) => insideCityBBox(lat, lng, city))
  if (landmarkAnchors.length >= 6) return dedupeAnchors(landmarkAnchors)

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

function scoresToFrame(scores: PlanningScores, year: number, infrastructure: InfrastructureItem[], zones: UnderservedZone[], cityId?: string): SimulationFrame {
  const city = cityId ? STATIC_CITIES.find((item) => item.id === cityId) : null
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
    metrics_snapshot: scoresToMetrics(scores, year, city),
    agent_actions: zones.filter((zone) => !zone.isImproved).slice(0, 4).map((zone, index) => ({
      x: index,
      y: 0,
      lng: zone.center[1],
      lat: zone.center[0],
      zone_type_id: gapTypeToSyntheticZoneType(zone.gapType),
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
  const t = Math.max(0, Math.min(1, (year - 2026) / 75))
  const base = planning.beforeScores ?? FREMON_BASE_METRICS
  const city = STATIC_CITIES.find((item) => item.id === planning.cityId)
  const basePopulation = city?.population_current || (planning.cityId === 'fremon' ? FREMON_POPULATION : planning.timelinePopulation || FREMON_POPULATION)
  return {
    population: Math.round(basePopulation * (1 + t * (planning.growthPercent / 100))),
    pressure: 1 + t * 0.68,
    label: `${year}`,
    phase: `${year} · 75-year planning horizon · prioritize distributed service coverage`,
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
  const t = Math.max(0, Math.min(1, (year - 2026) / 75))
  return Math.round(FREMON_POPULATION * (1 + t * 0.45))
}

function scoresToMetrics(scores: PlanningScores, year: number, city?: CityProfile | null): MetricsSnapshot {
  const horizon = city?.id === 'fremon' ? FREMON_HORIZON_YEARS : DEFAULT_HORIZON_YEARS
  const growthPercent = city?.id === 'fremon'
    ? FREMON_GROWTH_PERCENT
    : Math.max(8, Math.round((city?.urban_growth_rate ?? DEFAULT_GROWTH_PERCENT / 10) * 10))
  const t = Math.max(0, Math.min(1, (year - 2026) / Math.max(1, horizon)))
  const population = city?.id === 'fremon'
    ? estimateTimelinePopulation(year)
    : Math.round((city?.population_current ?? FREMON_POPULATION) * (1 + (growthPercent / 100) * t))
  const gdpPerCapita = city?.gdp_per_capita ?? 66_000
  return {
    year,
    pop_total: population,
    pop_density_avg: 1250,
    pop_growth_rate: growthPercent / horizon,
    mobility_commute: scores.averageCommute,
    mobility_congestion: scores.congestion,
    mobility_transit_coverage: scores.transitCoverage,
    mobility_walkability: scores.walkability,
    econ_gdp_est: Math.round(population * gdpPerCapita),
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

function itemImprovesZone(item: InfrastructureItem, zone: UnderservedZone) {
  if (zone.isImproved || item.geometryType !== 'Point') return false
  const matchingGaps: Partial<Record<InfrastructureItem['category'], UnderservedZone['gapType'][]>> = {
    clinic: ['hospital_access', 'emergency_access'],
    hospital: ['hospital_access', 'emergency_access'],
    school: ['school_access'],
    park: ['park_access', 'green_space'],
    transit_stop: ['transit_access'],
    transit_line: ['transit_access'],
    housing_zone: ['housing_access'],
    mixed_use: ['housing_access', 'transit_access'],
    community_center: ['equity', 'housing_access'],
  }
  if (!(matchingGaps[item.category] ?? []).includes(zone.gapType)) return false
  const [lng, lat] = item.coordinates as GeoJSON.Position
  const distance = distanceMeters(lat, lng, zone.center[0], zone.center[1])
  return distance <= Math.max(650, zone.radiusMeters * 1.08)
}

function distanceMeters(latA: number, lngA: number, latB: number, lngB: number) {
  const latMeters = (latA - latB) * 111_000
  const lngMeters = (lngA - lngB) * 111_000 * Math.cos((latA * Math.PI) / 180)
  return Math.hypot(latMeters, lngMeters)
}

function detectPlacementFeedback(item: InfrastructureItem, planning: PlanningState): PlacementFeedback {
  const coords = item.geometryType === 'Point' ? item.coordinates as GeoJSON.Position : null
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
  if (coords) {
    const relevant = planning.underservedZones
      .filter((zone) => itemImprovesZone(item, zone))
      .sort((a, b) => distanceMeters(coords[1] as number, coords[0] as number, a.center[0], a.center[1]) - distanceMeters(coords[1] as number, coords[0] as number, b.center[0], b.center[1]))
    if (relevant[0]) {
      const residents = Math.round(planning.timelinePopulation * 0.018)
      return { type: 'good', title: 'Good Placement', message: `This ${item.category.replace(/_/g, ' ')} fills ${relevant[0].name} and serves about ${residents.toLocaleString()} projected residents.` }
    }
    if (planning.underservedZones.length) {
      return { type: 'warning', title: 'Planning Conflict', message: `This ${item.category.replace(/_/g, ' ')} is placeable, but it is too far from the matching underserved gap to improve the analysis score.` }
    }
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
