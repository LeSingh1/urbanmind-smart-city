import type {
  AIRecommendation,
  GrowthPressureZone,
  InfrastructureCategory,
  InfrastructureItem,
  PlanningScores,
  ScenarioId,
  UnderservedZone,
} from '@/types/city.types'

export const DEFAULT_GROWTH_PERCENT = 30
export const DEFAULT_HORIZON_YEARS = 10

const createdAt = '2026-01-01T00:00:00.000Z'

export const FREMONT_EXISTING_INFRASTRUCTURE: InfrastructureItem[] = [
  point('fremont-washington-hospital', 'Washington Hospital', 'hospital', 'openstreetmap', [-121.9816, 37.5575], 'Existing acute care capacity near central Fremont.', 0, 83, 0.92),
  point('fremont-tri-city-clinic', 'Tri-City Clinic', 'clinic', 'demo_seed', [-121.9748, 37.5484], 'Primary care access near the BART and civic core.', 0, 68, 0.82),
  point('fremont-john-f-kennedy-high', 'John F. Kennedy High School', 'school', 'openstreetmap', [-122.0076, 37.5295], 'Existing high school serving central and western neighborhoods.', 0, 72, 0.88),
  point('fremont-mission-san-jose-high', 'Mission San Jose High School', 'school', 'openstreetmap', [-121.9294, 37.5331], 'Existing school serving the Mission San Jose area.', 0, 76, 0.9),
  point('fremont-central-park', 'Central Park / Lake Elizabeth', 'park', 'openstreetmap', [-121.9650, 37.5485], 'Major park and open-space anchor for central Fremont.', 0, 91, 0.95),
  point('fremont-quarry-lakes', 'Quarry Lakes Regional Recreation Area', 'park', 'openstreetmap', [-122.0005, 37.5768], 'Regional open space serving north and west Fremont.', 0, 84, 0.9),
  point('fremont-bart', 'Fremont BART Station', 'transit_stop', 'openstreetmap', [-121.9766, 37.5574], 'Regional rail access at central Fremont.', 0, 88, 0.94),
  point('fremont-warm-springs-bart', 'Warm Springs / South Fremont BART', 'transit_stop', 'openstreetmap', [-121.9390, 37.5030], 'Regional rail access near south Fremont employment growth.', 0, 86, 0.93),
  point('fremont-fire-1', 'Fremont Fire Station 1', 'fire_station', 'demo_seed', [-121.9746, 37.5513], 'Existing emergency response station near central Fremont.', 0, 74, 0.82),
  point('fremont-fire-6', 'Fremont Fire Station 6', 'fire_station', 'demo_seed', [-121.9402, 37.5145], 'Existing fire coverage in the south employment corridor.', 0, 70, 0.8),
  point('fremont-police', 'Fremont Police Department', 'police_station', 'openstreetmap', [-121.9829, 37.5522], 'Existing public safety anchor near civic center.', 0, 78, 0.9),
  point('fremont-warm-springs-housing', 'Warm Springs Housing Growth Area', 'housing_zone', 'demo_seed', [-121.937, 37.506], 'Seeded housing growth area used by the scenario comparison model.', 0, 65, 0.78),
]

export const FREMONT_UNDERSERVED_ZONES: UnderservedZone[] = [
  {
    id: 'southeast-health-gap',
    name: 'Southeast Fremont Emergency Access Gap',
    gapType: 'emergency_access',
    center: [37.4935, -121.9255],
    radiusMeters: 1500,
    severity: 0.9,
    improvedBy: ['ai-se-fremont-clinic', 'ai-warm-springs-fire'],
    reason: 'Projected housing and employment growth outpaces nearby clinic and response coverage.',
    beforeScore: 42,
  },
  {
    id: 'ardenwood-transit-gap',
    name: 'North Fremont Transit Gap',
    gapType: 'transit_access',
    center: [37.573, -122.037],
    radiusMeters: 1400,
    severity: 0.78,
    improvedBy: ['ai-ardenwood-transit-stop', 'ai-decoto-transit-line'],
    reason: 'Northwest residential areas remain beyond comfortable walking distance of frequent transit.',
    beforeScore: 48,
  },
  {
    id: 'warm-springs-school-gap',
    name: 'Warm Springs School Access Gap',
    gapType: 'school_access',
    center: [37.507, -121.936],
    radiusMeters: 1150,
    severity: 0.7,
    improvedBy: ['ai-warm-springs-school'],
    reason: 'Ten-year population growth adds school-age demand near Warm Springs housing and employment growth.',
    beforeScore: 52,
  },
  {
    id: 'central-green-gap',
    name: 'Central Fremont Green Space Gap',
    gapType: 'green_space',
    center: [37.538, -121.984],
    radiusMeters: 1050,
    severity: 0.64,
    improvedBy: ['ai-central-green-corridor'],
    reason: 'Higher density infill reduces per-capita walkable green-space access.',
    beforeScore: 56,
  },
  {
    id: 'irvington-congestion-risk',
    name: 'Irvington Congestion Risk',
    gapType: 'congestion',
    center: [37.521, -121.972],
    radiusMeters: 1350,
    severity: 0.82,
    improvedBy: ['ai-auto-mall-bus-priority'],
    reason: 'Growth pressure and limited east-west alternatives increase commute delay.',
    beforeScore: 39,
  },
  {
    id: 'south-housing-growth-pressure',
    name: 'South Fremont Housing Growth Pressure',
    gapType: 'housing_access',
    center: [37.5005, -121.945],
    radiusMeters: 1300,
    severity: 0.74,
    improvedBy: ['ai-mixed-use-warm-springs'],
    reason: 'Multiple service gaps overlap in a projected high-growth district.',
    beforeScore: 50,
  },
]

export const FREMONT_AI_RECOMMENDATIONS: InfrastructureItem[] = [
  point('ai-se-fremont-clinic', 'Southeast Fremont Medical Clinic', 'clinic', 'ai_recommended', [-121.927, 37.494], 'Fills the strongest projected health access gap under 30% growth.', 18_000_000, 92, 0.87, 'ai_recommended'),
  point('ai-warm-springs-school', 'Warm Springs Growth Area School', 'school', 'ai_recommended', [-121.936, 37.507], 'Adds school capacity near projected family housing growth.', 38_000_000, 84, 0.83, 'ai_recommended'),
  line('ai-central-green-corridor', 'Central Fremont Green Corridor', 'park', 'ai_recommended', [[-121.995, 37.541], [-121.984, 37.538], [-121.971, 37.532]], 'Improves walkable green-space access between central infill areas and existing parks.', 12_000_000, 76, 0.81, 'ai_recommended'),
  point('ai-ardenwood-transit-stop', 'North Fremont Frequent Transit Stop', 'transit_stop', 'ai_recommended', [-122.037, 37.573], 'Adds walkable transit coverage to north Fremont growth pockets.', 7_500_000, 74, 0.84, 'ai_recommended'),
  line('ai-decoto-transit-line', 'North Fremont to Warm Springs Bus Corridor', 'transit_line', 'ai_recommended', [[-122.037, 37.573], [-121.994, 37.552], [-121.939, 37.503]], 'Connects underserved north and south Fremont zones to BART anchors.', 42_000_000, 88, 0.8, 'ai_recommended'),
  point('ai-mixed-use-warm-springs', 'Warm Springs Mixed-Use Housing Zone', 'mixed_use', 'ai_recommended', [-121.943, 37.508], 'Adds housing near regional transit so growth does not increase car dependency as sharply.', 55_000_000, 82, 0.8, 'ai_recommended'),
  line('ai-auto-mall-bus-priority', 'Auto Mall Bus Priority Upgrade', 'transit_line', 'ai_recommended', [[-122.003, 37.508], [-121.975, 37.506], [-121.943, 37.503]], 'Targets projected east-west congestion with lower-cost transit priority.', 22_000_000, 72, 0.78, 'ai_recommended'),
]

export const FREMONT_TOP_RECOMMENDATION: AIRecommendation = {
  id: 'fremont-top-recommendation',
  title: 'Add a medical clinic in Southeast Fremont',
  zoneName: 'Southeast Fremont Health Access Gap',
  infrastructureType: 'clinic',
  reason: 'This zone has projected population growth, poor hospital access, and weaker emergency response coverage than the city baseline.',
  expectedImpact: {
    emergencyAccess: 18,
    cityHealth: 5,
    averageResponseTime: -2.4,
    equityScore: 7,
  },
  estimatedCost: 18_000_000,
  costEstimate: 18_000_000,
  confidence: 0.87,
  relatedGapIds: ['southeast-health-gap'],
  itemIds: ['ai-se-fremont-clinic'],
  featuresToAdd: FREMONT_AI_RECOMMENDATIONS,
}

export const FREMONT_GROWTH_PRESSURE_ZONES: GrowthPressureZone[] = [
  { id: 'growth-warm-springs', name: 'Warm Springs Growth Area', center: [37.507, -121.936], radiusMeters: 1450, pressure: 'high', projectedGrowthPercent: 38, reason: 'Regional transit and employment anchors increase projected housing demand.' },
  { id: 'growth-south-fremont', name: 'South Fremont Growth Area', center: [37.497, -121.948], radiusMeters: 1600, pressure: 'high', projectedGrowthPercent: 35, reason: 'Employment growth and available redevelopment parcels concentrate future demand.' },
  { id: 'growth-central-fremont', name: 'Central Fremont Infill', center: [37.542, -121.982], radiusMeters: 1350, pressure: 'medium', projectedGrowthPercent: 24, reason: 'Civic core infill adds moderate residential and service demand.' },
  { id: 'growth-north-fremont', name: 'North Fremont Residential Growth', center: [37.573, -122.037], radiusMeters: 1300, pressure: 'medium', projectedGrowthPercent: 22, reason: 'Northwest neighborhoods add medium growth but remain transit constrained.' },
]

export const SCENARIO_SCORE_WEIGHTS: Record<ScenarioId, Record<string, number>> = {
  balanced: { transit: 1, emergency: 1, housing: 1, green: 1, congestion: 1, equity: 1, co2: 1 },
  max_growth: { transit: 1.05, emergency: 0.95, housing: 1.35, green: 0.85, congestion: 1.2, equity: 0.95, co2: 0.9 },
  climate_resilient: { transit: 1.05, emergency: 1, housing: 0.9, green: 1.35, congestion: 1.05, equity: 1, co2: 1.35 },
  equity_focused: { transit: 1.1, emergency: 1.25, housing: 1.1, green: 1.1, congestion: 1, equity: 1.45, co2: 1 },
  transit_first: { transit: 1.45, emergency: 0.95, housing: 1, green: 0.95, congestion: 1.35, equity: 1.05, co2: 1.2 },
  emergency_ready: { transit: 0.95, emergency: 1.55, housing: 0.95, green: 0.9, congestion: 1.05, equity: 1.15, co2: 0.9 },
}

export function calculatePlanningScores(
  infrastructure: InfrastructureItem[],
  zones: UnderservedZone[],
  growthPercent: number,
  scenario: ScenarioId,
): PlanningScores {
  const active = infrastructure.filter((item) => item.status !== 'ai_recommended')
  const growthPressure = growthPercent / 30
  const improvedSeverity = zones.reduce((sum, zone) => sum + (zone.isImproved ? zone.severity : 0), 0)
  const remainingSeverity = zones.reduce((sum, zone) => sum + (zone.isImproved ? zone.severity * 0.35 : zone.severity), 0)
  const count = (category: InfrastructureCategory) => active.filter((item) => item.category === category).length
  const lineCount = active.filter((item) => item.category === 'transit_line').length
  const weights = SCENARIO_SCORE_WEIGHTS[scenario]

  const transitCoverage = clamp(58 + count('transit_stop') * 7 + count('transit_line') * 9 + improvedSeverity * 2.2 - growthPressure * 4)
  const emergencyAccess = clamp(61 + (count('hospital') + count('clinic')) * 6 + (count('fire_station') + count('police_station')) * 4 + improvedSeverity * 2 - growthPressure * 5)
  const housingAccess = clamp(69 + count('housing_zone') * 7 - growthPressure * 6 + improvedSeverity)
  const greenSpace = clamp(57 + count('park') * 5 + improvedSeverity * 1.4 - growthPressure * 3)
  const walkability = clamp(60 + count('park') * 2 + count('transit_stop') * 2 + count('school') * 1.5 - remainingSeverity * 1.2)
  const congestion = clamp(53 + growthPressure * 17 - lineCount * 4 - count('transit_stop') * 2 - improvedSeverity * 1.5)
  const equityScore = clamp(63 + improvedSeverity * 4 - remainingSeverity * 2.8)
  const educationAccess = clamp(62 + count('school') * 7 + improvedSeverity * 1.5 - growthPressure * 5)
  const averageCommute = Math.round((34 + growthPressure * 4 - count('transit_stop') * 0.8 - count('transit_line') * 2.4 - lineCount * 0.45) * 10) / 10
  const co2Estimate = Math.round(410 + growthPressure * 42 - count('transit_stop') * 7 - count('transit_line') * 18 - count('park') * 4)
  const cityHealth = clamp(
    ((transitCoverage * weights.transit) * 0.25) +
    ((emergencyAccess * weights.emergency) * 0.2) +
    ((housingAccess * weights.housing) * 0.2) +
    (walkability * 0.15) +
    ((greenSpace * weights.green) * 0.1) +
    (((100 - congestion) * weights.congestion) * 0.1),
  )

  return {
    cityHealth,
    transitCoverage,
    emergencyAccess,
    housingAccess,
    greenSpace,
    walkability,
    congestion,
    congestionRisk: congestion,
    averageCommute,
    co2Estimate,
    equityScore,
    educationAccess,
    populationServed: Math.round(230000 * (0.55 + improvedSeverity * 0.035)),
    serviceGapCount: zones.filter((zone) => !zone.isImproved && !zone.improved).length,
    totalEstimatedCost: active.reduce((sum, item) => sum + item.costEstimate, 0),
  }
}

export function markImprovedZones(zones: UnderservedZone[], appliedIds: string[]) {
  return zones.map((zone) => ({
    ...zone,
    isImproved: zone.improvedBy.some((id) => appliedIds.includes(id)),
    improved: zone.improvedBy.some((id) => appliedIds.includes(id)),
    afterScore: zone.improvedBy.some((id) => appliedIds.includes(id)) ? Math.min(100, zone.beforeScore + Math.round(zone.severity * 35)) : zone.beforeScore,
  }))
}

function point(
  id: string,
  name: string,
  category: InfrastructureCategory,
  source: InfrastructureItem['source'],
  coordinates: GeoJSON.Position,
  reason: string,
  costEstimate: number,
  impactScore: number,
  confidence: number,
  status: InfrastructureItem['status'] = 'existing',
): InfrastructureItem {
  return { id, name, category, status, source, coordinates, geometryType: 'Point', geometry: { type: 'Point', coordinates }, reason, costEstimate, impactScore, confidence, createdAt, updatedAt: createdAt }
}

function line(
  id: string,
  name: string,
  category: InfrastructureCategory,
  source: InfrastructureItem['source'],
  coordinates: GeoJSON.Position[],
  reason: string,
  costEstimate: number,
  impactScore: number,
  confidence: number,
  status: InfrastructureItem['status'] = 'existing',
): InfrastructureItem {
  return { id, name, category, status, source, coordinates, geometryType: 'LineString', geometry: { type: 'LineString', coordinates }, reason, costEstimate, impactScore, confidence, createdAt, updatedAt: createdAt }
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)))
}
