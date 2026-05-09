import { describe, expect, it } from 'vitest'
import { compute15MinScore, haversineMeters, runGapAnalysis } from './gapEngine'
import type { District } from './types'

const ringFromBBox = (minLng: number, minLat: number, maxLng: number, maxLat: number) => ({
  coordinates: [
    [minLng, minLat],
    [maxLng, minLat],
    [maxLng, maxLat],
    [minLng, maxLat],
    [minLng, minLat],
  ] as [number, number][],
})

/** Minimal Fremont-like district: one clinic inside, enough population to score. */
const testDistrict: District = {
  id: 't1',
  name: 'Test District',
  population: 10_000,
  projectedPopulation2040: 12_000,
  centroid: { lat: 37.55, lng: -122.0 },
  bounds: ringFromBBox(-122.02, 37.54, -121.98, 37.56),
  existingInfrastructure: [
    {
      id: 'c1',
      type: 'clinic',
      location: { lat: 37.55, lng: -122.0 },
      capacity: 100,
      coverageRadiusMeters: 1500,
    },
  ],
}

describe('gapEngine', () => {
  it('haversineMeters is symmetric', () => {
    const a = { lat: 37.5, lng: -122.0 }
    const b = { lat: 37.51, lng: -122.01 }
    expect(haversineMeters(a, b)).toBeCloseTo(haversineMeters(b, a), 4)
  })

  it('compute15MinScore weights five dimensions', () => {
    const s = compute15MinScore({
      clinicAccess: 80,
      schoolAccess: 60,
      parkAccess: 70,
      transitAccess: 50,
      emergencyAccess: 90,
    })
    expect(s).toBe(70)
  })

  it('runGapAnalysis is deterministic for the same districts', () => {
    const districts = [testDistrict]
    const a = runGapAnalysis(districts)
    const b = runGapAnalysis(districts)
    expect(a).toEqual(b)
    expect(a.length).toBe(1)
    expect(a[0].districtId).toBe('t1')
    expect(typeof a[0].scores.clinicAccess).toBe('number')
  })
})
