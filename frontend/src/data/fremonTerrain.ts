/**
 * Terrain mask for fictional Fremon, aligned with the underlying tile map so
 * placements never land on water.
 *
 * Polygons are in GeoJSON [lng, lat] order. Anything inside any polygon is
 * treated as invalid placement terrain (open water, river, reservoir,
 * protected mask). The bay polygon is sized generously to cover the eastern
 * shore of SF Bay relative to the Fremon city profile (centered near
 * 37.5485, -121.9886) — the actual hydrography is far more granular, but a
 * conservative buffer is exactly what a planning system would use anyway.
 */

import type { LatLng, PolygonRing, TerrainMask } from '@/engine/types'
import { pointInPolygon } from '@/engine/gapEngine'

// Generous SF Bay / Coyote Hills wetland buffer along the western edge.
// Anything west of roughly -122.02 longitude near Fremon is bay/wetland.
const BAY: PolygonRing = {
  coordinates: [
    [-122.20, 37.40],
    [-122.20, 37.62],
    [-122.07, 37.62],
    [-122.04, 37.59],
    [-122.03, 37.55],
    [-122.04, 37.50],
    [-122.06, 37.46],
    [-122.10, 37.42],
    [-122.20, 37.40],
  ],
}

// Inland reservoir / drainage basin to the south.
const RESERVOIR: PolygonRing = {
  coordinates: [
    [-121.92, 37.493],
    [-121.905, 37.493],
    [-121.905, 37.504],
    [-121.92, 37.504],
    [-121.92, 37.493],
  ],
}

const PROTECTED_AREAS: PolygonRing[] = [BAY, RESERVOIR]

export const FREMON_TERRAIN: TerrainMask = {
  isInvalid: (point: LatLng) => PROTECTED_AREAS.some((ring) => pointInPolygon(point, ring)),
}

export const FREMON_PROTECTED_RINGS = PROTECTED_AREAS
