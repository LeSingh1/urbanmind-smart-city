/**
 * Layer 1 — Deterministic Gap Engine: shared types.
 *
 * These types are the contract between the engine, the validator, and the copilot.
 * Anything the LLM produces must reduce to one of these shapes; the engine's
 * structured output is the only data that ever reaches map state.
 */

export type InfrastructureType =
  | 'clinic'
  | 'school'
  | 'park'
  | 'transit_hub'
  | 'emergency'
  | 'community_center'

export type Severity = 'critical' | 'high' | 'moderate' | 'low'

export interface LatLng {
  lat: number
  lng: number
}

export interface Infrastructure {
  id: string
  type: InfrastructureType
  location: LatLng
  capacity: number
  coverageRadiusMeters: number
}

export interface PolygonRing {
  /** Ordered ring of [lng, lat] pairs (GeoJSON convention). */
  coordinates: [number, number][]
}

export interface District {
  id: string
  name: string
  population: number
  projectedPopulation2040: number
  centroid: LatLng
  bounds: PolygonRing
  existingInfrastructure: Infrastructure[]
}

export interface ServiceScores {
  clinicAccess: number
  schoolAccess: number
  parkAccess: number
  transitAccess: number
  emergencyAccess: number
  fifteenMinuteCityScore: number
}

export interface LargestGap {
  type: InfrastructureType
  coverageGapMeters: number
  populationOutsideCoverage: number
}

export interface DistrictGapReport {
  districtId: string
  districtName: string
  scores: ServiceScores
  populationAffected: number
  severity: Severity
  largestGap: LargestGap
  recommendedInfrastructureType: InfrastructureType
  /** Template string filled from numeric facts above; never LLM-generated. */
  deterministicReasoning: string
}

export interface TerrainMask {
  /** Returns true when the point lies on water, existing built mass, or a protected polygon. */
  isInvalid: (point: LatLng) => boolean
}
