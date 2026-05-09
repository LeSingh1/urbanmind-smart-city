/**
 * Layer 1 — Deterministic Infrastructure Gap Engine.
 *
 * Pure functions only. Same district input -> same report output, every time.
 * No LLM calls live here, and no UI imports either — this module must remain
 * runnable from a script for determinism tests.
 *
 * Coverage assumption: we do not have a routing engine in the demo, so we
 * approximate isochrone coverage with straight-line haversine distance and a
 * 1.4x detour factor when comparing against drive-time radii. Walking-radius
 * dimensions (parks, transit, schools) use the unscaled distance.
 */

import type {
  District,
  DistrictGapReport,
  Infrastructure,
  InfrastructureType,
  LargestGap,
  LatLng,
  PolygonRing,
  ServiceScores,
  Severity,
} from './types'

const EARTH_RADIUS_METERS = 6_371_000
const DETOUR_FACTOR = 1.4
const POPULATION_SAMPLE_GRID = 8 // 8x8 = 64 points across each district

const RADII: Record<InfrastructureType, number> = {
  clinic: 1500,
  school: 1200,
  park: 800,
  transit_hub: 500,
  emergency: 2400, // ~4 minutes at 36 km/h, drive-time approximation
  community_center: 1200,
}

/** Walking-radius types use raw distance; drive-radius types apply detour factor. */
const DRIVE_TYPES: ReadonlySet<InfrastructureType> = new Set(['emergency', 'clinic'])

const SCORING_WEIGHTS = {
  clinicAccess: 0.2,
  schoolAccess: 0.2,
  parkAccess: 0.2,
  transitAccess: 0.2,
  emergencyAccess: 0.2,
}

// ──────────────────────────────────────────────────────────────────────────
// Geometry helpers
// ──────────────────────────────────────────────────────────────────────────

function toRadians(deg: number) {
  return (deg * Math.PI) / 180
}

export function haversineMeters(a: LatLng, b: LatLng): number {
  const dLat = toRadians(b.lat - a.lat)
  const dLng = toRadians(b.lng - a.lng)
  const lat1 = toRadians(a.lat)
  const lat2 = toRadians(b.lat)
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(h)))
}

function effectiveDistance(type: InfrastructureType, a: LatLng, b: LatLng): number {
  const raw = haversineMeters(a, b)
  return DRIVE_TYPES.has(type) ? raw * DETOUR_FACTOR : raw
}

/** Bounding box of a polygon ring as [minLng, minLat, maxLng, maxLat]. */
export function boundsBBox(bounds: PolygonRing): [number, number, number, number] {
  let minLng = Infinity
  let maxLng = -Infinity
  let minLat = Infinity
  let maxLat = -Infinity
  for (const [lng, lat] of bounds.coordinates) {
    if (lng < minLng) minLng = lng
    if (lng > maxLng) maxLng = lng
    if (lat < minLat) minLat = lat
    if (lat > maxLat) maxLat = lat
  }
  return [minLng, minLat, maxLng, maxLat]
}

/** Standard ray-casting point-in-polygon. */
export function pointInPolygon(point: LatLng, ring: PolygonRing): boolean {
  const x = point.lng
  const y = point.lat
  const pts = ring.coordinates
  let inside = false
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i]
    const [xj, yj] = pts[j]
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi || 1e-12) + xi
    if (intersect) inside = !inside
  }
  return inside
}

/**
 * Generate a deterministic grid of population sample points inside the district.
 * Each point is treated as carrying an equal share of the district's population.
 */
function samplePoints(district: District): LatLng[] {
  const [minLng, minLat, maxLng, maxLat] = boundsBBox(district.bounds)
  const points: LatLng[] = []
  const step = 1 / (POPULATION_SAMPLE_GRID + 1)
  for (let i = 1; i <= POPULATION_SAMPLE_GRID; i++) {
    for (let j = 1; j <= POPULATION_SAMPLE_GRID; j++) {
      const lng = minLng + (maxLng - minLng) * (i * step)
      const lat = minLat + (maxLat - minLat) * (j * step)
      const candidate = { lat, lng }
      if (pointInPolygon(candidate, district.bounds)) points.push(candidate)
    }
  }
  // Always include centroid as a fallback so a degenerate polygon never produces zero samples.
  if (points.length === 0) points.push(district.centroid)
  return points
}

// ──────────────────────────────────────────────────────────────────────────
// Coverage scoring
// ──────────────────────────────────────────────────────────────────────────

function infraOfType(infra: Infrastructure[], type: InfrastructureType): Infrastructure[] {
  return infra.filter((i) => i.type === type)
}

/** Returns fraction in [0, 1] of sample points covered by at least one of `infra`. */
function coverageFraction(samples: LatLng[], infra: Infrastructure[], type: InfrastructureType): number {
  if (samples.length === 0) return 0
  if (infra.length === 0) return 0
  let covered = 0
  for (const s of samples) {
    let inRange = false
    for (const i of infra) {
      const radius = i.coverageRadiusMeters || RADII[type]
      if (effectiveDistance(type, s, i.location) <= radius) {
        inRange = true
        break
      }
    }
    if (inRange) covered += 1
  }
  return covered / samples.length
}

function scoreForType(samples: LatLng[], infra: Infrastructure[], type: InfrastructureType): number {
  const f = coverageFraction(samples, infra, type)
  return Math.round(f * 100)
}

export function compute15MinScore(scores: Omit<ServiceScores, 'fifteenMinuteCityScore'>): number {
  const total =
    scores.clinicAccess * SCORING_WEIGHTS.clinicAccess +
    scores.schoolAccess * SCORING_WEIGHTS.schoolAccess +
    scores.parkAccess * SCORING_WEIGHTS.parkAccess +
    scores.transitAccess * SCORING_WEIGHTS.transitAccess +
    scores.emergencyAccess * SCORING_WEIGHTS.emergencyAccess
  return Math.round(total)
}

export function computeServiceScores(district: District): ServiceScores {
  const samples = samplePoints(district)
  const clinic = scoreForType(samples, infraOfType(district.existingInfrastructure, 'clinic'), 'clinic')
  const school = scoreForType(samples, infraOfType(district.existingInfrastructure, 'school'), 'school')
  const park = scoreForType(samples, infraOfType(district.existingInfrastructure, 'park'), 'park')
  const transit = scoreForType(samples, infraOfType(district.existingInfrastructure, 'transit_hub'), 'transit_hub')
  // Emergency coverage counts both dedicated emergency facilities and clinics (triage role).
  const emergencyInfra = [
    ...infraOfType(district.existingInfrastructure, 'emergency'),
    ...infraOfType(district.existingInfrastructure, 'clinic'),
  ]
  const emergency = scoreForType(samples, emergencyInfra, 'emergency')
  const partial = {
    clinicAccess: clinic,
    schoolAccess: school,
    parkAccess: park,
    transitAccess: transit,
    emergencyAccess: emergency,
  }
  return {
    ...partial,
    fifteenMinuteCityScore: compute15MinScore(partial),
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Severity, recommendation, largest gap
// ──────────────────────────────────────────────────────────────────────────

export function classifySeverity(scores: ServiceScores): Severity {
  const dimensional = [
    scores.clinicAccess,
    scores.schoolAccess,
    scores.parkAccess,
    scores.transitAccess,
    scores.emergencyAccess,
  ]
  const min = Math.min(...dimensional)
  if (min < 40) return 'critical'
  if (min < 60) return 'high'
  if (min < 75) return 'moderate'
  return 'low'
}

const SEVERITY_RANK: Record<Severity, number> = { critical: 4, high: 3, moderate: 2, low: 1 }

interface DimensionState {
  dim: keyof Omit<ServiceScores, 'fifteenMinuteCityScore'>
  score: number
  populationOutside: number
  type: InfrastructureType
}

function dimensionStates(district: District, scores: ServiceScores): DimensionState[] {
  const samples = samplePoints(district)
  const sharePerSample = district.population / Math.max(1, samples.length)
  const measure = (
    type: InfrastructureType,
    dim: DimensionState['dim'],
    score: number,
    extra: Infrastructure[] = [],
  ): DimensionState => {
    const infra = [...infraOfType(district.existingInfrastructure, type), ...extra]
    const covered = coverageFraction(samples, infra, type)
    return {
      dim,
      score,
      populationOutside: Math.round(sharePerSample * samples.length * (1 - covered)),
      type,
    }
  }
  const clinicInfra = infraOfType(district.existingInfrastructure, 'clinic')
  return [
    measure('clinic', 'clinicAccess', scores.clinicAccess),
    measure('school', 'schoolAccess', scores.schoolAccess),
    measure('park', 'parkAccess', scores.parkAccess),
    measure('transit_hub', 'transitAccess', scores.transitAccess),
    measure('emergency', 'emergencyAccess', scores.emergencyAccess, clinicInfra),
  ]
}

function pickLargestGap(states: DimensionState[]): DimensionState {
  return [...states].sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score // lower score first
    return b.populationOutside - a.populationOutside // tiebreak: more residents
  })[0]
}

export function recommendInfrastructureType(
  district: District,
  scores: ServiceScores,
): InfrastructureType {
  const states = dimensionStates(district, scores)
  const worst = pickLargestGap(states)
  // Map the worst dimension to a buildable type.
  if (worst.dim === 'emergencyAccess') return 'clinic' // clinics also handle emergency triage
  if (worst.dim === 'schoolAccess') return 'school'
  if (worst.dim === 'parkAccess') return 'park'
  if (worst.dim === 'transitAccess') return 'transit_hub'
  if (worst.dim === 'clinicAccess') return 'clinic'
  // Fallback: 15-min compliance below 60 -> community center
  if (scores.fifteenMinuteCityScore < 60) return 'community_center'
  return 'community_center'
}

function buildLargestGap(states: DimensionState[]): LargestGap {
  const worst = pickLargestGap(states)
  // Approximate the coverage shortfall in meters as (1 - score/100) * radius for that type.
  const radius = RADII[worst.type]
  const coverageGapMeters = Math.round(radius * (1 - worst.score / 100))
  return {
    type: worst.type,
    coverageGapMeters,
    populationOutsideCoverage: worst.populationOutside,
  }
}

function templateReasoning(
  district: District,
  scores: ServiceScores,
  largest: LargestGap,
  severity: Severity,
): string {
  return [
    `${district.name}: ${severity} severity.`,
    `${largest.populationOutsideCoverage.toLocaleString()} residents outside ${largest.type.replace('_', ' ')} coverage (gap ~${largest.coverageGapMeters}m).`,
    `15-minute city score ${scores.fifteenMinuteCityScore}.`,
  ].join(' ')
}

function populationAffected(district: District, scores: ServiceScores): number {
  // Population scaled by how far the worst dimension is from full coverage.
  const dimensional = [
    scores.clinicAccess,
    scores.schoolAccess,
    scores.parkAccess,
    scores.transitAccess,
    scores.emergencyAccess,
  ]
  const minScore = Math.min(...dimensional)
  return Math.round(district.population * (1 - minScore / 100))
}

// ──────────────────────────────────────────────────────────────────────────
// Public entry
// ──────────────────────────────────────────────────────────────────────────

export function analyzeDistrict(district: District): DistrictGapReport {
  const scores = computeServiceScores(district)
  const states = dimensionStates(district, scores)
  const largestGap = buildLargestGap(states)
  const severity = classifySeverity(scores)
  const recommendedInfrastructureType = recommendInfrastructureType(district, scores)
  return {
    districtId: district.id,
    districtName: district.name,
    scores,
    populationAffected: populationAffected(district, scores),
    severity,
    largestGap,
    recommendedInfrastructureType,
    deterministicReasoning: templateReasoning(district, scores, largestGap, severity),
  }
}

export function runGapAnalysis(districts: District[]): DistrictGapReport[] {
  return districts
    .map(analyzeDistrict)
    .sort((a, b) => {
      const r = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]
      if (r !== 0) return r
      return b.populationAffected - a.populationAffected
    })
}

// Exported for the validator and copilot — they need the radii table.
export const COVERAGE_RADII = RADII
