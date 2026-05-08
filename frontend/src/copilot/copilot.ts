/**
 * Layer 2 — AI Copilot (explanation only).
 *
 * The copilot does NOT invent placements, types, costs, or impact numbers.
 * Those all come from the deterministic engine (Layer 1). The copilot's job
 * is to convert structured engine output into prioritized alerts and a
 * validated recommendation bundle that UI components can render.
 *
 * Rationale strings have a template fallback so the system works without an
 * LLM. A real Anthropic call is a future hook (Phase 2.5) — when wired, the
 * call must be timeout-bounded and fall back to the template on any failure.
 */

import { COVERAGE_RADII, boundsBBox, pointInPolygon } from '@/engine/gapEngine'
import type {
  District,
  DistrictGapReport,
  InfrastructureType,
  LatLng,
  Severity,
  TerrainMask,
} from '@/engine/types'
import {
  buildValidationContext,
  validateRecommendation,
  type CandidateRecommendation,
  type ValidationResult,
} from '@/validation/validator'

// ──────────────────────────────────────────────────────────────────────────
// Public types
// ──────────────────────────────────────────────────────────────────────────

export interface PlanningAlert {
  id: string
  districtId: string
  districtName: string
  headline: string
  description: string
  severity: Severity
  populationAffected: number
}

export interface CopilotRecommendation {
  id: string
  sourceDistrictId: string
  sourceDistrictName: string
  infrastructureType: InfrastructureType
  /** Engine-derived deterministic placement, NOT LLM-generated. */
  proposedLocation: LatLng
  /** LLM-or-template-generated explanation. */
  rationale: string
  expectedImpact: { metric: string; before: number; after: number }[]
  estimatedCostUSD: number
  populationServed: number
  confidence: number
  validationStatus: ValidationResult['status']
  validationReasons: string[]
}

// ──────────────────────────────────────────────────────────────────────────
// Cost table — hardcoded, auditable, defensible
// ──────────────────────────────────────────────────────────────────────────

export const COST_TABLE: Record<InfrastructureType, number> = {
  clinic: 12_000_000,
  school: 35_000_000,
  park: 4_500_000,
  transit_hub: 28_000_000,
  emergency: 18_000_000,
  community_center: 6_500_000,
}

// Per-type baseline confidence (further adjusted by validator decay).
const BASELINE_CONFIDENCE: Record<InfrastructureType, number> = {
  clinic: 91,
  school: 85,
  park: 88,
  transit_hub: 82,
  emergency: 90,
  community_center: 78,
}

// Heuristic uplift table: how much we expect each metric to gain when adding `type`.
// Conservative numbers chosen so deltas stay under the validator's 60-point implausibility cap.
const METRIC_UPLIFT: Record<InfrastructureType, Partial<Record<keyof DistrictGapReport['scores'], number>>> = {
  clinic: { clinicAccess: 28, emergencyAccess: 22, fifteenMinuteCityScore: 8 },
  emergency: { emergencyAccess: 30, clinicAccess: 14, fifteenMinuteCityScore: 6 },
  school: { schoolAccess: 32, fifteenMinuteCityScore: 10 },
  park: { parkAccess: 30, fifteenMinuteCityScore: 8 },
  transit_hub: { transitAccess: 30, fifteenMinuteCityScore: 12 },
  community_center: { fifteenMinuteCityScore: 14, parkAccess: 8 },
}

// ──────────────────────────────────────────────────────────────────────────
// Alerts (deterministic templates, no LLM)
// ──────────────────────────────────────────────────────────────────────────

const SEVERITY_RANK: Record<Severity, number> = { critical: 4, high: 3, moderate: 2, low: 1 }

function alertHeadline(report: DistrictGapReport): string {
  const t = report.largestGap.type.replace('_', ' ')
  return `${report.districtName} ${t} gap`
}

function alertDescription(report: DistrictGapReport): string {
  const pop = report.largestGap.populationOutsideCoverage.toLocaleString()
  const t = report.largestGap.type.replace('_', ' ')
  return `${pop} residents outside ${t} coverage. 15-minute city score ${report.scores.fifteenMinuteCityScore}.`
}

export function generateAlerts(reports: DistrictGapReport[]): PlanningAlert[] {
  return reports
    .filter((r) => r.severity !== 'low')
    .slice(0, 5)
    .map((r) => ({
      id: `alert-${r.districtId}`,
      districtId: r.districtId,
      districtName: r.districtName,
      headline: alertHeadline(r),
      description: alertDescription(r),
      severity: r.severity,
      populationAffected: r.populationAffected,
    }))
}

// ──────────────────────────────────────────────────────────────────────────
// Engine-derived placement + impact
// ──────────────────────────────────────────────────────────────────────────

/**
 * Pick a deterministic placement inside the district that targets the
 * weakest dimension AND avoids invalid terrain.
 *
 * Strategy:
 *  1. Compute a "mirror" candidate opposite the existing-infra centroid (or
 *     just the district centroid if no same-type infra exists).
 *  2. If that candidate is on terrain or outside bounds, scan a deterministic
 *     grid of points inside the district bounds and pick the first one that
 *     lies inside bounds AND off the terrain mask.
 *  3. Always fall back to the district centroid; the validator's terrain
 *     rule will catch the residual case if even that fails.
 */
function isInsideRing(point: LatLng, district: District): boolean {
  return pointInPolygon(point, district.bounds)
}

function isPlacementValid(point: LatLng, district: District, terrain: TerrainMask): boolean {
  return isInsideRing(point, district) && !terrain.isInvalid(point)
}

function pickPlacementWithinDistrict(
  district: District,
  type: InfrastructureType,
  terrain: TerrainMask,
): LatLng {
  // Mirror candidate
  const sameType = district.existingInfrastructure.filter((i) => i.type === type)
  let preferred: LatLng = district.centroid
  if (sameType.length > 0) {
    let dLat = 0
    let dLng = 0
    for (const i of sameType) {
      dLat += i.location.lat - district.centroid.lat
      dLng += i.location.lng - district.centroid.lng
    }
    dLat /= sameType.length
    dLng /= sameType.length
    preferred = { lat: district.centroid.lat - dLat, lng: district.centroid.lng - dLng }
  }
  if (isPlacementValid(preferred, district, terrain)) return preferred

  // Half-step from preferred toward centroid — often all it takes to step off the bay edge.
  const halfway: LatLng = {
    lat: (preferred.lat + district.centroid.lat) / 2,
    lng: (preferred.lng + district.centroid.lng) / 2,
  }
  if (isPlacementValid(halfway, district, terrain)) return halfway

  // Centroid fallback
  if (isPlacementValid(district.centroid, district, terrain)) return district.centroid

  // Last resort: scan a 5x5 deterministic grid inside bounds and pick the first valid point.
  const [minLng, minLat, maxLng, maxLat] = boundsBBox(district.bounds)
  for (let i = 1; i <= 5; i++) {
    for (let j = 1; j <= 5; j++) {
      const candidate = {
        lat: minLat + ((maxLat - minLat) * i) / 6,
        lng: minLng + ((maxLng - minLng) * j) / 6,
      }
      if (isPlacementValid(candidate, district, terrain)) return candidate
    }
  }
  // No valid land found — return centroid; validator will reject this.
  return district.centroid
}

function simulateImpact(
  report: DistrictGapReport,
  type: InfrastructureType,
): CopilotRecommendation['expectedImpact'] {
  const uplift = METRIC_UPLIFT[type] ?? {}
  const out: CopilotRecommendation['expectedImpact'] = []
  for (const [metric, gain] of Object.entries(uplift)) {
    const before = (report.scores as Record<string, number>)[metric] ?? 0
    const after = Math.min(100, before + (gain ?? 0))
    if (after !== before) out.push({ metric, before, after })
  }
  return out
}

function populationServedEstimate(
  report: DistrictGapReport,
  type: InfrastructureType,
): number {
  // Use the population currently outside coverage of the targeted type as an upper bound.
  if (report.largestGap.type === type) return report.largestGap.populationOutsideCoverage
  // For substitutes (e.g. clinic for emergency), still report the gap pop (clinics serve emergency triage).
  if ((type === 'clinic' || type === 'emergency') && report.largestGap.type === 'clinic') {
    return report.largestGap.populationOutsideCoverage
  }
  return Math.round(report.populationAffected * 0.4)
}

// ──────────────────────────────────────────────────────────────────────────
// Rationale generator — template fallback (LLM hook is Phase 2.5)
// ──────────────────────────────────────────────────────────────────────────

function templateRationale(
  report: DistrictGapReport,
  type: InfrastructureType,
  populationServed: number,
): string {
  const typeLabel = type.replace('_', ' ')
  const popLabel = populationServed.toLocaleString()
  const fifteen = report.scores.fifteenMinuteCityScore
  return (
    `${report.districtName} shows the highest ${report.largestGap.type.replace('_', ' ')} severity, ` +
    `with ${popLabel} projected residents outside coverage. Adding ${typeLabel} closes that gap and ` +
    `raises the 15-minute city score from ${fifteen}.`
  )
}

// ──────────────────────────────────────────────────────────────────────────
// Recommendation pipeline
// ──────────────────────────────────────────────────────────────────────────

function buildRecommendation(
  report: DistrictGapReport,
  district: District,
  terrain: TerrainMask,
): CopilotRecommendation {
  // STEP 1 — engine picks type and location (terrain-aware)
  const type = report.recommendedInfrastructureType
  const location = pickPlacementWithinDistrict(district, type, terrain)
  // STEP 2 — engine simulates impact
  const expectedImpact = simulateImpact(report, type)
  // STEP 3 — engine pulls cost from table
  const cost = COST_TABLE[type]
  // STEP 4 — engine estimates population served
  const populationServed = populationServedEstimate(report, type)
  // STEP 5 — copilot writes the rationale ONLY (template fallback)
  const rationale = templateRationale(report, type, populationServed)
  // STEP 6 — assemble
  return {
    id: `rec-${report.districtId}`,
    sourceDistrictId: report.districtId,
    sourceDistrictName: report.districtName,
    infrastructureType: type,
    proposedLocation: location,
    rationale,
    expectedImpact,
    estimatedCostUSD: cost,
    populationServed,
    confidence: BASELINE_CONFIDENCE[type] ?? 75,
    // validation fields filled in below
    validationStatus: 'passed',
    validationReasons: [],
  }
}

export function generateRecommendations(
  reports: DistrictGapReport[],
  districts: District[],
  terrain: TerrainMask,
): CopilotRecommendation[] {
  const districtById = new Map(districts.map((d) => [d.id, d]))
  const ctx = buildValidationContext(reports, districts, terrain)
  const out: CopilotRecommendation[] = []
  for (const r of reports) {
    if (r.severity !== 'critical' && r.severity !== 'high') continue
    const district = districtById.get(r.districtId)
    if (!district) continue
    const draft = buildRecommendation(r, district, terrain)
    const candidate: CandidateRecommendation = {
      id: draft.id,
      sourceDistrictId: draft.sourceDistrictId,
      infrastructureType: draft.infrastructureType,
      proposedLocation: draft.proposedLocation,
      expectedImpact: draft.expectedImpact,
      estimatedCostUSD: draft.estimatedCostUSD,
      populationServed: draft.populationServed,
      confidence: draft.confidence,
    }
    const result = validateRecommendation(candidate, ctx)
    out.push({
      ...draft,
      confidence: result.adjustedConfidence,
      validationStatus: result.status,
      validationReasons: result.reasons,
    })
  }
  // Sort: passed first, then needs_review, then failed; within group by severity rank.
  return out.sort((a, b) => {
    const statusRank = (s: ValidationResult['status']) => (s === 'passed' ? 3 : s === 'needs_review' ? 2 : 1)
    const sa = statusRank(a.validationStatus)
    const sb = statusRank(b.validationStatus)
    if (sa !== sb) return sb - sa
    const ra = reports.find((r) => r.districtId === a.sourceDistrictId)?.severity ?? 'low'
    const rb = reports.find((r) => r.districtId === b.sourceDistrictId)?.severity ?? 'low'
    return SEVERITY_RANK[rb] - SEVERITY_RANK[ra]
  })
}

/** Picked from the top of the validated list — the recommendation we surface as "the answer". */
export function pickTopRecommendation(
  recommendations: CopilotRecommendation[],
): CopilotRecommendation | null {
  return recommendations.find((r) => r.validationStatus === 'passed') ?? recommendations[0] ?? null
}

// Re-export so callers can build pipelines without reaching into the engine module.
export { COVERAGE_RADII }
