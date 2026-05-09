/**
 * One-call entry that runs Layer 1 -> Layer 2 -> Layer 3 for Fremon and
 * returns adapted output ready to drop into simulationStore.
 *
 * The store toggles use of this pipeline via a `useEngine` flag so the
 * legacy hardcoded path remains intact for non-Fremon cities and as a
 * safety fallback.
 */

import { runGapAnalysis } from '@/engine/gapEngine'
import { FREMON_ENGINE_DISTRICTS } from '@/data/fremonDistricts'
import { FREMON_TERRAIN } from '@/data/fremonTerrain'
import {
  buildTemplatePlanningRationale,
  generateAlerts,
  generateRecommendations,
  pickTopRecommendation,
  type CopilotRecommendation,
  type PlanningAlert,
} from './copilot'
import { bodyForRecommendation, fetchPlanningRationale, scenarioIdToGoal } from './rationaleApi'
import type { ScenarioId } from '@/types/city.types'
import {
  toInfrastructureItem,
  toTopAIRecommendation,
  toUnderservedZones,
} from './adapter'
import type { AIRecommendation, InfrastructureItem, UnderservedZone } from '@/types/city.types'
import type { DistrictGapReport } from '@/engine/types'

export interface FremonEngineBundle {
  reports: DistrictGapReport[]
  alerts: PlanningAlert[]
  recommendations: CopilotRecommendation[]
  validatedRecommendations: CopilotRecommendation[]
  failedRecommendations: CopilotRecommendation[]
  /** Adapter output for legacy store consumers. */
  aiRecommendations: InfrastructureItem[]
  underservedZones: UnderservedZone[]
  topRecommendation: AIRecommendation | null
}

export function runFremonEnginePipeline(): FremonEngineBundle {
  const reports = runGapAnalysis(FREMON_ENGINE_DISTRICTS)
  const alerts = generateAlerts(reports)
  const recommendations = generateRecommendations(reports, FREMON_ENGINE_DISTRICTS, FREMON_TERRAIN)
  const validated = recommendations.filter((r) => r.validationStatus === 'passed')
  const failed = recommendations.filter((r) => r.validationStatus === 'failed')
  const top = pickTopRecommendation(recommendations)

  // Only validated recommendations adapt into the live store. Failed ones are
  // logged for debugging via the validation reasons but never enter map state.
  const aiRecommendations = validated.map(toInfrastructureItem)
  const underservedZones = toUnderservedZones(reports, FREMON_ENGINE_DISTRICTS)
  const topRecommendation = top && top.validationStatus === 'passed' ? toTopAIRecommendation(top) : null

  if (failed.length > 0 && typeof console !== 'undefined') {
    console.warn(
      '[UrbanMind] %d recommendation(s) failed validation:',
      failed.length,
      failed.map((r) => ({ id: r.id, reasons: r.validationReasons })),
    )
  }
  return {
    reports,
    alerts,
    recommendations,
    validatedRecommendations: validated,
    failedRecommendations: failed,
    aiRecommendations,
    underservedZones,
    topRecommendation,
  }
}

async function enrichRecommendationsWithBackendRationale(
  recommendations: CopilotRecommendation[],
  reports: DistrictGapReport[],
  scenarioGoal: string,
): Promise<void> {
  const reportByDistrict = new Map(reports.map((r) => [r.districtId, r]))
  const toEnrich = recommendations.filter((r) => r.validationStatus !== 'failed')
  await Promise.all(
    toEnrich.map(async (rec) => {
      const report = reportByDistrict.get(rec.sourceDistrictId)
      if (!report) return
      const template = buildTemplatePlanningRationale(report, rec.infrastructureType, rec.populationServed)
      const body = bodyForRecommendation(rec, report, template, scenarioGoal)
      const text = await fetchPlanningRationale(body)
      if (text) rec.rationale = text
    }),
  )
}

/** Same as {@link runFremonEnginePipeline} but enriches rationales via `POST /ai/planning-rationale` when the API is available. */
export async function runFremonEnginePipelineAsync(scenarioId: ScenarioId): Promise<FremonEngineBundle> {
  const bundle = runFremonEnginePipeline()
  const goal = scenarioIdToGoal(scenarioId)
  try {
    await enrichRecommendationsWithBackendRationale(bundle.recommendations, bundle.reports, goal)
  } catch (err) {
    if (typeof console !== 'undefined') {
      console.warn('[UrbanMind] Backend rationale enrichment skipped:', err)
    }
  }
  const validated = bundle.recommendations.filter((r) => r.validationStatus === 'passed')
  const failed = bundle.recommendations.filter((r) => r.validationStatus === 'failed')
  const top = pickTopRecommendation(bundle.recommendations)
  bundle.validatedRecommendations = validated
  bundle.failedRecommendations = failed
  bundle.aiRecommendations = validated.map(toInfrastructureItem)
  bundle.topRecommendation = top && top.validationStatus === 'passed' ? toTopAIRecommendation(top) : null
  return bundle
}
