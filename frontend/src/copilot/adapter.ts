/**
 * Adapter — bridges the new three-layer architecture (engine + copilot +
 * validator) into the legacy simulationStore types.
 *
 * The store still consumes `InfrastructureItem[]` and `UnderservedZone[]`.
 * This module converts engine + copilot output into those shapes without
 * touching either side's contracts. New code should depend on the engine
 * types directly; this adapter is the cutover bridge.
 */

import type {
  AIRecommendation,
  InfrastructureCategory,
  InfrastructureItem,
  UnderservedZone,
  UnderservedZoneType,
} from '@/types/city.types'
import { COVERAGE_RADII } from '@/engine/gapEngine'
import type { District, DistrictGapReport, InfrastructureType, LatLng } from '@/engine/types'
import type { CopilotRecommendation } from './copilot'

const TYPE_TO_CATEGORY: Record<InfrastructureType, InfrastructureCategory> = {
  clinic: 'clinic',
  school: 'school',
  park: 'park',
  transit_hub: 'transit_stop',
  emergency: 'fire_station',
  community_center: 'community_center',
}

const TYPE_TO_GAP: Record<InfrastructureType, UnderservedZoneType> = {
  clinic: 'hospital_access',
  emergency: 'emergency_access',
  school: 'school_access',
  park: 'park_access',
  transit_hub: 'transit_access',
  community_center: 'equity',
}

const NOW_ISO = '2026-01-01T00:00:00.000Z'

function toGeoCoordinates(p: LatLng): GeoJSON.Position {
  return [p.lng, p.lat]
}

export function toInfrastructureItem(rec: CopilotRecommendation): InfrastructureItem {
  const category = TYPE_TO_CATEGORY[rec.infrastructureType]
  const populationServed = rec.populationServed
  return {
    id: rec.id,
    name: `${rec.sourceDistrictName} ${humanizeType(rec.infrastructureType)}`,
    category,
    status: 'ai_recommended',
    source: 'ai_recommended',
    coordinates: toGeoCoordinates(rec.proposedLocation),
    geometryType: 'Point',
    reason: rec.rationale,
    costEstimate: rec.estimatedCostUSD,
    impactScore: clampToPercent(estimateImpactScore(rec)),
    confidence: clampUnit(rec.confidence / 100),
    createdAt: NOW_ISO,
    expectedImpact: { populationServed },
    // populationServed is on AIRecommendation type but kept here for downstream consumers
  } as InfrastructureItem & { expectedImpact: { populationServed: number } }
}

function humanizeType(type: InfrastructureType): string {
  switch (type) {
    case 'clinic': return 'Clinic'
    case 'school': return 'School'
    case 'park': return 'Park'
    case 'transit_hub': return 'Transit Hub'
    case 'emergency': return 'Emergency Station'
    case 'community_center': return 'Community Center'
  }
}

function estimateImpactScore(rec: CopilotRecommendation): number {
  // Use the largest after-before delta as a 0-100 impact proxy.
  if (rec.expectedImpact.length === 0) return 60
  return Math.max(...rec.expectedImpact.map((i) => Math.round(i.after - i.before)))
}

function clampUnit(n: number): number {
  return Math.max(0, Math.min(1, n))
}

function clampToPercent(n: number): number {
  return Math.max(0, Math.min(100, n))
}

export function toUnderservedZones(reports: DistrictGapReport[], districts: District[]): UnderservedZone[] {
  const centroidById = new Map(districts.map((d) => [d.id, d.centroid]))
  return reports
    .filter((r) => r.severity === 'critical' || r.severity === 'high')
    .map((r) => {
      const gap = r.largestGap
      const centroid = centroidById.get(r.districtId)
      if (!centroid) throw new Error(`adapter: missing centroid for ${r.districtId}`)
      const radius = (COVERAGE_RADII[gap.type] ?? 1500) * 1.4
      return {
        id: `zone-${r.districtId}`,
        name: `${r.districtName} ${humanizeType(gap.type)} Gap`,
        gapType: TYPE_TO_GAP[gap.type] ?? 'equity',
        center: [centroid.lat, centroid.lng] as [number, number],
        radiusMeters: Math.max(800, Math.round(radius)),
        severity: severityToNumber(r.severity),
        improvedBy: [`rec-${r.districtId}`],
        improved: false,
        isImproved: false,
        reason: r.deterministicReasoning,
        beforeScore: r.scores.fifteenMinuteCityScore,
        afterScore: clampToPercent(r.scores.fifteenMinuteCityScore + 18),
      }
    })
}

function severityToNumber(s: DistrictGapReport['severity']): number {
  return s === 'critical' ? 0.9 : s === 'high' ? 0.7 : s === 'moderate' ? 0.5 : 0.3
}

export function toTopAIRecommendation(top: CopilotRecommendation): AIRecommendation {
  const populationServed = top.populationServed
  const cityHealthDelta =
    top.expectedImpact.find((i) => i.metric === 'cityHealth')?.after ??
    top.expectedImpact[0]?.after ?? 0
  const cityHealthBefore =
    top.expectedImpact.find((i) => i.metric === 'cityHealth')?.before ??
    top.expectedImpact[0]?.before ?? 0
  return {
    id: `${top.sourceDistrictId}-top-recommendation`,
    title: `Add ${humanizeType(top.infrastructureType)} in ${top.sourceDistrictName}`,
    zoneName: `${top.sourceDistrictName} ${humanizeType(top.infrastructureType)} Gap`,
    locationName: top.sourceDistrictName,
    infrastructureType: TYPE_TO_CATEGORY[top.infrastructureType],
    coordinates: toGeoCoordinates(top.proposedLocation),
    reason: top.rationale,
    expectedImpact: top.expectedImpact.reduce(
      (acc, i) => ({ ...acc, [i.metric]: i.after - i.before, populationServed }),
      {} as Record<string, number>,
    ),
    estimatedCost: top.estimatedCostUSD,
    costEstimate: top.estimatedCostUSD,
    confidence: clampUnit(top.confidence / 100),
    relatedGapIds: [`zone-${top.sourceDistrictId}`],
    itemIds: [top.id],
    // Keep cityHealth delta accessible for impact mocks if any consumer uses it.
    // (silenced: not part of strict type but kept for legacy access)
  } as AIRecommendation & { _cityHealthDelta?: number; _cityHealthBefore?: number; _cityHealthAfter?: number }
}
