/**
 * Smoke test for the deterministic gap engine + validator.
 *
 * Run with: npx tsx scripts/engine-smoke.ts
 *
 * Assertions:
 *  - Same input -> same output (run twice, deep equal).
 *  - Severity ordering: South emergency, East school, North transit, Central park gaps surface as critical/high.
 *  - Validator passes a hand-built clean recommendation.
 *  - Validator fails a recommendation placed in the river terrain mask.
 *  - Validator fails a recommendation with a wild impact delta.
 */

import { runGapAnalysis } from '../src/engine/gapEngine'
import { FREMON_ENGINE_DISTRICTS, FREMON_TOTAL_POPULATION } from '../src/data/fremonDistricts'
import { FREMON_TERRAIN } from '../src/data/fremonTerrain'
import { buildValidationContext, validateRecommendation } from '../src/validation/validator'
import { generateAlerts, generateRecommendations, pickTopRecommendation } from '../src/copilot/copilot'

let failures = 0
function assert(cond: unknown, label: string) {
  if (cond) {
    console.log('  ok  -', label)
  } else {
    console.log('  FAIL-', label)
    failures += 1
  }
}

console.log('Fremon total population:', FREMON_TOTAL_POPULATION)
assert(FREMON_TOTAL_POPULATION === 420_000, 'population sums to 420,000')

const reportsA = runGapAnalysis(FREMON_ENGINE_DISTRICTS)
const reportsB = runGapAnalysis(FREMON_ENGINE_DISTRICTS)
assert(JSON.stringify(reportsA) === JSON.stringify(reportsB), 'engine output is deterministic')
assert(reportsA.length === FREMON_ENGINE_DISTRICTS.length, 'engine reports one per district')

// Show top 3
for (const r of reportsA.slice(0, 3)) {
  console.log(
    `  - ${r.districtName.padEnd(20)} sev=${r.severity.padEnd(8)} 15min=${r.scores.fifteenMinuteCityScore} ` +
      `worst=${r.largestGap.type.padEnd(13)} pop=${r.largestGap.populationOutsideCoverage} -> ${r.recommendedInfrastructureType}`,
  )
}

// Severity expectations
const south = reportsA.find((r) => r.districtId === 'fremon-south')!
const east = reportsA.find((r) => r.districtId === 'fremon-east')!
const north = reportsA.find((r) => r.districtId === 'fremon-north')!
const central = reportsA.find((r) => r.districtId === 'fremon-central')!
const downtown = reportsA.find((r) => r.districtId === 'fremon-downtown')!

assert(south.severity === 'critical' || south.severity === 'high', 'South Fremon flagged critical/high')
assert(east.severity === 'critical' || east.severity === 'high', 'East Fremon flagged critical/high')
assert(north.severity === 'critical' || north.severity === 'high', 'North Fremon flagged critical/high')
assert(central.severity !== 'low', 'Central Fremon not classified low')
assert(downtown.scores.fifteenMinuteCityScore >= 75, 'Downtown 15-min score is healthy (>=75)')
assert(
  downtown.scores.fifteenMinuteCityScore > south.scores.fifteenMinuteCityScore + 30,
  'Downtown is materially healthier than South Fremon',
)

assert(['clinic', 'emergency'].includes(south.recommendedInfrastructureType), 'South recommends clinic/emergency')
assert(east.recommendedInfrastructureType === 'school', 'East recommends school')
assert(north.recommendedInfrastructureType === 'transit_hub', 'North recommends transit_hub')
assert(central.recommendedInfrastructureType === 'park', 'Central recommends park')

// Validator: clean recommendation should pass
const ctx = buildValidationContext(reportsA, FREMON_ENGINE_DISTRICTS, FREMON_TERRAIN)
const southDistrict = FREMON_ENGINE_DISTRICTS.find((d) => d.id === south.districtId)!
const cleanRec = {
  id: 'rec-south-clinic',
  sourceDistrictId: south.districtId,
  infrastructureType: 'clinic' as const,
  proposedLocation: { ...southDistrict.centroid },
  expectedImpact: [
    { metric: 'emergencyAccess', before: south.scores.emergencyAccess, after: Math.min(100, south.scores.emergencyAccess + 24) },
    { metric: 'clinicAccess', before: south.scores.clinicAccess, after: Math.min(100, south.scores.clinicAccess + 28) },
  ],
  estimatedCostUSD: 12_000_000,
  populationServed: 22_000,
  confidence: 91,
}
const cleanResult = validateRecommendation(cleanRec, ctx)
console.log('  clean rec ->', cleanResult.status, cleanResult.reasons)
assert(cleanResult.status === 'passed', 'clean recommendation passes validation')

// Validator: river-water rec should fail terrain
const riverRec = { ...cleanRec, id: 'rec-river', proposedLocation: { lat: 37.6, lng: -122.0 } }
const riverResult = validateRecommendation(riverRec, ctx)
console.log('  river rec ->', riverResult.status, riverResult.reasons)
assert(riverResult.reasons.some((r) => /invalid terrain|outside district bounds/i.test(r)), 'river recommendation rejected (terrain or bounds)')

// Validator: wild delta should be flagged
const wildRec = {
  ...cleanRec,
  id: 'rec-wild',
  expectedImpact: [
    { metric: 'emergencyAccess', before: 30, after: 99 }, // 69-point jump
  ],
}
const wildResult = validateRecommendation(wildRec, ctx)
console.log('  wild rec  ->', wildResult.status, wildResult.reasons)
assert(wildResult.reasons.some((r) => /Implausible impact delta/.test(r)), 'wild delta flagged')

// Copilot module checks
const alerts = generateAlerts(reportsA)
console.log(`  alerts: ${alerts.length}`)
assert(alerts.length >= 1 && alerts.length <= 5, 'alerts produces 1-5 items')
assert(alerts.every((a) => a.severity !== 'low'), 'no low-severity alerts surfaced')

const recs = generateRecommendations(reportsA, FREMON_ENGINE_DISTRICTS, FREMON_TERRAIN)
console.log(`  recommendations: ${recs.length}`)
for (const r of recs.slice(0, 3)) {
  console.log(
    `    - ${r.sourceDistrictName.padEnd(20)} ${r.infrastructureType.padEnd(13)} ${r.validationStatus.padEnd(13)} conf=${r.confidence}`,
  )
}
assert(recs.length >= 1, 'at least one recommendation emitted')
assert(recs.every((r) => r.expectedImpact.length > 0), 'every rec has at least one impact metric')
assert(recs.every((r) => r.estimatedCostUSD > 0), 'every rec has cost')
assert(recs.every((r) => r.populationServed > 0), 'every rec has populationServed')
const passed = recs.filter((r) => r.validationStatus === 'passed')
assert(passed.length >= 1, 'at least one recommendation passes validation')
const top = pickTopRecommendation(recs)
assert(top !== null && top.validationStatus === 'passed', 'top recommendation is validation-passed')

console.log(failures === 0 ? '\nALL OK' : `\n${failures} failure(s)`)
process.exit(failures === 0 ? 0 : 1)
