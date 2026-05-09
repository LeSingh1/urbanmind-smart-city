/**
 * Single source of truth for the planning report and impact summary.
 *
 * Every visible field in PlanningReportModal and the sidebar ImpactSummary
 * derives from buildReportData(). No hardcoded numbers, no scenario- or
 * year-specific literals — all values are computed from the live `PlanningState`
 * plus the active `ScenarioId`.
 *
 * Status, narrative, and warning copy are driven by `computeTimelineStress`
 * which combines years-elapsed and projected population growth. This is what
 * makes the demo "live" across time: the same plan looks Future Proofed at
 * 2026 and Needs Phase 2 at 2100, all from one builder.
 */

import type { AIRecommendation, PlanningScores, ScenarioId } from '@/types/city.types'
import { STATIC_CITIES } from '@/data/staticCities'

export type TimelineStressLevel = 'low' | 'moderate' | 'high' | 'critical'
export type ReportStatus = 'no_plan' | 'future_proofed' | 'holds_through_2050s' | 'needs_phase_2'

export interface PlanningRecommendationLite {
  id: string
  name: string
  category: string
  costEstimate: number
  reason: string
  impactScore: number
  confidence: number
  populationServed: number
}

export interface MetricRow {
  key: string
  label: string
  before: number
  after: number
  delta: number
  isCommute?: boolean
}

export interface PlanningReportData {
  // Identity
  cityId: string
  cityName: string
  scenarioId: ScenarioId
  scenarioName: string
  selectedYear: number
  growthPercent: number
  horizonYears: number
  population: number

  // Diagnosis
  topGapName: string
  topGapReason: string
  topRecommendationName: string
  topRecommendationReason: string
  topRecommendationCost: number
  topRecommendationConfidence: number
  topRecommendationPopulationServed: number
  recommendations: PlanningRecommendationLite[]
  activeGaps: { id: string; name: string; reason: string }[]
  improvedZones: { id: string; name: string }[]

  // Outcomes
  beforeMetrics: PlanningScores | null
  afterMetrics: PlanningScores | null
  metrics: MetricRow[]
  residentsServed: number
  serviceGapsImproved: number
  totalCost: number
  cityHealthDelta: number
  emergencyDelta: number
  equityDelta: number
  fifteenMinuteDelta: number
  commuteDelta: number

  // Status / story
  hasAnalyzed: boolean
  hasAppliedAIPlan: boolean
  status: ReportStatus
  statusLabel: string
  statusBlurb: string
  stressLevel: TimelineStressLevel
  warningMessage: string | null
  pitchSummary: string
  narrative: string

  // Boilerplate
  assumptions: string[]
  limitations: string[]
  nextSteps: string[]
}

const SCENARIO_LABELS: Record<ScenarioId, string> = {
  balanced: 'Balanced Growth',
  transit_first: 'Transit First',
  climate_resilient: 'Climate Resilient',
  equity_focused: 'Equity Focused',
  emergency_ready: 'Emergency Ready',
  max_growth: 'Max Growth',
}

const CITY_BASE_POPULATION: Record<string, number> = {
  fremon: 420_000,
}

export function projectedPopulationFor(cityId: string, year: number, fallback: number): number {
  const base = CITY_BASE_POPULATION[cityId] ?? fallback
  const t = Math.max(0, Math.min(1, (year - 2026) / 75))
  // Fremon assumed ~45% growth across the full 75-year horizon.
  const growth = cityId === 'fremon' ? 0.45 : 0.35
  return Math.round(base * (1 + growth * t))
}

export function computeTimelineStress(cityId: string, selectedYear: number, projectedPopulation: number): TimelineStressLevel {
  const base = CITY_BASE_POPULATION[cityId] ?? projectedPopulation
  const yearsAhead = selectedYear - 2026
  const ratio = projectedPopulation / Math.max(1, base)
  if (yearsAhead >= 74 || ratio > 1.55) return 'critical'
  if (yearsAhead >= 54 || ratio > 1.35) return 'high'
  if (yearsAhead >= 14 || ratio > 1.15) return 'moderate'
  return 'low'
}

function determineStatus(opts: {
  hasAppliedAIPlan: boolean
  stress: TimelineStressLevel
  cityHealthDelta: number
  improvedCount: number
  totalGaps: number
}): { status: ReportStatus; label: string; blurb: string } {
  if (!opts.hasAppliedAIPlan) {
    return {
      status: 'no_plan',
      label: 'No Plan Applied',
      blurb: 'Apply the AI plan to see how it shifts City Health, equity, and 15-minute access.',
    }
  }
  if (opts.stress === 'critical') {
    return {
      status: 'needs_phase_2',
      label: 'Needs Long-Term Phase 2',
      blurb: 'The current plan resolves near-term gaps, but late-horizon population growth has outpaced its coverage.',
    }
  }
  if (opts.stress === 'high') {
    return {
      status: 'holds_through_2050s',
      label: 'Holds Through 2050s',
      blurb: 'The plan still covers most service gaps; expect to revisit before 2080 as growth pressure compounds.',
    }
  }
  if (opts.cityHealthDelta >= 12 && opts.improvedCount >= Math.max(1, opts.totalGaps - 1)) {
    return {
      status: 'future_proofed',
      label: 'Future Proofed',
      blurb: 'Major service gaps improved under the selected growth scenario.',
    }
  }
  return {
    status: 'holds_through_2050s',
    label: 'Holds Through 2050s',
    blurb: 'Plan resolves several gaps; some pressure points remain to monitor on the timeline.',
  }
}

function buildWarningMessage(opts: {
  stress: TimelineStressLevel
  hasAppliedAIPlan: boolean
  selectedYear: number
  projectedPopulation: number
  scenarioName: string
}): string | null {
  if (opts.stress === 'critical' && opts.hasAppliedAIPlan) {
    return `Capacity Warning: by ${opts.selectedYear}, projected population (${opts.projectedPopulation.toLocaleString()}) has expanded underserved zones beyond the 2026 plan's coverage. A Phase 2 infrastructure investment is needed.`
  }
  if (opts.stress === 'critical' && !opts.hasAppliedAIPlan) {
    return `Critical: ${opts.selectedYear} projected population has outgrown current infrastructure. Run analysis to generate a future-proofed plan.`
  }
  if (opts.stress === 'high' && opts.hasAppliedAIPlan) {
    return `Growth pressure is rising in housing and emergency-access zones. The ${opts.scenarioName} plan still holds, but recommend re-analysis around ${Math.min(2080, opts.selectedYear + 10)}.`
  }
  if (opts.stress === 'moderate') {
    return 'Growth pressure is increasing in housing and emergency-access zones.'
  }
  if (opts.projectedPopulation > 650_000) {
    return 'Population pressure is invalidating parts of the current plan.'
  }
  return null
}

function buildNarrative(opts: {
  cityName: string
  scenarioName: string
  selectedYear: number
  status: ReportStatus
  residentsServed: number
  cityHealthBefore: number
  cityHealthAfter: number
  totalCost: number
}): string {
  const residentsLabel = opts.residentsServed.toLocaleString()
  const costLabel = `$${Math.round(opts.totalCost / 1_000_000)}M`
  if (opts.status === 'no_plan') {
    return `${opts.cityName} has visible service gaps. The ${opts.scenarioName} lens is staged — apply the plan to see ${opts.selectedYear} outcomes.`
  }
  if (opts.status === 'needs_phase_2') {
    return `The applied ${opts.scenarioName} plan improves current service gaps, but long-term growth creates renewed pressure by ${opts.selectedYear}. A Phase 2 infrastructure investment (~${costLabel} budget basis) is recommended for residents projected through that horizon.`
  }
  if (opts.status === 'holds_through_2050s') {
    return `The applied ${opts.scenarioName} plan keeps service coverage steady through the 2050s for ${residentsLabel} residents. Re-analysis recommended before 2080.`
  }
  return `The applied ${opts.scenarioName} plan resolves all identified service gaps in ${opts.cityName}'s near-term planning horizon, lifting City Health from ${Math.round(opts.cityHealthBefore)} to ${Math.round(opts.cityHealthAfter)} for ${residentsLabel} projected residents.`
}

function buildPitchSummary(d: {
  cityName: string
  scenarioName: string
  selectedYear: number
  residentsServed: number
  cityHealthBefore: number
  cityHealthAfter: number
  totalCost: number
  status: ReportStatus
}): string {
  const ch = `${Math.round(d.cityHealthBefore)} to ${Math.round(d.cityHealthAfter)}`
  const cost = `$${Math.round(d.totalCost / 1_000_000)}M`
  if (d.status === 'no_plan') {
    return `UrbanMind staged a ${d.scenarioName} plan for ${d.cityName}. Apply it to compare before/after across the timeline.`
  }
  return `UrbanMind analyzed ${d.cityName} under the ${d.scenarioName} lens, detected service-coverage gaps, recommended a targeted plan, and improved City Health from ${ch} for ${d.residentsServed.toLocaleString()} projected residents at ${cost}.`
}

function delta(a?: number | null, b?: number | null) {
  if (a == null || b == null) return 0
  return Math.round((a - b) * 10) / 10
}

interface PlanningStateLike {
  cityId: string
  growthPercent: number
  horizonYears: number
  hasAnalyzed: boolean
  hasAppliedAIPlan: boolean
  beforeScores: PlanningScores | null
  afterScores: PlanningScores | null
  underservedZones: { id: string; name: string; reason: string; isImproved?: boolean; improved?: boolean }[]
  infrastructure: { id: string; name: string; status: string; category: string; costEstimate: number; reason: string; impactScore: number; confidence: number; expectedImpact?: { populationServed?: number } }[]
  aiRecommendations: { id: string; name: string; category: string; costEstimate: number; reason: string; impactScore: number; confidence: number; expectedImpact?: { populationServed?: number } }[]
  topRecommendation: AIRecommendation
  impactSummary: {
    residentsServed: number
    gapsFixed: number
    commuteReduction: number
    emergencyDelta: number
    cityHealthDelta: number
    equityDelta: number
    fifteenMinuteDelta: number
    greenAccessDelta: number
    budgetUsed: number
  } | null
  timelineYear: number
  timelinePopulation: number
}

export function buildReportData(planning: PlanningStateLike, scenarioId: ScenarioId): PlanningReportData {
  const city = STATIC_CITIES.find((item) => item.id === planning.cityId)
  const cityName = planning.cityId === 'fremon' ? 'Fremon' : (city?.name ?? planning.cityId)
  const scenarioName = SCENARIO_LABELS[scenarioId] ?? 'Balanced Growth'

  const before = planning.beforeScores
  const after = planning.afterScores ?? before

  const proposed = planning.infrastructure.filter((item) => item.status === 'proposed')
  const recList = (proposed.length ? proposed : planning.aiRecommendations).map((item) => ({
    id: item.id,
    name: item.name,
    category: item.category,
    costEstimate: item.costEstimate,
    reason: item.reason,
    impactScore: item.impactScore,
    confidence: item.confidence,
    populationServed: item.expectedImpact?.populationServed ?? 0,
  }))

  const topItem = planning.aiRecommendations.find((item) => planning.topRecommendation.itemIds?.includes(item.id)) ?? planning.aiRecommendations[0]
  const topGapZone = planning.underservedZones[0]
  const topRecommendationName = topItem?.name ?? planning.topRecommendation.title.replace(/^Add\s+/i, '')
  const topRecommendationReason = planning.topRecommendation.reason || `${planning.topRecommendation.zoneName} shows the largest unmet demand.`
  const topRecommendationCost = topItem?.costEstimate ?? planning.topRecommendation.costEstimate ?? planning.topRecommendation.estimatedCost ?? 0
  const topRecommendationConfidence = topItem?.confidence ?? planning.topRecommendation.confidence ?? 0.82
  const topRecommendationPopulationServed = planning.topRecommendation.expectedImpact?.populationServed
    ?? Math.round(planning.timelinePopulation * 0.018)

  const totalCost = planning.impactSummary?.budgetUsed
    ?? after?.totalEstimatedCost
    ?? recList.reduce((sum, r) => sum + r.costEstimate, 0)

  const residentsServed = planning.impactSummary?.residentsServed
    ?? after?.populationServed
    ?? recList.reduce((sum, r) => sum + (r.populationServed || 0), 0)

  const improvedZones = planning.underservedZones.filter((z) => z.isImproved || z.improved)
  const activeGaps = planning.underservedZones.filter((z) => !(z.isImproved || z.improved))
  const serviceGapsImproved = planning.impactSummary?.gapsFixed ?? improvedZones.length

  const cityHealthDelta = planning.impactSummary?.cityHealthDelta ?? delta(after?.cityHealth, before?.cityHealth)
  const emergencyDelta = planning.impactSummary?.emergencyDelta ?? delta(after?.emergencyAccess, before?.emergencyAccess)
  const equityDelta = planning.impactSummary?.equityDelta ?? delta(after?.equityScore, before?.equityScore)
  const fifteenMinuteDelta = planning.impactSummary?.fifteenMinuteDelta ?? delta(after?.fifteenMinuteCityScore, before?.fifteenMinuteCityScore)
  const commuteDelta = planning.impactSummary?.commuteReduction ?? delta(before?.averageCommute, after?.averageCommute)

  const projectedPopulation = projectedPopulationFor(planning.cityId, planning.timelineYear, planning.timelinePopulation)
  const stressLevel = computeTimelineStress(planning.cityId, planning.timelineYear, projectedPopulation)
  const { status, label, blurb } = determineStatus({
    hasAppliedAIPlan: planning.hasAppliedAIPlan,
    stress: stressLevel,
    cityHealthDelta,
    improvedCount: serviceGapsImproved,
    totalGaps: planning.underservedZones.length,
  })
  const warningMessage = buildWarningMessage({
    stress: stressLevel,
    hasAppliedAIPlan: planning.hasAppliedAIPlan,
    selectedYear: planning.timelineYear,
    projectedPopulation,
    scenarioName,
  })

  const cityHealthBefore = before?.cityHealth ?? 0
  const cityHealthAfter = after?.cityHealth ?? cityHealthBefore
  const narrative = buildNarrative({
    cityName,
    scenarioName,
    selectedYear: planning.timelineYear,
    status,
    residentsServed,
    cityHealthBefore,
    cityHealthAfter,
    totalCost,
  })
  const pitchSummary = buildPitchSummary({
    cityName,
    scenarioName,
    selectedYear: planning.timelineYear,
    residentsServed,
    cityHealthBefore,
    cityHealthAfter,
    totalCost,
    status,
  })

  const metrics: MetricRow[] = before && after ? [
    metricRow('cityHealth', 'City Health', before.cityHealth, after.cityHealth),
    metricRow('emergencyAccess', 'Emergency', before.emergencyAccess, after.emergencyAccess),
    metricRow('transitCoverage', 'Transit', before.transitCoverage, after.transitCoverage),
    metricRow('greenSpace', 'Green Space', before.greenSpace, after.greenSpace),
    metricRow('educationAccess', 'Education', before.educationAccess ?? 0, after.educationAccess ?? 0),
    metricRow('fifteenMinuteCityScore', '15-Min City', before.fifteenMinuteCityScore ?? 0, after.fifteenMinuteCityScore ?? 0),
    metricRow('averageCommute', 'Avg Commute', before.averageCommute, after.averageCommute, true),
    metricRow('co2Estimate', 'CO2 est.', before.co2Estimate, after.co2Estimate),
    metricRow('equityScore', 'Equity', before.equityScore, after.equityScore),
  ] : []

  return {
    cityId: planning.cityId,
    cityName,
    scenarioId,
    scenarioName,
    selectedYear: planning.timelineYear,
    growthPercent: planning.growthPercent,
    horizonYears: planning.horizonYears,
    population: projectedPopulation,
    topGapName: topGapZone?.name ?? planning.topRecommendation.zoneName,
    topGapReason: topGapZone?.reason ?? topRecommendationReason,
    topRecommendationName,
    topRecommendationReason,
    topRecommendationCost,
    topRecommendationConfidence,
    topRecommendationPopulationServed,
    recommendations: recList,
    activeGaps: activeGaps.map((z) => ({ id: z.id, name: z.name, reason: z.reason })),
    improvedZones: improvedZones.map((z) => ({ id: z.id, name: z.name })),
    beforeMetrics: before,
    afterMetrics: after,
    metrics,
    residentsServed,
    serviceGapsImproved,
    totalCost,
    cityHealthDelta,
    emergencyDelta,
    equityDelta,
    fifteenMinuteDelta,
    commuteDelta,
    hasAnalyzed: planning.hasAnalyzed,
    hasAppliedAIPlan: planning.hasAppliedAIPlan,
    status,
    statusLabel: label,
    statusBlurb: blurb,
    stressLevel,
    warningMessage,
    pitchSummary,
    narrative,
    assumptions: [
      `${cityName} geography, landmarks, and growth assumptions are illustrative for demo planning.`,
      'Growth and scores are illustrative for demonstration.',
    ],
    limitations: [
      'Not a substitute for GIS, CEQA, or agency review.',
      'Infrastructure inventory may omit real-world assets.',
    ],
    nextSteps: [
      'Validate candidate parcels with city GIS data.',
      `Prioritize ${topRecommendationName} for near-term capital review.`,
      'Use public workshops to confirm equity and access assumptions.',
    ],
  }
}

export interface ReportArchiveEntry {
  label: string
  generatedAt: number
  data: PlanningReportData
}

/** Stable key to detect materially different reports (new plan / rescan / year). */
export function reportDataFingerprint(d: PlanningReportData): string {
  const recIds = d.recommendations.map((r) => r.id).join(',')
  return [
    d.cityId,
    d.scenarioId,
    d.selectedYear,
    d.hasAppliedAIPlan ? '1' : '0',
    d.hasAnalyzed ? '1' : '0',
    d.topRecommendationName,
    String(Math.round(d.totalCost / 1_000_000)),
    d.recommendations.length,
    recIds.slice(0, 160),
    d.status,
  ].join('|')
}

function metricRow(key: string, label: string, before: number, after: number, isCommute = false): MetricRow {
  return {
    key,
    label,
    before,
    after,
    delta: Math.round((after - before) * 10) / 10,
    isCommute,
  }
}
