import type { UnderservedZone } from '@/types/city.types'

/** Copilot infrastructure `name` → underserved zone labels (exact or stem match). */
export const COPILOT_RECOMMENDATION_TO_ZONE_LABELS: Record<string, readonly string[]> = {
  'South Emergency Gap Clinic': ['South Emergency Gap'],
  'East Education District School': ['East Education District', 'East Education Gap'],
  'North Transit Hub': ['North Transit Gap'],
  'Central Green Corridor': ['Central Green Space Gap'],
  'New Housing Expansion Community Center': ['New Housing Expansion Zone'],
  'West Congestion Relief Transit Stop': ['West Congestion Zone'],
}

function stem(s: string) {
  return s
    .replace(/\s+Gap$/i, '')
    .replace(/\s+Zone$/i, '')
    .replace(/\s+District$/i, '')
    .trim()
}

function zoneMatchesLabel(zone: UnderservedZone, label: string) {
  if (zone.name === label) return true
  const z = stem(zone.name)
  const l = stem(label)
  if (z === l) return true
  if (z.length >= 6 && l.length >= 6 && (z.startsWith(l) || l.startsWith(z))) return true
  return false
}

/** Prefer `improvedBy` link; fallback to deterministic name ↔ zone mapping. */
export function resolveActiveRecommendationZoneId(
  rec: { id: string; name: string } | undefined,
  zones: UnderservedZone[],
): string | null {
  if (!rec) return null
  const byRecId = zones.find((z) => z.improvedBy?.includes(rec.id))
  if (byRecId) return byRecId.id
  const labels = COPILOT_RECOMMENDATION_TO_ZONE_LABELS[rec.name]
  if (!labels) return null
  for (const label of labels) {
    const hit = zones.find((z) => zoneMatchesLabel(z, label))
    if (hit) return hit.id
  }
  return null
}
