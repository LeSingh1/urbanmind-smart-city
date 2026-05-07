import { FileText, Search, Sparkles } from 'lucide-react'
import { useCityStore } from '@/stores/cityStore'
import { useScenarioStore } from '@/stores/scenarioStore'
import { useSimulationStore } from '@/stores/simulationStore'

export function RightPanel() {
  const selectedCity = useCityStore((state) => state.selectedCity)
  const activeScenario = useScenarioStore((state) => state.activeScenario)
  const { planning, analyzeDemo, applyAIPlan, openReport } = useSimulationStore()
  const topRecommendation = planning.topRecommendation
  const topItem = planning.aiRecommendations.find((item) => topRecommendation.itemIds?.includes(item.id)) ?? planning.aiRecommendations[0]
  const before = planning.beforeScores
  const afterPreview = previewAfterMetrics(planning)
  const populationServed = topRecommendation.expectedImpact.populationServed ?? Math.round((selectedCity?.population_current ?? planning.timelinePopulation) * 0.018)

  return (
    <aside
      className="w-[300px] shrink-0 overflow-y-auto"
      style={{
        background: 'var(--color-bg-sidebar)',
        borderLeft: '1px solid var(--color-border-subtle)',
        boxShadow: '-16px 0 46px rgba(0,0,0,0.18)',
      }}
    >
      <div className="space-y-3 p-3">
        {!planning.hasAnalyzed ? (
          <section className="rounded-lg p-4" style={{ background: 'var(--color-bg-hover)', border: '1px solid var(--color-border-subtle)' }}>
            <h2 className="font-display text-lg font-semibold leading-tight" style={{ color: 'var(--color-text-primary)' }}>
              Ready to analyze infrastructure gaps
            </h2>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
              Run analysis to identify underserved zones and recommended fixes.
            </p>
            <button
              type="button"
              onClick={() => selectedCity && analyzeDemo(selectedCity.id, activeScenario)}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg px-3 py-3 text-sm font-semibold"
              style={{ background: 'var(--color-bg-panel)', color: 'var(--color-accent-cyan)', border: '1px solid rgba(255,71,87,0.35)', boxShadow: 'var(--shadow-sm)' }}
            >
              <Search size={16} />
              Analyze Infrastructure Gaps
            </button>
          </section>
        ) : (
          <section className="rounded-lg p-4" style={{ background: 'var(--color-bg-hover)', border: '1px solid rgba(255,71,87,0.3)', boxShadow: 'var(--shadow-sm)' }}>
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--color-accent-cyan)' }}>
              <Sparkles size={14} />
              Top Recommendation
            </div>
            {!planning.hasAppliedAIPlan ? (
              <>
                <h2 className="mt-2 font-display text-lg font-semibold leading-tight" style={{ color: 'var(--color-text-primary)' }}>
                  {topRecommendation.zoneName}
                </h2>
                <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                  Add <strong>{topItem?.name ?? topRecommendation.title.replace(/^Add\s+/i, '')}</strong>. {topRecommendation.reason}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Impact label="Emergency Access" value={metricRange(before?.emergencyAccess, afterPreview.emergencyAccess)} />
                  <Impact label="City Health" value={metricRange(before?.cityHealth, afterPreview.cityHealth)} />
                  <Impact label="Equity Score" value={metricRange(before?.equityScore, afterPreview.equityScore)} />
                  <Impact label="Commute" value={`${before?.averageCommute ?? '—'} to ${afterPreview.averageCommute} min`} />
                  <Impact label="Cost" value={formatMoney(topItem?.costEstimate ?? topRecommendation.costEstimate ?? topRecommendation.estimatedCost)} />
                  <Impact label="Confidence" value={`${Math.round((topItem?.confidence ?? topRecommendation.confidence ?? 0.82) * 100)}%`} />
                  <Impact label="Population Served" value={populationServed.toLocaleString()} />
                </div>
                <div className="mt-4 grid gap-2">
                  <button
                    type="button"
                    onClick={() => applyAIPlan(activeScenario)}
                    className="rounded-lg px-3 py-3 text-sm font-semibold"
                    style={{ background: 'rgba(0,184,148,0.09)', color: 'var(--color-accent-green)', border: '1px solid rgba(0,184,148,0.38)' }}
                  >
                    Apply Recommendation
                  </button>
                  <button
                    type="button"
                    onClick={() => applyAIPlan(activeScenario)}
                    className="rounded-lg px-3 py-3 text-sm font-semibold"
                    style={{ background: 'var(--color-bg-panel)', color: 'var(--color-accent-cyan)', border: '1px solid rgba(255,71,87,0.35)' }}
                  >
                    Apply Full AI Plan
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 className="mt-2 font-display text-lg font-semibold" style={{ color: 'var(--color-accent-green)' }}>
                  AI Plan Applied
                </h2>
                <button
                  type="button"
                  onClick={openReport}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg px-3 py-3 text-sm font-semibold"
                  style={{ background: 'var(--color-bg-panel)', color: 'var(--color-accent-purple)', border: '1px solid var(--color-border-subtle)' }}
                >
                  <FileText size={16} />
                  Generate Report
                </button>
              </>
            )}
          </section>
        )}

        {planning.hasAppliedAIPlan && (
          <section className="rounded-lg p-4" style={{ background: 'rgba(0,184,148,0.08)', border: '1px solid rgba(0,184,148,0.32)' }}>
            <div className="font-display text-base font-semibold" style={{ color: 'var(--color-accent-green)' }}>Impact Summary</div>
            <ImpactSummary />
          </section>
        )}

        {planning.placementFeedback && (
          <section className="rounded-lg p-3" style={{
            background: planning.placementFeedback.type === 'invalid' ? 'rgba(225,112,85,0.09)' : planning.placementFeedback.type === 'good' ? 'rgba(0,184,148,0.08)' : 'rgba(108,92,231,0.08)',
            border: planning.placementFeedback.type === 'invalid' ? '1px solid rgba(225,112,85,0.34)' : planning.placementFeedback.type === 'good' ? '1px solid rgba(0,184,148,0.34)' : '1px solid rgba(108,92,231,0.34)',
          }}>
            <div className="text-sm font-semibold" style={{ color: planning.placementFeedback.type === 'good' ? 'var(--color-accent-green)' : 'var(--color-accent-danger)' }}>
              {planning.placementFeedback.title}
            </div>
            <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
              {planning.placementFeedback.message}
            </p>
          </section>
        )}

        {planning.beforeScores && (
          <details>
            <summary className="cursor-pointer font-mono text-[11px] uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>
              Detailed Metrics
            </summary>
            <div className="mt-2 grid gap-2">
              <Metric label="City Health" before={planning.beforeScores.cityHealth} after={planning.afterScores?.cityHealth} />
              <Metric label="Emergency Access" before={planning.beforeScores.emergencyAccess} after={planning.afterScores?.emergencyAccess} />
              <Metric label="Transit Coverage" before={planning.beforeScores.transitCoverage} after={planning.afterScores?.transitCoverage} />
              <Metric label="Green Space" before={planning.beforeScores.greenSpace} after={planning.afterScores?.greenSpace} />
              <Metric label="Equity Score" before={planning.beforeScores.equityScore} after={planning.afterScores?.equityScore} />
              <Metric label="15 Minute City" before={planning.beforeScores.fifteenMinuteCityScore ?? 54} after={planning.afterScores?.fifteenMinuteCityScore} />
              <Metric label="Average Commute" before={planning.beforeScores.averageCommute} after={planning.afterScores?.averageCommute} inverse />
            </div>
          </details>
        )}

        <details>
          <summary className="cursor-pointer font-mono text-[11px] uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>
            Current Gaps
          </summary>
          {planning.hasAnalyzed ? (
            <div className="mt-2 grid gap-2">
              {planning.underservedZones.map((gap) => (
                <div key={gap.id} className="rounded-lg p-3" style={{ background: gap.isImproved ? 'rgba(0,184,148,0.08)' : 'rgba(225,112,85,0.08)', border: gap.isImproved ? '1px solid rgba(0,184,148,0.25)' : '1px solid rgba(225,112,85,0.25)' }}>
                  <div className="flex justify-between gap-2">
                    <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{gap.name}</span>
                    <span className="font-mono text-[10px]" style={{ color: gap.isImproved ? 'var(--color-accent-green)' : 'var(--color-accent-danger)' }}>{gap.isImproved ? 'Improved' : 'Gap'}</span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{gap.reason}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>Run analysis to reveal underserved zones.</p>
          )}
        </details>
      </div>
    </aside>
  )
}

function ImpactSummary() {
  const planning = useSimulationStore((s) => s.planning)
  const summary = planning.impactSummary
  const before = planning.beforeScores
  const after = planning.afterScores ?? before
  const residents = summary?.residentsServed ?? after?.populationServed ?? 0
  const gaps = summary?.gapsFixed ?? planning.underservedZones.filter((zone) => zone.isImproved).length
  const cityHealth = summary?.cityHealthDelta ?? delta(after?.cityHealth, before?.cityHealth)
  const emergency = summary?.emergencyDelta ?? delta(after?.emergencyAccess, before?.emergencyAccess)
  const equity = summary?.equityDelta ?? delta(after?.equityScore, before?.equityScore)
  const fifteen = summary?.fifteenMinuteDelta ?? delta(after?.fifteenMinuteCityScore, before?.fifteenMinuteCityScore)
  const cost = summary?.budgetUsed ?? after?.totalEstimatedCost ?? planning.infrastructure.filter((item) => item.status === 'proposed').reduce((sum, item) => sum + item.costEstimate, 0)
  return (
    <div className="mt-3 grid grid-cols-2 gap-2">
      <Impact label="Residents Served" value={residents.toLocaleString()} />
      <Impact label="Gaps Improved" value={String(gaps)} />
      <Impact label="City Health" value={formatDelta(cityHealth)} />
      <Impact label="Emergency" value={formatDelta(emergency)} />
      <Impact label="Equity Score" value={formatDelta(equity)} />
      <Impact label="15 Min City" value={formatDelta(fifteen)} />
      <Impact label="Total Cost" value={formatMoney(cost)} />
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

function Metric({ label, before, after, inverse = false }: { label: string; before: number; after?: number; inverse?: boolean }) {
  const currentAfter = after ?? before
  const delta = Math.round((currentAfter - before) * 10) / 10
  const improved = inverse ? delta < 0 : delta > 0
  return (
    <div className="rounded-lg p-3" style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border-subtle)' }}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
        <span className="font-mono text-[11px]" style={{ color: Math.abs(delta) < 0.1 ? 'var(--color-text-muted)' : improved ? 'var(--color-accent-green)' : 'var(--color-accent-danger)' }}>
          {delta > 0 ? '+' : ''}{delta}
        </span>
      </div>
      <div className="mt-1 font-mono text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
        {before} <span style={{ color: 'var(--color-text-muted)' }}>to</span> {currentAfter}
      </div>
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
