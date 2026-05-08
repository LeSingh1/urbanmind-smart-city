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
  generateAlerts,
  generateRecommendations,
  pickTopRecommendation,
  type CopilotRecommendation,
  type PlanningAlert,
} from './copilot'
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
