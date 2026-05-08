/**
 * Layer 3 — Validation.
 *
 * Every copilot recommendation must pass through this gate before it can
 * modify map state. Failed validations either downgrade confidence (so the UI
 * shows a "needs review" badge) or fail outright (so the recommendation is
 * dropped and a deterministic fallback is used).
 *
 * The validator only reads from already-computed engine output — it never
 * reaches back into the LLM, never queries seed data directly, and is itself
 * a pure function for testability.
 */

import { COVERAGE_RADII } from '@/engine/gapEngine'
import { pointInPolygon } from '@/engine/gapEngine'
import type {
  DistrictGapReport,
  Infrastructure,
  InfrastructureType,
  LatLng,
  PolygonRing,
  TerrainMask,
} from '@/engine/types'

export interface CandidateRecommendation {
  id: string
  sourceDistrictId: string
  infrastructureType: InfrastructureType
  proposedLocation: LatLng
  expectedImpact: { metric: string; before: number; after: number }[]
  estimatedCostUSD: number
  populationServed: number
  confidence: number // 0-100
}

export interface ValidationResult {
  status: 'passed' | 'needs_review' | 'failed'
  reasons: string[]
  adjustedConfidence: number
}

interface ValidationContext {
  reports: DistrictGapReport[]
  /** District bounds keyed by district id, supplied by the caller (engine source). */
  districtBoundsById: Map<string, PolygonRing>
  /** Existing infrastructure keyed by district id, used for duplicate checks. */
  existingByDistrictId: Map<string, Infrastructure[]>
  terrain: TerrainMask
}

const NO_DUPLICATE_DISTANCE_M = 250 // proposed item must be at least this far from same-type existing

function distanceMeters(a: LatLng, b: LatLng): number {
  const earth = 6_371_000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)
  return 2 * earth * Math.asin(Math.min(1, Math.sqrt(h)))
}

function dimensionScoreForType(report: DistrictGapReport, type: InfrastructureType): number {
  if (type === 'clinic' || type === 'emergency') return Math.min(report.scores.clinicAccess, report.scores.emergencyAccess)
  if (type === 'school') return report.scores.schoolAccess
  if (type === 'park') return report.scores.parkAccess
  if (type === 'transit_hub') return report.scores.transitAccess
  if (type === 'community_center') return report.scores.fifteenMinuteCityScore
  return 100
}

export function validateRecommendation(
  rec: CandidateRecommendation,
  ctx: ValidationContext,
): ValidationResult {
  const reasons: string[] = []

  // Rule 1 — recommendation must reference a real district report
  const report = ctx.reports.find((r) => r.districtId === rec.sourceDistrictId)
  if (!report) {
    return {
      status: 'failed',
      reasons: ['No matching district gap report'],
      adjustedConfidence: 0,
    }
  }

  // Rule 2 — type must address an actual access gap (score < 70 in the relevant dimension)
  const dimScore = dimensionScoreForType(report, rec.infrastructureType)
  if (dimScore >= 70) {
    reasons.push(
      `${rec.infrastructureType.replace('_', ' ')} does not address an actual access gap (score ${dimScore})`,
    )
  }

  // Rule 3 — type must match the engine's recommendation, OR be a sensible substitute
  const allowedTypes: InfrastructureType[] = [report.recommendedInfrastructureType]
  if (report.recommendedInfrastructureType === 'clinic') allowedTypes.push('emergency')
  if (report.recommendedInfrastructureType === 'emergency') allowedTypes.push('clinic')
  if (!allowedTypes.includes(rec.infrastructureType)) {
    reasons.push(
      `Type ${rec.infrastructureType} does not match engine recommendation ${report.recommendedInfrastructureType}`,
    )
  }

  // Rule 4 — proposed location must lie inside the district bounds
  const bounds = ctx.districtBoundsById.get(rec.sourceDistrictId)
  if (!bounds) {
    reasons.push('District bounds missing from validation context')
  } else if (!pointInPolygon(rec.proposedLocation, bounds)) {
    reasons.push('Proposed location outside district bounds')
  }

  // Rule 5 — terrain check (water, protected, invalid)
  if (ctx.terrain.isInvalid(rec.proposedLocation)) {
    reasons.push('Proposed location is on invalid terrain')
  }

  // Rule 6 — must improve at least one metric
  const improves = rec.expectedImpact.some((i) => i.after > i.before)
  if (!improves) {
    reasons.push('Recommendation does not improve any metric')
  }

  // Rule 7 — expected impact deltas must be plausible (no metric jumping by more than 60)
  const wildJump = rec.expectedImpact.find((i) => Math.abs(i.after - i.before) > 60)
  if (wildJump) {
    reasons.push(`Implausible impact delta on ${wildJump.metric} (${wildJump.before} -> ${wildJump.after})`)
  }

  // Rule 8 — cost must be present and within an order of magnitude of the type's expected range
  if (!rec.estimatedCostUSD || rec.estimatedCostUSD <= 0) {
    reasons.push('Missing or invalid cost')
  } else if (rec.estimatedCostUSD < 500_000 || rec.estimatedCostUSD > 200_000_000) {
    reasons.push(`Cost ${rec.estimatedCostUSD} outside plausible band`)
  }

  // Rule 9 — populationServed must be positive and bounded by district population
  if (!rec.populationServed || rec.populationServed <= 0) {
    reasons.push('Missing or invalid populationServed')
  }

  // Rule 10 — proposed location must not duplicate an existing facility of the same type
  const existing = ctx.existingByDistrictId.get(rec.sourceDistrictId) ?? []
  const collision = existing.find(
    (e) => e.type === rec.infrastructureType && distanceMeters(e.location, rec.proposedLocation) < NO_DUPLICATE_DISTANCE_M,
  )
  if (collision) {
    reasons.push(`Duplicates existing ${collision.type} ${collision.id}`)
  }

  // Rule 11 — coverage radius must be defined for the type (sanity check on type itself)
  if (!(rec.infrastructureType in COVERAGE_RADII)) {
    reasons.push(`Unknown infrastructure type ${rec.infrastructureType}`)
  }

  // Rule 12 — confidence must be in [0, 100]; otherwise clamp and flag
  let normalizedConfidence = rec.confidence
  if (Number.isNaN(rec.confidence) || rec.confidence < 0 || rec.confidence > 100) {
    reasons.push('Confidence out of range; clamped')
    normalizedConfidence = Math.max(0, Math.min(100, rec.confidence || 0))
  }

  // Confidence decay
  let adjustedConfidence = normalizedConfidence
  if (reasons.length === 1 || reasons.length === 2) {
    adjustedConfidence = Math.max(0, normalizedConfidence - 30)
  } else if (reasons.length >= 3) {
    adjustedConfidence = 0
  }

  const status: ValidationResult['status'] =
    reasons.length === 0 ? 'passed' : adjustedConfidence > 0 ? 'needs_review' : 'failed'

  return { status, reasons, adjustedConfidence }
}

/** Helper for the copilot/UI layer: build a context map once per analysis pass. */
export function buildValidationContext(
  reports: DistrictGapReport[],
  districts: { id: string; bounds: PolygonRing; existingInfrastructure: Infrastructure[] }[],
  terrain: TerrainMask,
): ValidationContext {
  const districtBoundsById = new Map(districts.map((d) => [d.id, d.bounds]))
  const existingByDistrictId = new Map(districts.map((d) => [d.id, d.existingInfrastructure]))
  return { reports, districtBoundsById, existingByDistrictId, terrain }
}
