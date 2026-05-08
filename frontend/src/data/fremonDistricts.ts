/**
 * Fremon district seed for the deterministic gap engine.
 *
 * Fremon is a fictional 420,000-resident generated city. All coordinates here
 * are invented and live in a flat region of California's Central Valley
 * (roughly between Tracy and Manteca) with no real city named "Fremon" present.
 * District names, populations, and infrastructure are deliberately authored to
 * leave engineered gaps:
 *
 *   - South:     emergency / clinic gap
 *   - East:      school gap
 *   - North:     transit gap
 *   - Central:   park gap
 *   - West:      transit congestion
 *   - Northeast: park + transit gaps (mid-severity)
 *   - Southwest: emergency + transit (mid-severity)
 *   - Downtown:  baseline-healthy 15-min compliance
 *
 * Sum of populations: 420,000.
 */

import type { District, Infrastructure, InfrastructureType } from '@/engine/types'

const FREMON_CENTER = { lat: 37.5485, lng: -121.9886 }

function rect(centerLat: number, centerLng: number, halfHeightDeg: number, halfWidthDeg: number) {
  const minLat = centerLat - halfHeightDeg
  const maxLat = centerLat + halfHeightDeg
  const minLng = centerLng - halfWidthDeg
  const maxLng = centerLng + halfWidthDeg
  return {
    coordinates: [
      [minLng, minLat],
      [maxLng, minLat],
      [maxLng, maxLat],
      [minLng, maxLat],
      [minLng, minLat],
    ] as [number, number][],
  }
}

function infra(
  id: string,
  type: InfrastructureType,
  lat: number,
  lng: number,
  capacity: number,
  radius: number,
): Infrastructure {
  return { id, type, location: { lat, lng }, capacity, coverageRadiusMeters: radius }
}

// All centroids stay east of -122.02 (the bay edge) so districts and their
// recommendations land on Fremon-like inland terrain rather than open water.
const NORTH_CENTER = { lat: FREMON_CENTER.lat + 0.045, lng: FREMON_CENTER.lng + 0.005 }
const SOUTH_CENTER = { lat: FREMON_CENTER.lat - 0.045, lng: FREMON_CENTER.lng + 0.005 }
const EAST_CENTER = { lat: FREMON_CENTER.lat + 0.005, lng: FREMON_CENTER.lng + 0.05 }
const WEST_CENTER = { lat: FREMON_CENTER.lat + 0.01, lng: FREMON_CENTER.lng - 0.025 }
const CENTRAL_CENTER = { lat: FREMON_CENTER.lat + 0.005, lng: FREMON_CENTER.lng + 0.012 }
const NORTHEAST_CENTER = { lat: FREMON_CENTER.lat + 0.035, lng: FREMON_CENTER.lng + 0.04 }
const SOUTHWEST_CENTER = { lat: FREMON_CENTER.lat - 0.03, lng: FREMON_CENTER.lng - 0.018 }
const DOWNTOWN_CENTER = { lat: FREMON_CENTER.lat - 0.005, lng: FREMON_CENTER.lng + 0.015 }

export const FREMON_ENGINE_DISTRICTS: District[] = [
  {
    id: 'fremon-north',
    name: 'North Fremon',
    population: 58_000,
    projectedPopulation2040: 78_000,
    centroid: NORTH_CENTER,
    bounds: rect(NORTH_CENTER.lat, NORTH_CENTER.lng, 0.012, 0.018),
    existingInfrastructure: [
      infra('north-clinic-1', 'clinic', NORTH_CENTER.lat - 0.005, NORTH_CENTER.lng - 0.01, 250, 1500),
      infra('north-school-1', 'school', NORTH_CENTER.lat + 0.008, NORTH_CENTER.lng + 0.012, 800, 1200),
      infra('north-park-1', 'park', NORTH_CENTER.lat + 0.012, NORTH_CENTER.lng - 0.008, 0, 800),
      // No transit hub — this is the engineered transit gap.
    ],
  },
  {
    id: 'fremon-south',
    name: 'South Fremon',
    population: 64_000,
    projectedPopulation2040: 92_000,
    centroid: SOUTH_CENTER,
    bounds: rect(SOUTH_CENTER.lat, SOUTH_CENTER.lng, 0.014, 0.02),
    existingInfrastructure: [
      infra('south-school-1', 'school', SOUTH_CENTER.lat + 0.008, SOUTH_CENTER.lng + 0.01, 700, 1200),
      infra('south-school-2', 'school', SOUTH_CENTER.lat - 0.012, SOUTH_CENTER.lng - 0.012, 600, 1200),
      infra('south-park-1', 'park', SOUTH_CENTER.lat - 0.005, SOUTH_CENTER.lng + 0.005, 0, 800),
      infra('south-transit-1', 'transit_hub', SOUTH_CENTER.lat + 0.01, SOUTH_CENTER.lng - 0.015, 0, 500),
      // No clinic and no dedicated emergency — engineered emergency gap.
    ],
  },
  {
    id: 'fremon-east',
    name: 'East Fremon',
    population: 51_000,
    projectedPopulation2040: 70_000,
    centroid: EAST_CENTER,
    bounds: rect(EAST_CENTER.lat, EAST_CENTER.lng, 0.014, 0.018),
    existingInfrastructure: [
      infra('east-clinic-1', 'clinic', EAST_CENTER.lat, EAST_CENTER.lng - 0.012, 220, 1500),
      infra('east-park-1', 'park', EAST_CENTER.lat + 0.008, EAST_CENTER.lng + 0.012, 0, 800),
      infra('east-transit-1', 'transit_hub', EAST_CENTER.lat - 0.012, EAST_CENTER.lng - 0.018, 0, 500),
      // No school — engineered school gap.
    ],
  },
  {
    id: 'fremon-west',
    name: 'West Fremon',
    population: 47_000,
    projectedPopulation2040: 60_000,
    centroid: WEST_CENTER,
    bounds: rect(WEST_CENTER.lat, WEST_CENTER.lng, 0.012, 0.018),
    existingInfrastructure: [
      infra('west-clinic-1', 'clinic', WEST_CENTER.lat - 0.005, WEST_CENTER.lng + 0.01, 240, 1500),
      infra('west-school-1', 'school', WEST_CENTER.lat + 0.01, WEST_CENTER.lng + 0.008, 700, 1200),
      infra('west-park-1', 'park', WEST_CENTER.lat - 0.012, WEST_CENTER.lng - 0.012, 0, 800),
      // Single transit hub, deliberately at the eastern edge to leave western blocks uncovered.
      infra('west-transit-1', 'transit_hub', WEST_CENTER.lat, WEST_CENTER.lng + 0.022, 0, 500),
    ],
  },
  {
    id: 'fremon-central',
    name: 'Central Fremon',
    population: 72_000,
    projectedPopulation2040: 96_000,
    centroid: CENTRAL_CENTER,
    bounds: rect(CENTRAL_CENTER.lat, CENTRAL_CENTER.lng, 0.011, 0.018),
    existingInfrastructure: [
      infra('central-clinic-1', 'clinic', CENTRAL_CENTER.lat + 0.005, CENTRAL_CENTER.lng - 0.005, 280, 1500),
      infra('central-school-1', 'school', CENTRAL_CENTER.lat - 0.005, CENTRAL_CENTER.lng + 0.008, 850, 1200),
      infra('central-school-2', 'school', CENTRAL_CENTER.lat + 0.008, CENTRAL_CENTER.lng + 0.014, 700, 1200),
      infra('central-transit-1', 'transit_hub', CENTRAL_CENTER.lat - 0.002, CENTRAL_CENTER.lng - 0.002, 0, 500),
      infra('central-transit-2', 'transit_hub', CENTRAL_CENTER.lat + 0.012, CENTRAL_CENTER.lng - 0.014, 0, 500),
      // No park — engineered park gap.
    ],
  },
  {
    id: 'fremon-northeast',
    name: 'Northeast Fremon',
    population: 42_000,
    projectedPopulation2040: 58_000,
    centroid: NORTHEAST_CENTER,
    bounds: rect(NORTHEAST_CENTER.lat, NORTHEAST_CENTER.lng, 0.011, 0.016),
    existingInfrastructure: [
      infra('ne-clinic-1', 'clinic', NORTHEAST_CENTER.lat - 0.005, NORTHEAST_CENTER.lng - 0.008, 200, 1500),
      infra('ne-school-1', 'school', NORTHEAST_CENTER.lat + 0.008, NORTHEAST_CENTER.lng - 0.005, 650, 1200),
      // Park and transit absent — mid-severity dual gap.
    ],
  },
  {
    id: 'fremon-southwest',
    name: 'Southwest Fremon',
    population: 39_000,
    projectedPopulation2040: 52_000,
    centroid: SOUTHWEST_CENTER,
    bounds: rect(SOUTHWEST_CENTER.lat, SOUTHWEST_CENTER.lng, 0.012, 0.017),
    existingInfrastructure: [
      infra('sw-school-1', 'school', SOUTHWEST_CENTER.lat + 0.008, SOUTHWEST_CENTER.lng + 0.008, 620, 1200),
      infra('sw-park-1', 'park', SOUTHWEST_CENTER.lat - 0.005, SOUTHWEST_CENTER.lng - 0.012, 0, 800),
      // No clinic, no transit, no emergency — emergency + transit gap.
    ],
  },
  {
    id: 'fremon-downtown',
    name: 'Downtown Fremon',
    population: 47_000,
    projectedPopulation2040: 64_000,
    centroid: DOWNTOWN_CENTER,
    bounds: rect(DOWNTOWN_CENTER.lat, DOWNTOWN_CENTER.lng, 0.009, 0.014),
    existingInfrastructure: [
      infra('dt-clinic-1', 'clinic', DOWNTOWN_CENTER.lat, DOWNTOWN_CENTER.lng, 320, 1500),
      infra('dt-school-1', 'school', DOWNTOWN_CENTER.lat + 0.004, DOWNTOWN_CENTER.lng - 0.004, 750, 1200),
      infra('dt-school-2', 'school', DOWNTOWN_CENTER.lat - 0.004, DOWNTOWN_CENTER.lng + 0.004, 700, 1200),
      infra('dt-park-1', 'park', DOWNTOWN_CENTER.lat - 0.004, DOWNTOWN_CENTER.lng + 0.004, 0, 800),
      infra('dt-park-2', 'park', DOWNTOWN_CENTER.lat + 0.004, DOWNTOWN_CENTER.lng - 0.004, 0, 800),
      infra('dt-transit-1', 'transit_hub', DOWNTOWN_CENTER.lat - 0.002, DOWNTOWN_CENTER.lng - 0.002, 0, 500),
      infra('dt-transit-2', 'transit_hub', DOWNTOWN_CENTER.lat + 0.002, DOWNTOWN_CENTER.lng + 0.002, 0, 500),
      infra('dt-transit-3', 'transit_hub', DOWNTOWN_CENTER.lat - 0.005, DOWNTOWN_CENTER.lng + 0.006, 0, 500),
      infra('dt-emergency-1', 'emergency', DOWNTOWN_CENTER.lat + 0.002, DOWNTOWN_CENTER.lng + 0.003, 80, 2400),
      // Healthy district — should classify as low/moderate.
    ],
  },
]

export const FREMON_TOTAL_POPULATION = FREMON_ENGINE_DISTRICTS.reduce((sum, d) => sum + d.population, 0)
