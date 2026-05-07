export interface Landmark {
  name: string
  lat: number
  lng: number
  zone_type_id: string
  category: string
  data_source: 'real' | 'estimated' | 'projected'
  /** Override tile width in degrees. Defaults to category-based size. */
  w_deg?: number
  /** Override tile height in degrees. Defaults to w_deg * 0.75. */
  h_deg?: number
}

export type InfrastructureCategory =
  | 'hospital'
  | 'clinic'
  | 'school'
  | 'park'
  | 'transit_stop'
  | 'transit_line'
  | 'fire_station'
  | 'police_station'
  | 'housing_zone'
  | 'commercial_zone'
  | 'industrial_zone'
  | 'road'
  | 'bike_lane'
  | 'utility'
  | 'water'
  | 'power'
  | 'mixed_use'
  | 'community_center'

export type InfrastructureStatus = 'existing' | 'proposed' | 'ai_recommended' | 'improved' | 'removed'
export type InfrastructureSource = 'openstreetmap' | 'demo_seed' | 'user_added' | 'ai_recommended' | 'simulation'
export type GeometryType = 'Point' | 'LineString' | 'Polygon'

export interface InfrastructureItem {
  id: string
  name: string
  category: InfrastructureCategory
  status: InfrastructureStatus
  source: InfrastructureSource
  coordinates: GeoJSON.Position | GeoJSON.Position[] | GeoJSON.Position[][]
  geometryType: GeometryType
  geometry?: GeoJSON.Geometry
  reason: string
  costEstimate: number
  impactScore: number
  confidence: number
  createdAt: string
  updatedAt?: string
}

export type UnderservedZoneType =
  | 'hospital_access'
  | 'school_access'
  | 'park_access'
  | 'transit_access'
  | 'emergency_access'
  | 'congestion'
  | 'equity'
  | 'housing_access'
  | 'green_space'

export interface UnderservedZone {
  id: string
  name: string
  gapType: UnderservedZoneType
  type?: UnderservedZoneType
  geometry?: GeoJSON.Geometry
  center: [number, number]
  radiusMeters: number
  severity: number
  improvedBy: string[]
  improved?: boolean
  isImproved?: boolean
  reason: string
  beforeScore: number
  afterScore?: number
}

export interface PlanningScores {
  cityHealth: number
  transitCoverage: number
  emergencyAccess: number
  housingAccess: number
  greenSpace: number
  fifteenMinuteCityScore?: number
  walkability: number
  congestion: number
  congestionRisk: number
  averageCommute: number
  co2Estimate: number
  equityScore: number
  educationAccess: number
  populationServed?: number
  serviceGapCount?: number
  totalEstimatedCost: number
}

export type CityMode = 'real' | 'generated'
export type BudgetLevel = 'low' | 'medium' | 'high'
export type TimelineYear = number

export interface PlanBattlePlan {
  id: 'balanced' | 'transit_first' | 'equity_first'
  label: string
  summary: string
  tradeoff: string
  cost: number
  budgetUsed: number
  populationServed: number
  gapsFixed: number
  isRecommended: boolean
  reason?: string
  metrics: PlanningScores
  featureIds: string[]
}

export interface DistrictProfile {
  id: string
  name: string
  mainIssue: string
  severity: number
  populationAffected: number
  recommendedFix: string
  beforeScore: number
  afterScore: number
  center: [number, number]
  relatedGapId?: string
}

export interface PlacementSuggestion {
  id: string
  rank: number
  title: string
  category: InfrastructureCategory
  coordinates: GeoJSON.Position
  expectedImpact: string
  costEstimate: number
  reason: string
  confidence: number
}

export interface PlacementFeedback {
  type: 'good' | 'warning' | 'invalid'
  title: string
  message: string
}

export interface BudgetSummary {
  level: BudgetLevel
  amount: number
  used: number
  remaining: number
  costPerImpactPoint: number
  populationServedPerMillion: number
  label: string
  guidance: string
}

export interface AIRecommendation {
  id: string
  title: string
  zoneName: string
  locationName?: string
  infrastructureType: InfrastructureCategory
  coordinates?: GeoJSON.Position
  reason: string
  expectedImpact: Record<string, number>
  estimatedCost: number
  costEstimate?: number
  confidence: number
  relatedGapIds?: string[]
  featuresToAdd?: InfrastructureItem[]
  itemIds: string[]
}

export interface GrowthPressureZone {
  id: string
  name: string
  center: [number, number]
  radiusMeters: number
  pressure: 'medium' | 'high'
  projectedGrowthPercent: number
  reason: string
}

export interface SavedPlanningScenario {
  id: string
  city: string
  growthRate: number
  timeHorizon: number
  scenarioType: ScenarioId
  features: InfrastructureItem[]
  metrics: PlanningScores | null
  createdAt: string
  updatedAt: string
}

export interface CityProfile {
  id: string
  name: string
  country: string
  center_lat: number
  center_lng: number
  default_zoom: number
  climate_zone: string
  population_current: number
  gdp_per_capita: number
  urban_growth_rate: number
  key_planning_challenge: string
  expansion_constraint?: string
  bbox: [number, number, number, number]
  landmarks?: Landmark[]
  historical_snapshots?: Array<{
    year: number
    population: number
    area_km2: number
    key_event: string
  }>
}

export interface MetricsSnapshot {
  year: number
  pop_total: number
  pop_density_avg: number
  pop_growth_rate: number
  mobility_commute: number
  mobility_congestion: number
  mobility_transit_coverage: number
  mobility_walkability: number
  econ_gdp_est: number
  econ_housing_afford: number
  econ_jobs_created: number
  env_green_ratio: number
  env_co2_est: number
  env_impervious: number
  env_flood_exposure: number
  equity_infra_gini: number
  equity_hosp_coverage: number
  equity_school_access: number
  infra_power_load: number
  infra_water_capacity: number
  safety_response_time: number
}

export type ScenarioId =
  | 'balanced'
  | 'max_growth'
  | 'climate_resilient'
  | 'equity_focused'
  | 'transit_first'
  | 'emergency_ready'
