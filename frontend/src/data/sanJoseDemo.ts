/**
 * San Jose demo seed — Fremont-aligned template shifted into San Jose bounds.
 */
import type {
  AIRecommendation,
  GrowthPressureZone,
  InfrastructureItem,
  PlanningScores,
  UnderservedZone,
} from '@/types/city.types'
import {
  FREMONT_AI_RECOMMENDATIONS,
  FREMONT_EXISTING_INFRASTRUCTURE,
  FREMONT_GROWTH_PRESSURE_ZONES,
  FREMONT_TOP_RECOMMENDATION,
  FREMONT_UNDERSERVED_ZONES,
} from '@/data/fremontDemo'

const FREMONT_CENTER = { lat: 37.5485, lng: -121.9886 }
export const SAN_JOSE_CENTER_COORDS = { lat: 37.3382, lng: -121.8863 }

const shift = {
  lat: SAN_JOSE_CENTER_COORDS.lat - FREMONT_CENTER.lat,
  lng: SAN_JOSE_CENTER_COORDS.lng - FREMONT_CENTER.lng,
}

export function shiftPositionSanJose(position: GeoJSON.Position): GeoJSON.Position {
  return [position[0] + shift.lng, position[1] + shift.lat]
}

export function shiftItemCoordinatesSanJose(item: InfrastructureItem): InfrastructureItem {
  const coordinates =
    item.geometryType === 'Point'
      ? shiftPositionSanJose(item.coordinates as GeoJSON.Position)
      : (item.coordinates as GeoJSON.Position[]).map((p) => shiftPositionSanJose(p))
  return {
    ...item,
    coordinates,
    geometry:
      item.geometryType === 'Point'
        ? { type: 'Point', coordinates: coordinates as GeoJSON.Position }
        : { type: 'LineString', coordinates: coordinates as GeoJSON.Position[] },
  }
}

export const SAN_JOSE_EXISTING_INFRASTRUCTURE: InfrastructureItem[] = FREMONT_EXISTING_INFRASTRUCTURE.map((item) => ({
  ...shiftItemCoordinatesSanJose(item),
  id: item.id.replace(/^fremont/, 'san_jose'),
  name: item.name.replace(/Fremont/g, 'San Jose').replace(/Warm Springs/g, 'East San José'),
}))

/** Fremont demo AI id → San José id */
export const SJ_AI_ID_MAP: Record<string, string> = {
  'ai-se-fremont-clinic': 'san-jose-ai-clinic',
  'ai-warm-springs-school': 'san-jose-ai-school',
  'ai-central-green-corridor': 'san-jose-ai-green-corridor',
  'ai-ardenwood-transit-stop': 'san-jose-ai-transit-stop',
  'ai-decoto-transit-line': 'san-jose-ai-bus-corridor',
  'ai-mixed-use-warm-springs': 'san-jose-ai-mixed-use',
  'ai-auto-mall-bus-priority': 'san-jose-ai-bus-priority',
}

export const SAN_JOSE_AI_RECOMMENDATIONS: InfrastructureItem[] = FREMONT_AI_RECOMMENDATIONS.map((item) => {
  const shifted = shiftItemCoordinatesSanJose(item)
  const newId = SJ_AI_ID_MAP[item.id] ?? `san-jose-${item.id}`
  return {
    ...shifted,
    id: newId,
    name: shifted.name.replace(/Southeast Fremont/g, 'East San José').replace(/Fremont/g, 'San Jose').replace(/Warm Springs/g, 'Evergreen / South corridors'),
  }
})

export const SAN_JOSE_UNDERSERVED_ZONES: UnderservedZone[] = FREMONT_UNDERSERVED_ZONES.map((zone) => ({
  ...zone,
  id: `san-jose-${zone.id}`,
  name: zone.name
    .replace(/Southeast Fremont/g, 'East San José Emergency Access')
    .replace(/North Fremont/g, 'North San José')
    .replace(/Warm Springs/g, 'Evergreen School Access')
    .replace(/Central Fremont/g, 'Midtown San José Green Space')
    .replace(/Irvington Congestion Risk/g, 'Willow Glen / Alameda corridor congestion pressure')
    .replace(/South Fremont Housing Growth Pressure/g, 'South San José housing growth overlap'),
  center: [zone.center[0] + shift.lat, zone.center[1] + shift.lng],
  improvedBy: zone.improvedBy.map((bid) => SJ_AI_ID_MAP[bid] ?? bid).filter(Boolean),
  isImproved: false,
  improved: false,
}))

export const SAN_JOSE_GROWTH_PRESSURE_ZONES: GrowthPressureZone[] = FREMONT_GROWTH_PRESSURE_ZONES.map((zone) => ({
  ...zone,
  id: `san-jose-${zone.id}`,
  name: zone.name.replace(/Fremont/g, 'San Jose').replace(/Warm Springs/g, 'Evergreen corridor'),
  center: [zone.center[0] + shift.lat, zone.center[1] + shift.lng],
}))

const top = FREMONT_TOP_RECOMMENDATION
export const SAN_JOSE_TOP_RECOMMENDATION: AIRecommendation = {
  ...top,
  id: 'san-jose-top-recommendation',
  title: 'Add a medical clinic in East San José',
  zoneName: 'East San José emergency access gap',
  reason:
    'East San José shows overlapping projected housing growth with weaker acute-care reach than the city baseline; positioning a clinic here addresses the strongest emergency-access gap.',
  relatedGapIds: SAN_JOSE_UNDERSERVED_ZONES[0] ? [SAN_JOSE_UNDERSERVED_ZONES[0].id] : [],
  itemIds: ['san-jose-ai-clinic'],
}

export const SAN_JOSE_BASE_METRICS: PlanningScores = {
  cityHealth: 64,
  transitCoverage: 56,
  emergencyAccess: 58,
  housingAccess: 62,
  greenSpace: 54,
  fifteenMinuteCityScore: 57,
  walkability: 59,
  congestion: 61,
  congestionRisk: 66,
  averageCommute: 38,
  co2Estimate: 118,
  equityScore: 55,
  educationAccess: 60,
  populationServed: 120_000,
  serviceGapCount: SAN_JOSE_UNDERSERVED_ZONES.length,
  totalEstimatedCost: SAN_JOSE_EXISTING_INFRASTRUCTURE.reduce((s, i) => s + i.costEstimate, 0),
}
