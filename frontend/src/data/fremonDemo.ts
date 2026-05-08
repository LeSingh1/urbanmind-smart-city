import type {
  AIRecommendation,
  BudgetLevel,
  BudgetSummary,
  DistrictProfile,
  GrowthPressureZone,
  InfrastructureCategory,
  InfrastructureItem,
  PlacementSuggestion,
  PlanBattlePlan,
  PlanningScores,
  TimelineYear,
  UnderservedZone,
} from '@/types/city.types'

const createdAt = '2026-01-01T00:00:00.000Z'

export const FREMON_CITY_ID = 'fremon'
export const FREMON_GROWTH_PERCENT = 35
export const FREMON_HORIZON_YEARS = 10
export const FREMON_POPULATION = 420_000

export const FREMON_BASE_METRICS: PlanningScores = {
  cityHealth: 61,
  emergencyAccess: 55,
  transitCoverage: 48,
  housingAccess: 68,
  greenSpace: 52,
  averageCommute: 42,
  co2Estimate: 100,
  equityScore: 49,
  congestionRisk: 72,
  congestion: 72,
  educationAccess: 58,
  fifteenMinuteCityScore: 54,
  walkability: 57,
  populationServed: 0,
  serviceGapCount: 6,
  totalEstimatedCost: 0,
}

export const FREMON_BALANCED_METRICS: PlanningScores = {
  cityHealth: 76,
  emergencyAccess: 74,
  transitCoverage: 66,
  housingAccess: 75,
  greenSpace: 68,
  averageCommute: 34,
  co2Estimate: 88,
  equityScore: 67,
  congestionRisk: 58,
  congestion: 58,
  educationAccess: 73,
  fifteenMinuteCityScore: 70,
  walkability: 70,
  populationServed: 58_000,
  serviceGapCount: 2,
  totalEstimatedCost: 70_000_000,
}

export const FREMON_TRANSIT_FIRST_METRICS: PlanningScores = {
  cityHealth: 78,
  emergencyAccess: 68,
  transitCoverage: 84,
  housingAccess: 73,
  greenSpace: 61,
  averageCommute: 28,
  co2Estimate: 80,
  equityScore: 63,
  congestionRisk: 49,
  congestion: 49,
  educationAccess: 68,
  fifteenMinuteCityScore: 74,
  walkability: 76,
  populationServed: 62_000,
  serviceGapCount: 3,
  totalEstimatedCost: 91_000_000,
}

export const FREMON_EQUITY_FIRST_METRICS: PlanningScores = {
  cityHealth: 82,
  emergencyAccess: 79,
  transitCoverage: 72,
  housingAccess: 77,
  greenSpace: 74,
  averageCommute: 32,
  co2Estimate: 84,
  equityScore: 86,
  congestionRisk: 54,
  congestion: 54,
  educationAccess: 81,
  fifteenMinuteCityScore: 79,
  walkability: 78,
  populationServed: 74_000,
  serviceGapCount: 1,
  totalEstimatedCost: 137_000_000,
}

export const FREMON_EXISTING_INFRASTRUCTURE: InfrastructureItem[] = [
  point('fremon-central-clinic', 'Fremon Civic Clinic', 'clinic', [-121.988, 37.542], 'Existing clinic is central but leaves south growth districts undercovered.', 0, 70, 0.82),
  point('fremon-north-bus-hub', 'North Loop Bus Hub', 'transit_stop', [-122.018, 37.572], 'Low-frequency transit anchor serving only part of the north district.', 0, 64, 0.78),
  point('fremon-east-school', 'Eastside Learning Center', 'school', [-121.938, 37.540], 'Existing education capacity east of downtown, below projected demand.', 0, 66, 0.8),
  point('fremon-central-park', 'Civic Commons Park', 'park', [-121.965, 37.548], 'Central open-space anchor, too small for 35% projected growth.', 0, 62, 0.77),
  point('fremon-fire-west', 'West Response Station', 'fire_station', [-122.024, 37.548], 'Fire response station near the west congestion corridor.', 0, 72, 0.84),
  point('fremon-police-core', 'Fremon Safety Center', 'police_station', [-121.983, 37.552], 'Public safety office near the civic core.', 0, 74, 0.86),
  point('fremon-innovation', 'Innovation District', 'commercial_zone', [-121.946, 37.565], 'Employment growth district with daytime population pressure.', 0, 68, 0.82),
  point('fremon-housing-expansion', 'New Housing Expansion Zone', 'housing_zone', [-121.946, 37.510], 'Projected housing growth needs schools, utilities, clinics, and emergency access.', 0, 65, 0.84),
]

export const FREMON_AI_RECOMMENDATIONS: InfrastructureItem[] = [
  point('fremon-ai-south-clinic', 'South Emergency Gap Clinic', 'clinic', [-121.984, 37.504], 'Improves emergency and primary care access for South Fremon growth households.', 18_000_000, 92, 0.87, 'ai_recommended'),
  point('fremon-ai-east-school', 'East Education District School', 'school', [-121.936, 37.548], 'Adds classroom capacity near East Fremon residential growth.', 32_000_000, 88, 0.85, 'ai_recommended'),
  point('fremon-ai-north-transit', 'North Transit Hub', 'transit_stop', [-122.018, 37.578], 'Places frequent transit service at the strongest north-side access gap without drawing corridors.', 39_000_000, 90, 0.84, 'ai_recommended'),
  point('fremon-ai-central-green', 'Central Green Corridor', 'park', [-121.965, 37.556], 'Adds walkable open space at the central green-space deficit.', 14_000_000, 82, 0.82, 'ai_recommended'),
  point('fremon-ai-mixed-use', 'New Housing Expansion Community Center', 'community_center', [-121.942, 37.516], 'Adds community-serving services near transit to reduce commute pressure and improve neighborhood support.', 28_000_000, 80, 0.8, 'ai_recommended'),
  point('fremon-ai-west-mobility-hub', 'West Congestion Relief Transit Stop', 'transit_stop', [-122.026, 37.546], 'Adds a mobility service point where the west district has commute pressure.', 6_000_000, 74, 0.79, 'ai_recommended'),
]

export const FREMON_UNDERSERVED_ZONES: UnderservedZone[] = [
  zone('fremon-north-transit-gap', 'North Transit Gap', 'transit_access', [37.578, -122.018], 1550, 0.84, 'North district has poor frequent-transit coverage as population grows.', 40, ['fremon-ai-north-transit']),
  zone('fremon-east-education-gap', 'East Education Gap', 'school_access', [37.548, -121.936], 1450, 0.88, 'East district classroom demand exceeds local seeded school capacity.', 37, ['fremon-ai-east-school']),
  zone('fremon-south-emergency-gap', 'South Emergency Gap', 'emergency_access', [37.504, -121.984], 1600, 0.92, 'South district lacks clinics near projected housing growth.', 34, ['fremon-ai-south-clinic']),
  zone('fremon-central-green-gap', 'Central Green Space Gap', 'green_space', [37.556, -121.965], 1300, 0.74, 'Central district has lower walkable park access under growth.', 46, ['fremon-ai-central-green']),
  zone('fremon-west-congestion-zone', 'West Congestion Zone', 'congestion', [37.546, -122.026], 1500, 0.82, 'West commute demand has too few mobility alternatives.', 39, ['fremon-ai-west-mobility-hub', 'fremon-ai-north-transit']),
  zone('fremon-housing-utility-gap', 'New Housing Expansion Zone', 'housing_access', [37.516, -121.942], 1450, 0.8, 'New housing needs nearby services, utilities, clinics, and emergency access.', 43, ['fremon-ai-mixed-use', 'fremon-ai-south-clinic']),
]

export const FREMON_GROWTH_PRESSURE_ZONES: GrowthPressureZone[] = [
  { id: 'fremon-growth-south', name: 'South District Housing Growth', center: [37.504, -121.984], radiusMeters: 1600, pressure: 'high', projectedGrowthPercent: 38, reason: 'New housing permits concentrate south of the civic core.' },
  { id: 'fremon-growth-east', name: 'East Family Housing Growth', center: [37.548, -121.936], radiusMeters: 1500, pressure: 'high', projectedGrowthPercent: 36, reason: 'Family-size units drive education demand.' },
  { id: 'fremon-growth-north', name: 'North Transit Demand', center: [37.578, -122.018], radiusMeters: 1400, pressure: 'medium', projectedGrowthPercent: 28, reason: 'North district growth is transit constrained.' },
  { id: 'fremon-growth-west', name: 'West Commute Pressure', center: [37.546, -122.026], radiusMeters: 1550, pressure: 'medium', projectedGrowthPercent: 25, reason: 'Industrial and residential trips overlap on the arterial.' },
]

export const FREMON_DISTRICTS: DistrictProfile[] = [
  district('district-north', 'North Transit Gap', 'Poor transit access', 0.84, 31_000, 'Add frequent transit corridor', 40, 72, [37.578, -122.018], 'fremon-north-transit-gap'),
  district('district-east', 'East Education Gap', 'School access shortage', 0.88, 18_000, 'Add a school near family housing', 37, 81, [37.548, -121.936], 'fremon-east-education-gap'),
  district('district-south', 'South Emergency Gap', 'No nearby clinic', 0.92, 22_000, 'Add clinic and response coverage', 34, 79, [37.504, -121.984], 'fremon-south-emergency-gap'),
  district('district-central', 'Central Green Space Gap', 'Limited walkable green space', 0.74, 16_000, 'Add green corridor', 46, 74, [37.556, -121.965], 'fremon-central-green-gap'),
  district('district-west', 'West Congestion Zone', 'Congestion risk', 0.82, 9_000, 'Add bike and transit alternatives', 39, 62, [37.546, -122.026], 'fremon-west-congestion-zone'),
  district('district-innovation', 'Innovation District', 'Job growth pressure', 0.58, 12_000, 'Connect jobs to housing by transit', 59, 78, [37.565, -121.946]),
  district('district-housing', 'New Housing Expansion Zone', 'Housing needs services', 0.8, 20_000, 'Add mixed-use services and utilities', 43, 77, [37.516, -121.942], 'fremon-housing-utility-gap'),
  district('district-industrial', 'Industrial Edge', 'Land-use compatibility', 0.52, 7_000, 'Avoid schools near industrial edge', 57, 64, [37.515, -122.026]),
]

export const FREMON_PLAN_BATTLE: PlanBattlePlan[] = [
  {
    id: 'balanced',
    label: 'Plan A: Balanced Growth',
    summary: 'Fixes the highest urgency gaps with clinics, schools, parks, and low-cost mobility hubs.',
    tradeoff: 'Moderate gains across all services, but transit and equity improve less dramatically.',
    cost: 70_000_000,
    budgetUsed: 70_000_000,
    populationServed: 58_000,
    gapsFixed: 4,
    isRecommended: false,
    metrics: FREMON_BALANCED_METRICS,
    featureIds: ['fremon-ai-south-clinic', 'fremon-ai-east-school', 'fremon-ai-central-green', 'fremon-ai-west-mobility-hub'],
  },
  {
    id: 'transit_first',
    label: 'Plan B: Transit First',
    summary: 'Prioritizes north and west mobility hubs plus a mixed-use node to reduce commute pressure.',
    tradeoff: 'Best commute and CO2 outcome, but leaves more emergency and education gaps open.',
    cost: 91_000_000,
    budgetUsed: 91_000_000,
    populationServed: 62_000,
    gapsFixed: 3,
    isRecommended: false,
    metrics: FREMON_TRANSIT_FIRST_METRICS,
    featureIds: ['fremon-ai-north-transit', 'fremon-ai-mixed-use', 'fremon-ai-west-mobility-hub', 'fremon-ai-central-green'],
  },
  {
    id: 'equity_first',
    label: 'Plan C: Equity First',
    summary: 'Targets the most severe underserved districts first, then connects them to mobility and green space.',
    tradeoff: 'Highest cost, but fixes the most severe access gaps while keeping commute and emissions improved.',
    cost: 137_000_000,
    budgetUsed: 137_000_000,
    populationServed: 74_000,
    gapsFixed: 5,
    isRecommended: true,
    reason: 'Equity First fixes the most severe service gaps while still improving commute, emergency access, green space, and education access.',
    metrics: FREMON_EQUITY_FIRST_METRICS,
    featureIds: FREMON_AI_RECOMMENDATIONS.map((item) => item.id),
  },
]

export const FREMON_TOP_RECOMMENDATION: AIRecommendation = {
  id: 'fremon-top-recommendation',
  title: 'Add South Emergency Gap Clinic',
  zoneName: 'South Emergency Gap',
  locationName: 'South Emergency Gap',
  infrastructureType: 'clinic',
  coordinates: [-121.984, 37.504],
  reason: 'South Emergency Gap lacks clinic coverage. Around 22,000 projected residents are outside the target emergency access radius.',
  expectedImpact: {
    emergencyAccess: 24,
    cityHealth: 21,
    averageResponseTime: -10,
    equityScore: 37,
    populationServed: 22000,
  },
  estimatedCost: 18_000_000,
  costEstimate: 18_000_000,
  confidence: 0.91,
  relatedGapIds: ['fremon-south-emergency-gap'],
  featuresToAdd: FREMON_AI_RECOMMENDATIONS,
  itemIds: ['fremon-ai-south-clinic'],
}

export const FREMON_PLACEMENT_SUGGESTIONS: PlacementSuggestion[] = [
  { id: 'suggest-clinic-south', rank: 1, title: 'South Fremon Growth Zone', category: 'clinic', coordinates: [-121.984, 37.504], expectedImpact: 'Emergency Access +18', costEstimate: 18_000_000, reason: 'Best clinic location: fills the highest-severity emergency access gap.', confidence: 0.87 },
  { id: 'suggest-clinic-housing', rank: 2, title: 'New Housing Expansion Edge', category: 'clinic', coordinates: [-121.942, 37.516], expectedImpact: 'Emergency Access +12', costEstimate: 16_000_000, reason: 'Serves new housing but is less central to the South Emergency Gap.', confidence: 0.78 },
  { id: 'suggest-clinic-central', rank: 3, title: 'Central-South Connector', category: 'clinic', coordinates: [-121.980, 37.526], expectedImpact: 'Emergency Access +8', costEstimate: 14_000_000, reason: 'Lower-cost option with smaller equity improvement.', confidence: 0.69 },
  { id: 'suggest-school-east', rank: 1, title: 'East Education Gap', category: 'school', coordinates: [-121.936, 37.548], expectedImpact: 'Education Access +21', costEstimate: 32_000_000, reason: 'Best school location: close to projected family housing growth.', confidence: 0.85 },
  { id: 'suggest-school-housing', rank: 2, title: 'Housing Expansion School Site', category: 'school', coordinates: [-121.942, 37.522], expectedImpact: 'Education Access +15', costEstimate: 30_000_000, reason: 'Good site for new families, but farther from current east gap.', confidence: 0.76 },
  { id: 'suggest-school-industrial-buffer', rank: 3, title: 'Industrial Buffer School Site', category: 'school', coordinates: [-122.020, 37.518], expectedImpact: 'Education Access +5', costEstimate: 28_000_000, reason: 'Lower confidence because it approaches the industrial edge.', confidence: 0.52 },
]

export const FREMON_TIMELINE: Record<TimelineYear, { population: number; pressure: number; label: string; phase: string; metrics: PlanningScores }> = {
  2026: { population: 420_000, pressure: 1, label: 'Baseline', phase: 'Phase 1: 2026 to 2028 · Add clinics and bus stops', metrics: FREMON_BASE_METRICS },
  2028: { population: 455_000, pressure: 1.08, label: 'Early growth', phase: 'Phase 1: 2026 to 2028 · Add clinics and bus stops', metrics: timelineMetrics(58, 51, 45, 75, 49, 44, 108, 45, 79, 55, 50) },
  2030: { population: 490_000, pressure: 1.16, label: 'Service stress', phase: 'Phase 2: 2028 to 2032 · Add schools and parks', metrics: timelineMetrics(55, 48, 41, 72, 45, 47, 116, 41, 85, 51, 46) },
  2032: { population: 525_000, pressure: 1.26, label: 'High pressure', phase: 'Phase 2: 2028 to 2032 · Add schools and parks', metrics: timelineMetrics(52, 45, 37, 69, 42, 50, 126, 37, 91, 47, 42) },
  2036: { population: 567_000, pressure: 1.38, label: 'Full buildout pressure', phase: 'Phase 3: 2032 to 2036 · Add major transit and housing zones', metrics: timelineMetrics(48, 41, 32, 64, 37, 54, 139, 32, 96, 42, 36) },
}

export const FREMON_BUDGET_AMOUNTS: Record<BudgetLevel, number> = {
  low: 25_000_000,
  medium: 75_000_000,
  high: 150_000_000,
}

export const FREMON_BUDGET_FEATURE_IDS: Record<BudgetLevel, string[]> = {
  low: ['fremon-ai-south-clinic', 'fremon-ai-west-mobility-hub'],
  medium: ['fremon-ai-south-clinic', 'fremon-ai-east-school', 'fremon-ai-central-green', 'fremon-ai-west-mobility-hub'],
  high: FREMON_AI_RECOMMENDATIONS.map((item) => item.id),
}

export function getFremonBudgetSummary(level: BudgetLevel): BudgetSummary {
  const amount = FREMON_BUDGET_AMOUNTS[level]
  const items = budgetRecommendations(level)
  const used = items.reduce((sum, item) => sum + item.costEstimate, 0)
  const populationServed = level === 'low' ? 31_000 : level === 'medium' ? 65_000 : 74_000
  const impactPoints = items.reduce((sum, item) => sum + Math.max(1, item.impactScore - 60), 0)
  return {
    level,
    amount,
    used,
    remaining: amount - used,
    costPerImpactPoint: Math.round((used / 1_000_000) / impactPoints * 10) / 10,
    populationServedPerMillion: Math.round(populationServed / Math.max(1, used / 1_000_000)),
    label: level === 'low' ? 'Low Budget: $25M' : level === 'medium' ? 'Medium Budget: $75M' : 'High Budget: $150M',
    guidance: level === 'low'
      ? 'Best impact per dollar: clinic plus west mobility hub.'
      : level === 'medium'
      ? 'Best impact per dollar while fixing emergency, school, green-space, and congestion gaps.'
      : 'Full capital plan: major transit, school, clinic, green corridor, housing, and mobility upgrades.',
  }
}

export function budgetRecommendations(level: BudgetLevel): InfrastructureItem[] {
  const ids = FREMON_BUDGET_FEATURE_IDS[level]
  return FREMON_AI_RECOMMENDATIONS.filter((item) => ids.includes(item.id))
}

export function markFremonImprovedZones(featureIds: string[]) {
  return FREMON_UNDERSERVED_ZONES.map((gap) => {
    const improved = gap.improvedBy.some((id) => featureIds.includes(id))
    return {
      ...gap,
      improved,
      isImproved: improved,
      radiusMeters: improved ? Math.round(gap.radiusMeters * 0.58) : gap.radiusMeters,
      severity: improved ? Math.max(0.22, gap.severity * 0.45) : gap.severity,
      afterScore: improved ? Math.min(100, gap.beforeScore + 36) : gap.beforeScore,
      reason: improved ? `${gap.reason} Improved by proposed infrastructure in the recommended plan.` : gap.reason,
    }
  })
}

function point(
  id: string,
  name: string,
  category: InfrastructureCategory,
  coordinates: GeoJSON.Position,
  reason: string,
  costEstimate: number,
  impactScore: number,
  confidence: number,
  status: InfrastructureItem['status'] = 'existing',
): InfrastructureItem {
  return { id, name, category, status, source: status === 'existing' ? 'simulation' : 'ai_recommended', coordinates, geometryType: 'Point', geometry: { type: 'Point', coordinates }, reason, costEstimate, impactScore, confidence, createdAt, updatedAt: createdAt }
}

function zone(id: string, name: string, gapType: UnderservedZone['gapType'], center: [number, number], radiusMeters: number, severity: number, reason: string, beforeScore: number, improvedBy: string[]): UnderservedZone {
  return { id, name, gapType, center, radiusMeters, severity, improvedBy, reason, beforeScore, improved: false, isImproved: false }
}

function district(id: string, name: string, mainIssue: string, severity: number, populationAffected: number, recommendedFix: string, beforeScore: number, afterScore: number, center: [number, number], relatedGapId?: string): DistrictProfile {
  return { id, name, mainIssue, severity, populationAffected, recommendedFix, beforeScore, afterScore, center, relatedGapId }
}

function timelineMetrics(
  cityHealth: number,
  emergencyAccess: number,
  transitCoverage: number,
  housingAccess: number,
  greenSpace: number,
  averageCommute: number,
  co2Estimate: number,
  equityScore: number,
  congestionRisk: number,
  educationAccess: number,
  fifteenMinuteCityScore: number,
): PlanningScores {
  return {
    cityHealth,
    emergencyAccess,
    transitCoverage,
    housingAccess,
    greenSpace,
    averageCommute,
    co2Estimate,
    equityScore,
    congestionRisk,
    congestion: congestionRisk,
    educationAccess,
    fifteenMinuteCityScore,
    walkability: Math.round((transitCoverage + greenSpace + fifteenMinuteCityScore) / 3),
    populationServed: 0,
    serviceGapCount: 6,
    totalEstimatedCost: 0,
  }
}
