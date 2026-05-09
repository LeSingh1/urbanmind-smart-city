/**
 * Phase 2.5 — Planning rationale from backend (optional LLM).
 * API keys stay on the server; failures fall back to caller-provided template text.
 */

import type { DistrictGapReport } from '@/engine/types'
import type { ScenarioId } from '@/types/city.types'
import type { CopilotRecommendation } from './copilot'

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api'

const SCENARIO_GOALS: Record<ScenarioId, string> = {
  balanced: 'Balanced sustainable growth across housing, mobility, environment, and equity.',
  max_growth: 'Maximize housing supply and economic growth; accept higher infrastructure pressure.',
  climate_resilient: 'Prioritize emissions reduction, green space, heat-risk mitigation, and flood resilience.',
  equity_focused: 'Prioritize underserved districts, school access, healthcare coverage, and fairness.',
  transit_first: 'Prioritize transit connectivity, walkability, and commute reduction.',
  emergency_ready: 'Prioritize emergency response, hospital/clinic coverage, and public safety infrastructure.',
}

export function scenarioIdToGoal(id: ScenarioId): string {
  return SCENARIO_GOALS[id] ?? SCENARIO_GOALS.balanced
}

export interface PlanningRationaleBody {
  district_name: string
  largest_gap_type: string
  infrastructure_type: string
  population_served: number
  fifteen_minute_city_score: number
  template_rationale: string
  scenario_goal: string
}

export async function fetchPlanningRationale(body: PlanningRationaleBody): Promise<string | null> {
  try {
    const controller = new AbortController()
    const t = globalThis.setTimeout(() => controller.abort(), 12_000)
    const res = await fetch(`${API_BASE}/ai/planning-rationale`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    globalThis.clearTimeout(t)
    if (!res.ok) return null
    const data = (await res.json()) as { rationale?: string }
    const text = data.rationale?.trim()
    return text && text.length > 0 ? text : null
  } catch {
    return null
  }
}

/** Build POST body; caller supplies template fallback string. */
export function bodyForRecommendation(
  rec: CopilotRecommendation,
  report: DistrictGapReport,
  templateRationale: string,
  scenarioGoal: string,
): PlanningRationaleBody {
  return {
    district_name: rec.sourceDistrictName,
    largest_gap_type: report.largestGap.type,
    infrastructure_type: rec.infrastructureType,
    population_served: rec.populationServed,
    fifteen_minute_city_score: report.scores.fifteenMinuteCityScore,
    template_rationale: templateRationale,
    scenario_goal: scenarioGoal,
  }
}
