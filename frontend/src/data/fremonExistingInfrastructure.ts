/**
 * Hand-authored Fremon "context dots" — existing infrastructure that pre-dates
 * any AI plan. These are the supporting cast on the map: small, muted,
 * never glowing, never animating.
 *
 * Relationship to the engine: the deterministic gap engine consumes the
 * `existingInfrastructure` field on each `District` in `fremonDistricts.ts`
 * to compute coverage scores. The dot seed in this file is a curated,
 * narrative-visible subset designed for storytelling. Both layers describe
 * "what exists today"; the engine set is tuned to surface the five
 * engineered gaps, while the dot set spreads visible context across all
 * active districts so the map feels grounded and data-rich.
 *
 * Visual hierarchy contract:
 *   - dots show context (what exists today)
 *   - icons show decisions (AI recommendations)
 *   - rings show impact (post-Apply)
 *
 * Coordinates are placed inside the matching engine district polygon (see
 * `fremonDistricts.ts`) and were authored manually — no random jitter. The
 * runtime check in `validateExistingInfrastructure` enforces:
 *   - no two dots within 50m
 *   - every dot is on land (terrain mask clear)
 *   - every dot is inside its declared district bounds
 *   - default visible count <= 30
 */

import type { LatLng } from '@/engine/types'

export type ExistingCategory = 'clinic' | 'school' | 'park' | 'transit' | 'emergency'

export type FremonDistrict =
  | 'South Emergency Gap'
  | 'East Education District'
  | 'North Transit Gap'
  | 'Central Green Space Gap'
  | 'West Congestion Zone'
  | 'New Housing Expansion Zone'
  | 'Innovation District'

export interface ExistingInfrastructure {
  id: string
  name: string
  category: ExistingCategory
  status: 'existing'
  district: FremonDistrict
  coordinates: LatLng
  source: 'seeded_existing'
  relevance: string
  coverageRadiusMeters?: number
}

/** Maps the narrative district name to the engine district id used for bounds checks. */
export const DISTRICT_NAME_TO_ENGINE_ID: Record<FremonDistrict, string> = {
  'South Emergency Gap': 'fremon-south',
  'East Education District': 'fremon-east',
  'North Transit Gap': 'fremon-north',
  'Central Green Space Gap': 'fremon-central',
  'West Congestion Zone': 'fremon-west',
  'New Housing Expansion Zone': 'fremon-southwest',
  'Innovation District': 'fremon-northeast',
}

const dot = (
  id: string,
  name: string,
  category: ExistingCategory,
  district: FremonDistrict,
  lat: number,
  lng: number,
  relevance: string,
  coverageRadiusMeters?: number,
): ExistingInfrastructure => ({
  id,
  name,
  category,
  status: 'existing',
  district,
  coordinates: { lat, lng },
  source: 'seeded_existing',
  relevance,
  coverageRadiusMeters,
})

// ──────────────────────────────────────────────────────────────────────────
// Default visible set (cap: 30; current count: 26)
// ──────────────────────────────────────────────────────────────────────────

export const FREMON_EXISTING_INFRASTRUCTURE: ExistingInfrastructure[] = [
  // ── Clinics (5) ──────────────────────────────────────────────────────
  dot('northside-clinic', 'Northside Clinic', 'clinic', 'North Transit Gap',
      37.5965, -121.9776,
      'Existing clinic network is too far to fully cover the projected northern growth corridor.', 1500),
  dot('central-care-clinic', 'Central Care Clinic', 'clinic', 'Central Green Space Gap',
      37.5570, -121.9700,
      'Serves current Central residents; new transit-corridor housing will outpace clinic capacity.', 1500),
  dot('west-urgent-care', 'West Urgent Care', 'clinic', 'West Congestion Zone',
      37.5635, -122.0050,
      'Single-clinic coverage on the western edge — emergency response is delayed by congestion.', 1500),
  dot('innovation-district-clinic', 'Innovation District Clinic', 'clinic', 'Innovation District',
      37.5810, -121.9410,
      'Healthy baseline coverage today; demand grows as the innovation campus expands.', 1500),
  dot('fremon-edge-health-post', 'Fremon Edge Health Post', 'clinic', 'New Housing Expansion Zone',
      37.5215, -121.9990,
      'Lone health post for the housing expansion corridor — clearly under-resourced.', 1500),

  // ── Schools (6) ──────────────────────────────────────────────────────
  dot('east-district-school', 'East District School', 'school', 'East Education District',
      37.5575, -121.9320,
      'Capacity is sufficient today but does not extend to the projected eastern expansion zone.', 1200),
  dot('central-stem-academy', 'Central STEM Academy', 'school', 'Central Green Space Gap',
      37.5485, -121.9870,
      'Anchor STEM school; commute pressure rises sharply with central housing growth.', 1200),
  dot('northside-middle-school', 'Northside Middle School', 'school', 'North Transit Gap',
      37.5895, -121.9890,
      'Middle-school catchment is strong, but transit gaps make access uneven.', 1200),
  dot('west-valley-school', 'West Valley School', 'school', 'West Congestion Zone',
      37.5575, -121.9990,
      'Western catchment school; congestion lengthens commutes for the southern blocks.', 1200),
  dot('innovation-prep', 'Innovation Prep', 'school', 'Innovation District',
      37.5870, -121.9550,
      'Innovation-aligned school; high demand projected as the district densifies.', 1200),
  dot('southview-elementary', 'Southview Elementary', 'school', 'South Emergency Gap',
      37.5095, -121.9926,
      'Only elementary in the southern emergency gap; emergency response routes do not reach the school.', 1200),

  // ── Parks (5) ────────────────────────────────────────────────────────
  dot('central-neighborhood-park', 'Central Neighborhood Park', 'park', 'Central Green Space Gap',
      37.5570, -121.9620,
      'Serves current residents; central residential growth will exceed walking-distance coverage.', 800),
  dot('east-green-pocket', 'East Green Pocket', 'park', 'East Education District',
      37.5500, -121.9450,
      'Single pocket park — insufficient for the projected eastern student population.', 800),
  dot('west-ridge-park', 'West Ridge Park', 'park', 'West Congestion Zone',
      37.5525, -122.0150,
      'Western open space along the ridge; gaps remain along the congested corridor.', 800),
  dot('north-commons', 'North Commons', 'park', 'North Transit Gap',
      37.5995, -121.9900,
      'Northern commons; new growth pushes residents beyond the 800m park-walk radius.', 800),
  dot('innovation-plaza', 'Innovation Plaza', 'park', 'Innovation District',
      37.5780, -121.9460,
      'Plaza-style green space supports the campus; broader district lacks coverage.', 800),

  // ── Transit (6) ──────────────────────────────────────────────────────
  dot('north-transit-stop', 'North Transit Stop', 'transit', 'North Transit Gap',
      37.5915, -121.9760,
      'Sparse transit coverage; gaps grow as the corridor densifies.', 500),
  dot('central-bus-exchange', 'Central Bus Exchange', 'transit', 'Central Green Space Gap',
      37.5500, -121.9750,
      'Strong central interchange; eastern blocks still depend on car commute.', 500),
  dot('west-connector-stop', 'West Connector Stop', 'transit', 'West Congestion Zone',
      37.5685, -122.0050,
      'Single connector stop — adds to congestion rather than relieving it.', 500),
  dot('east-local-stop', 'East Local Stop', 'transit', 'East Education District',
      37.5635, -121.9280,
      'Local stop near the school; rail-grade transit still missing.', 500),
  dot('innovation-rail-stop', 'Innovation Rail Stop', 'transit', 'Innovation District',
      37.5895, -121.9415,
      'Rail-grade access already in place; the surrounding district still needs feeder coverage.', 500),
  dot('south-connector-stop', 'South Connector Stop', 'transit', 'South Emergency Gap',
      37.4985, -121.9756,
      'Lone southern connector; transit deserts persist around the housing edge.', 500),

  // ── Emergency Services (4) ───────────────────────────────────────────
  dot('west-fire-station', 'West Fire Station', 'emergency', 'West Congestion Zone',
      37.5495, -121.9990,
      'Western fire station; congested grid impacts response times to the south.', 2400),
  dot('central-police-post', 'Central Police Post', 'emergency', 'Central Green Space Gap',
      37.5610, -121.9810,
      'Central police post; rapid-response coverage thins out toward the edges.', 2400),
  dot('north-fire-response-unit', 'North Fire Response Unit', 'emergency', 'North Transit Gap',
      37.5995, -121.9760,
      'Northern fire response unit; coverage drops sharply north of the corridor.', 2400),
  dot('south-emergency-depot', 'South Emergency Depot', 'emergency', 'South Emergency Gap',
      37.5085, -121.9740,
      'Sole southern depot; clinic absence amplifies pressure on this single asset.', 2400),
]

/** Optional extended set hook — empty for now; gated by the `Show all existing infrastructure` toggle. */
export const FREMON_EXISTING_INFRASTRUCTURE_EXTENDED: ExistingInfrastructure[] = []
