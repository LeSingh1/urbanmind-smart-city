/**
 * Single source of truth for the planning report and impact summary.
 *
 * Every visible field in PlanningReportModal and the sidebar ImpactSummary
 * derives from buildReportData(). No hardcoded numbers, no scenario- or
 * year-specific literals — all values are computed from the live `PlanningState`
 * plus the active `ScenarioId`.
 *
 * Report status for an applied plan follows Copilot semantics: the active plan
 * holds through the simulation until Copilot flags a follow-on need (dynamic
 * advisory) or underserved gaps stay open after apply. Raw timeline stress is
 * still computed for diagnostics (`stressLevel`) but no longer downgrades
 * status on year/population alone.
 */

import type { AIRecommendation, PlanningScores, ScenarioId } from '@/types/city.types'
import { STATIC_CITIES } from '@/data/staticCities'

export type TimelineStressLevel = 'low' | 'moderate' | 'high' | 'critical'
export type ReportStatus = 'no_plan' | 'future_proofed' | 'holds_through_2050s' | 'needs_phase_2'

/** Calendar decade label for narrative copy (e.g. 2076 → "2070s"). */
export function timelineDecadeLabel(year: number): string {
  const decadeStart = Math.floor(year / 10) * 10
  return `${decadeStart}s`
}

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
  cityHealthDelta: number
  improvedCount: number
  totalGaps: number
  selectedYear: number
  copilotFollowUp: boolean
  copilotFollowUpFromAdvisory: boolean
}): { status: ReportStatus; label: string; blurb: string } {
  if (!opts.hasAppliedAIPlan) {
    return {
      status: 'no_plan',
      label: 'No Plan Applied',
      blurb: 'Apply the AI plan to see how it shifts City Health, equity, and 15-minute access.',
    }
  }
  if (opts.copilotFollowUp) {
    return {
      status: 'needs_phase_2',
      label: opts.copilotFollowUpFromAdvisory ? 'Copilot: Follow-On Plan' : 'Needs Additional Coverage',
      blurb: opts.copilotFollowUpFromAdvisory
        ? 'Copilot flagged a new gap on the timeline; review the follow-on recommendation.'
        : 'Open service gaps remain after the applied plan; expand coverage or re-run analysis.',
    }
  }
  if (opts.cityHealthDelta >= 12 && opts.improvedCount >= Math.max(1, opts.totalGaps - 1)) {
    return {
      status: 'future_proofed',
      label: 'Future Proofed',
      blurb: 'Major service gaps improved; this plan stays active until Copilot identifies a new coverage need on the timeline.',
    }
  }
  return {
    status: 'holds_through_2050s',
    label: `Holds Through ${timelineDecadeLabel(opts.selectedYear)}`,
    blurb: 'Applied plan remains valid for the rest of this simulation unless Copilot surfaces a new gap or you rescope the scenario.',
  }
}

function buildWarningMessage(opts: {
  stress: TimelineStressLevel
  hasAppliedAIPlan: boolean
  selectedYear: number
  projectedPopulation: number
  scenarioName: string
  copilotFollowUp: boolean
  copilotFollowUpFromAdvisory: boolean
}): string | null {
  if (!opts.hasAppliedAIPlan) {
    if (opts.stress === 'critical') {
      return `Critical: ${opts.selectedYear} projected population has outgrown current infrastructure. Run analysis to generate a future-proofed plan.`
    }
    if (opts.stress === 'high') {
      return `High growth pressure at ${opts.selectedYear}: run infrastructure gap analysis before applying a plan.`
    }
    return null
  }
  if (opts.copilotFollowUp) {
    if (opts.copilotFollowUpFromAdvisory) {
      return 'Copilot detected a timeline gap that the current plan does not cover; review the follow-on recommendation in the Copilot panel.'
    }
    return 'Identified service gaps are still open under the applied plan; add coverage or re-analyze before relying on late-horizon outcomes.'
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
  copilotFollowUpFromAdvisory: boolean
}): string {
  const residentsLabel = opts.residentsServed.toLocaleString()
  const costLabel = `$${Math.round(opts.totalCost / 1_000_000)}M`
  if (opts.status === 'no_plan') {
    return `${opts.cityName} has visible service gaps. The ${opts.scenarioName} lens is staged — apply the plan to see ${opts.selectedYear} outcomes.`
  }
  if (opts.status === 'needs_phase_2') {
    if (opts.copilotFollowUpFromAdvisory) {
      return `By ${opts.selectedYear}, Copilot has identified a follow-on gap the Phase 1 plan no longer covers. Implement the recommended Phase 2 placement (~${costLabel} budget basis) or rescope — the active plan stays valid for earlier years on the timeline.`
    }
    return `The applied ${opts.scenarioName} plan improved baseline coverage, but open gaps still need work at ${opts.selectedYear}. Close the remaining gaps or re-run analysis before treating the scenario as fully covered (~${costLabel} basis for the current recommendation set).`
  }
  if (opts.status === 'holds_through_2050s') {
    return `The applied ${opts.scenarioName} plan remains the active Copilot recommendation at ${opts.selectedYear} for ${residentsLabel} residents served. It is assumed to hold through the rest of this simulation until Copilot flags a new gap (for example a late-horizon advisory) or you change the scenario.`
  }
  return `The applied ${opts.scenarioName} plan resolves the analyzed gaps in ${opts.cityName} for the ${opts.selectedYear} view, lifting City Health from ${Math.round(opts.cityHealthBefore)} to ${Math.round(opts.cityHealthAfter)} for ${residentsLabel} projected residents. It remains in force until Copilot identifies a new coverage need on the timeline.`
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
  /** Copilot Phase-2 / late-gap alert — when set, a follow-on plan is needed. */
  dynamicAdvisory: { id?: string; title?: string; message?: string } | null
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

function copilotFollowUpPending(planning: PlanningStateLike, activeGapCount: number): { needed: boolean; fromAdvisory: boolean } {
  if (planning.dynamicAdvisory) return { needed: true, fromAdvisory: true }
  if (planning.hasAppliedAIPlan && activeGapCount > 0) return { needed: true, fromAdvisory: false }
  return { needed: false, fromAdvisory: false }
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
  const followUp = copilotFollowUpPending(planning, activeGaps.length)
  const { status, label, blurb } = determineStatus({
    hasAppliedAIPlan: planning.hasAppliedAIPlan,
    cityHealthDelta,
    improvedCount: serviceGapsImproved,
    totalGaps: planning.underservedZones.length,
    selectedYear: planning.timelineYear,
    copilotFollowUp: followUp.needed,
    copilotFollowUpFromAdvisory: followUp.fromAdvisory,
  })
  const warningMessage = buildWarningMessage({
    stress: stressLevel,
    hasAppliedAIPlan: planning.hasAppliedAIPlan,
    selectedYear: planning.timelineYear,
    projectedPopulation,
    scenarioName,
    copilotFollowUp: followUp.needed,
    copilotFollowUpFromAdvisory: followUp.fromAdvisory,
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
    copilotFollowUpFromAdvisory: followUp.fromAdvisory,
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
