/**
 * Anti-clutter guardrails for the Fremon "context dots" seed.
 *
 * Runs at module load (import side effect) when DEV is enabled. Violations
 * are logged to console; they do not throw, so a single bad coordinate does
 * not crash the demo. The function is also exported for unit testing.
 *
 * Rules:
 *  - no two dots within 50m of each other
 *  - every dot lies inside its declared district bounds
 *  - every dot is off the terrain mask (no water, no protected polygon)
 *  - default visible count <= 30
 */

import { haversineMeters, pointInPolygon } from '@/engine/gapEngine'
import { FREMON_ENGINE_DISTRICTS } from '@/data/fremonDistricts'
import { FREMON_TERRAIN } from '@/data/fremonTerrain'
import {
  DISTRICT_NAME_TO_ENGINE_ID,
  FREMON_EXISTING_INFRASTRUCTURE,
  type ExistingInfrastructure,
} from '@/data/fremonExistingInfrastructure'

const MIN_DISTANCE_M = 50
const MAX_DEFAULT_DOTS = 30

export interface DotViolation {
  rule: 'too_close' | 'outside_bounds' | 'on_terrain' | 'over_cap' | 'unknown_district'
  dotId: string
  detail: string
}

export function validateExistingInfrastructure(
  dots: ExistingInfrastructure[] = FREMON_EXISTING_INFRASTRUCTURE,
): DotViolation[] {
  const violations: DotViolation[] = []

  if (dots.length > MAX_DEFAULT_DOTS) {
    violations.push({
      rule: 'over_cap',
      dotId: '_count',
      detail: `Default visible count ${dots.length} exceeds cap ${MAX_DEFAULT_DOTS}.`,
    })
  }

  const districtById = new Map(FREMON_ENGINE_DISTRICTS.map((d) => [d.id, d]))

  for (const dot of dots) {
    const districtId = DISTRICT_NAME_TO_ENGINE_ID[dot.district]
    if (!districtId) {
      violations.push({
        rule: 'unknown_district',
        dotId: dot.id,
        detail: `District name "${dot.district}" has no engine mapping.`,
      })
      continue
    }
    const district = districtById.get(districtId)
    if (!district) {
      violations.push({
        rule: 'unknown_district',
        dotId: dot.id,
        detail: `Engine district id "${districtId}" not found.`,
      })
      continue
    }
    if (!pointInPolygon(dot.coordinates, district.bounds)) {
      violations.push({
        rule: 'outside_bounds',
        dotId: dot.id,
        detail: `(${dot.coordinates.lat.toFixed(4)}, ${dot.coordinates.lng.toFixed(4)}) is outside ${dot.district}.`,
      })
    }
    if (FREMON_TERRAIN.isInvalid(dot.coordinates)) {
      violations.push({
        rule: 'on_terrain',
        dotId: dot.id,
        detail: `(${dot.coordinates.lat.toFixed(4)}, ${dot.coordinates.lng.toFixed(4)}) lands on water or protected terrain.`,
      })
    }
  }

  for (let i = 0; i < dots.length; i++) {
    for (let j = i + 1; j < dots.length; j++) {
      const a = dots[i]
      const b = dots[j]
      const d = haversineMeters(a.coordinates, b.coordinates)
      if (d < MIN_DISTANCE_M) {
        violations.push({
          rule: 'too_close',
          dotId: a.id,
          detail: `Within ${Math.round(d)}m of ${b.id} (min ${MIN_DISTANCE_M}m).`,
        })
      }
    }
  }

  return violations
}

// Module-load self-check (logs only; never throws). Skipped under SSR.
if (typeof window !== 'undefined' && (import.meta as ImportMeta & { env?: { DEV?: boolean } }).env?.DEV) {
  const violations = validateExistingInfrastructure()
  if (violations.length > 0) {
    // eslint-disable-next-line no-console
    console.warn(
      '[UrbanMind] %d existing-infrastructure dot violation(s):',
      violations.length,
      violations,
    )
  }
}
