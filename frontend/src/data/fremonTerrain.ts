/**
 * Approximated terrain mask for fictional Fremon.
 *
 * Two invented features: a north-flowing river ("Fremon Wash") cutting through
 * the western edge, and a small inland reservoir to the south. These are
 * polygons in [lng, lat] order. The mask treats anything inside as invalid
 * placement terrain (water bodies, protected wetland buffer, etc.).
 *
 * Approximation: real planning would consult zoning + hydrography GIS layers.
 * For demo purposes we hand-author a few polygons and document the limitation.
 */

import type { LatLng, PolygonRing, TerrainMask } from '@/engine/types'
import { pointInPolygon } from '@/engine/gapEngine'

const RIVER: PolygonRing = {
  coordinates: [
    [-122.005, 37.555],
    [-121.995, 37.555],
    [-121.99, 37.62],
    [-122.0, 37.66],
    [-122.012, 37.66],
    [-122.008, 37.6],
    [-122.005, 37.555],
  ],
}

const RESERVOIR: PolygonRing = {
  coordinates: [
    [-121.94, 37.532],
    [-121.918, 37.532],
    [-121.918, 37.546],
    [-121.94, 37.546],
    [-121.94, 37.532],
  ],
}

const PROTECTED_AREAS: PolygonRing[] = [RIVER, RESERVOIR]

export const FREMON_TERRAIN: TerrainMask = {
  isInvalid: (point: LatLng) => PROTECTED_AREAS.some((ring) => pointInPolygon(point, ring)),
}

export const FREMON_PROTECTED_RINGS = PROTECTED_AREAS
