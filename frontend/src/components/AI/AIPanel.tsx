import { FileText, Search, Sparkles } from 'lucide-react'
import { useCityStore } from '@/stores/cityStore'
import { useScenarioStore } from '@/stores/scenarioStore'
import { useSimulationStore } from '@/stores/simulationStore'

export function AIPanel() {
  const selectedCity = useCityStore((state) => state.selectedCity)
  const activeScenario = useScenarioStore((state) => state.activeScenario)
  const { planning, analyzeDemo, applyAIPlan, openReport } = useSimulationStore()
  const topRecommendation = planning.topRecommendation
  const topItem = planning.aiRecommendations.find((item) => topRecommendation.itemIds?.includes(item.id)) ?? planning.aiRecommendations[0]
  const before = planning.beforeScores
  const afterPreview = previewAfterMetrics(planning)

  if (!planning.hasAnalyzed) {
    return (
      <div className="p-3">
        <div className="rounded-lg p-4" style={{ background: 'var(--color-bg-hover)', border: '1px solid var(--color-border-subtle)' }}>
          <div className="font-display text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            Ready to analyze infrastructure gaps
          </div>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
            Run analysis to identify underserved zones and recommended fixes.
          </p>
          <button
            type="button"
            onClick={() => selectedCity && analyzeDemo(selectedCity.id, activeScenario)}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold"
            style={{ background: 'var(--color-bg-panel)', color: 'var(--color-accent-cyan)', border: '1px solid rgba(255,71,87,0.35)' }}
          >
            <Search size={15} />
            Analyze Infrastructure Gaps
          </button>
        </div>
      </div>
    )
  }

  if (planning.hasAppliedAIPlan) {
    return (
      <div className="p-3">
        <div className="rounded-lg p-4" style={{ background: 'rgba(0,184,148,0.08)', border: '1px solid rgba(0,184,148,0.32)' }}>
          <div className="flex items-center gap-2 font-display text-base font-semibold" style={{ color: 'var(--color-accent-green)' }}>
            <Sparkles size={17} />
            AI Plan Applied
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Impact label="Residents Served" value={(planning.impactSummary?.residentsServed ?? planning.afterScores?.populationServed ?? 0).toLocaleString()} />
            <Impact label="Gaps Improved" value={String(planning.impactSummary?.gapsFixed ?? planning.underservedZones.filter((zone) => zone.isImproved).length)} />
            <Impact label="City Health" value={formatDelta(planning.impactSummary?.cityHealthDelta ?? delta(planning.afterScores?.cityHealth, planning.beforeScores?.cityHealth))} />
            <Impact label="Emergency" value={formatDelta(planning.impactSummary?.emergencyDelta ?? delta(planning.afterScores?.emergencyAccess, planning.beforeScores?.emergencyAccess))} />
            <Impact label="Equity" value={formatDelta(planning.impactSummary?.equityDelta ?? delta(planning.afterScores?.equityScore, planning.beforeScores?.equityScore))} />
            <Impact label="15 Min City" value={formatDelta(planning.impactSummary?.fifteenMinuteDelta ?? delta(planning.afterScores?.fifteenMinuteCityScore, planning.beforeScores?.fifteenMinuteCityScore))} />
          </div>
          <button
            type="button"
            onClick={openReport}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold"
            style={{ background: 'var(--color-bg-panel)', color: 'var(--color-accent-purple)', border: '1px solid var(--color-border-subtle)' }}
          >
            <FileText size={15} />
            Generate Report
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-3">
      <div className="rounded-lg p-4" style={{ background: 'var(--color-bg-hover)', border: '1px solid rgba(255,71,87,0.32)', boxShadow: 'var(--shadow-sm)' }}>
        <div className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--color-accent-cyan)' }}>
          Top Problem
        </div>
        <div className="mt-1 font-display text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          {topRecommendation.zoneName}
        </div>
        <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
          Recommendation: Add {topItem?.name ?? topRecommendation.title.replace(/^Add\s+/i, '')}.
        </p>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
          {topRecommendation.reason}
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Impact label="Emergency Access" value={metricRange(before?.emergencyAccess, afterPreview.emergencyAccess)} />
          <Impact label="City Health" value={metricRange(before?.cityHealth, afterPreview.cityHealth)} />
          <Impact label="Equity Score" value={metricRange(before?.equityScore, afterPreview.equityScore)} />
          <Impact label="Commute" value={`${before?.averageCommute ?? '—'} to ${afterPreview.averageCommute} min`} />
          <Impact label="Cost" value={formatMoney(topItem?.costEstimate ?? topRecommendation.costEstimate ?? topRecommendation.estimatedCost)} />
          <Impact label="Confidence" value={`${Math.round((topItem?.confidence ?? topRecommendation.confidence ?? 0.82) * 100)}%`} />
          <Impact label="Population Served" value={(topRecommendation.expectedImpact.populationServed ?? Math.round((selectedCity?.population_current ?? planning.timelinePopulation) * 0.018)).toLocaleString()} />
        </div>
        <div className="mt-4 grid gap-2">
          <button
            type="button"
            onClick={() => applyAIPlan(activeScenario)}
            className="rounded-lg px-3 py-2.5 text-sm font-semibold"
            style={{ background: 'rgba(0,184,148,0.09)', color: 'var(--color-accent-green)', border: '1px solid rgba(0,184,148,0.38)' }}
          >
            Apply Recommendation
          </button>
          <button
            type="button"
            onClick={() => applyAIPlan(activeScenario)}
            className="rounded-lg px-3 py-2.5 text-sm font-semibold"
            style={{ background: 'var(--color-bg-panel)', color: 'var(--color-accent-cyan)', border: '1px solid rgba(255,71,87,0.35)' }}
          >
            Apply Full AI Plan
          </button>
        </div>
      </div>
    </div>
  )
}

function Impact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg p-2" style={{ background: 'rgba(255,255,255,0.32)', border: '1px solid var(--color-border-subtle)' }}>
      <div className="font-mono text-[9px] uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>{label}</div>
      <div className="mt-1 font-mono text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>{value}</div>
    </div>
  )
}

function previewAfterMetrics(planning: ReturnType<typeof useSimulationStore.getState>['planning']) {
  const before = planning.beforeScores
  const impact = planning.topRecommendation.expectedImpact
  return {
    emergencyAccess: clampMetric((before?.emergencyAccess ?? 0) + (impact.emergencyAccess ?? 8)),
    cityHealth: clampMetric((before?.cityHealth ?? 0) + (impact.cityHealth ?? 8)),
    equityScore: clampMetric((before?.equityScore ?? 0) + (impact.equityScore ?? 6)),
    averageCommute: Math.max(12, Math.round((before?.averageCommute ?? 42) + (impact.averageResponseTime ?? -3))),
  }
}

function clampMetric(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function metricRange(before?: number, after?: number) {
  return `${before ?? '—'} to ${after ?? '—'}`
}

function delta(after?: number, before?: number) {
  if (typeof after !== 'number' || typeof before !== 'number') return 0
  return Math.round(after - before)
}

function formatDelta(value: number) {
  return `${value > 0 ? '+' : ''}${value}`
}

function formatMoney(value?: number) {
  if (!value) return '$0M'
  return `$${Math.round(value / 1_000_000)}M`
}
