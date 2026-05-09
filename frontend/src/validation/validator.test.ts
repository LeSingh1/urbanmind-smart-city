import { describe, expect, it } from 'vitest'
import { COVERAGE_RADII } from '@/engine/gapEngine'
import { buildValidationContext, validateRecommendation, type CandidateRecommendation } from './validator'
import type { DistrictGapReport, TerrainMask } from '@/engine/types'

const terrainOk: TerrainMask = { isInvalid: () => false }

const baseReport: DistrictGapReport = {
  districtId: 'd1',
  districtName: 'Demo',
  scores: {
    clinicAccess: 40,
    schoolAccess: 80,
    parkAccess: 80,
    transitAccess: 80,
    emergencyAccess: 80,
    fifteenMinuteCityScore: 72,
  },
  populationAffected: 5000,
  severity: 'high',
  largestGap: {
    type: 'clinic',
    coverageGapMeters: 400,
    populationOutsideCoverage: 2000,
  },
  recommendedInfrastructureType: 'clinic',
  deterministicReasoning: 'test',
}

const ring = {
  coordinates: [
    [-122.02, 37.54],
    [-121.98, 37.54],
    [-121.98, 37.56],
    [-122.02, 37.56],
    [-122.02, 37.54],
  ] as [number, number][],
}

describe('validator', () => {
  it('fails when district report is missing', () => {
    const rec: CandidateRecommendation = {
      id: 'r1',
      sourceDistrictId: 'missing',
      infrastructureType: 'clinic',
      proposedLocation: { lat: 37.55, lng: -122.0 },
      expectedImpact: [{ metric: 'clinicAccess', before: 40, after: 68 }],
      estimatedCostUSD: 12_000_000,
      populationServed: 1000,
      confidence: 90,
    }
    const ctx = buildValidationContext(
      [baseReport],
      [
        {
          id: 'd1',
          bounds: ring,
          existingInfrastructure: [],
        },
      ],
      terrainOk,
    )
    const out = validateRecommendation(rec, ctx)
    expect(out.status).toBe('failed')
    expect(out.reasons[0]).toContain('No matching')
  })

  it('passes a well-formed clinic recommendation', () => {
    const rec: CandidateRecommendation = {
      id: 'rec-d1',
      sourceDistrictId: 'd1',
      infrastructureType: 'clinic',
      proposedLocation: { lat: 37.551, lng: -122.0 },
      expectedImpact: [{ metric: 'clinicAccess', before: 40, after: 68 }],
      estimatedCostUSD: 12_000_000,
      populationServed: 1500,
      confidence: 90,
    }
    const ctx = buildValidationContext(
      [baseReport],
      [
        {
          id: 'd1',
          bounds: ring,
          existingInfrastructure: [],
        },
      ],
      terrainOk,
    )
    const out = validateRecommendation(rec, ctx)
    expect(out.status).toBe('passed')
    expect(COVERAGE_RADII.clinic).toBeGreaterThan(0)
  })

  it('flags out-of-band cost', () => {
    const rec: CandidateRecommendation = {
      id: 'rec-d1',
      sourceDistrictId: 'd1',
      infrastructureType: 'clinic',
      proposedLocation: { lat: 37.551, lng: -122.0 },
      expectedImpact: [{ metric: 'clinicAccess', before: 40, after: 68 }],
      estimatedCostUSD: 20, // too low
      populationServed: 1500,
      confidence: 90,
    }
    const ctx = buildValidationContext(
      [baseReport],
      [
        {
          id: 'd1',
          bounds: ring,
          existingInfrastructure: [],
        },
      ],
      terrainOk,
    )
    const out = validateRecommendation(rec, ctx)
    expect(out.status).not.toBe('passed')
    expect(out.reasons.some((r) => r.includes('Cost'))).toBe(true)
  })
})
