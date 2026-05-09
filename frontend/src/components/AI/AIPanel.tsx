import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FileText, Search, Sparkles } from 'lucide-react'
import { useCityStore } from '@/stores/cityStore'
import { useScenarioStore } from '@/stores/scenarioStore'
import { useSimulationStore } from '@/stores/simulationStore'
import { useTypewriter } from '@/hooks/useTypewriter'

type CopilotStage = 'standby' | 'diagnosed' | 'applied'

export function AIPanel() {
  const selectedCity = useCityStore((state) => state.selectedCity)
  const activeScenario = useScenarioStore((state) => state.activeScenario)
  const { planning, analyzeDemo, applyAIPlan, openReport } = useSimulationStore()
  const topRecommendation = planning.topRecommendation
  const topItem = planning.aiRecommendations.find((item) => topRecommendation.itemIds?.includes(item.id)) ?? planning.aiRecommendations[0]
  const before = planning.beforeScores
  const afterPreview = previewAfterMetrics(planning)

  const stage: CopilotStage = planning.hasAppliedAIPlan
    ? 'applied'
    : planning.hasAnalyzed
      ? 'diagnosed'
      : 'standby'

  const cityName = selectedCity?.name ?? 'this city'
  const narration = useMemo(() => {
    if (stage === 'standby') {
      return `Standing by. Pick a scenario, then I will scan ${cityName} for service-coverage gaps and growth pressure.`
    }
    if (stage === 'applied') {
      const residents = (planning.impactSummary?.residentsServed ?? planning.afterScores?.populationServed ?? 0).toLocaleString()
      const cityHealthAfter = planning.afterScores?.cityHealth ?? '—'
      return `Plan applied. ${residents} residents now reached, City Health at ${cityHealthAfter}. Review the report or scrub the timeline to see how each year unfolds.`
    }
    const reason = topRecommendation.reason || `${topRecommendation.zoneName} shows the largest unmet demand.`
    const target = topItem?.name ?? topRecommendation.title.replace(/^Add\s+/i, '')
    return `Analysis complete for ${cityName}. ${reason} I recommend adding ${target}.`
  }, [stage, cityName, topRecommendation, topItem, planning.impactSummary, planning.afterScores])

  const { output, done } = useTypewriter(narration, { speedMs: 18, startDelayMs: 60 })

  return (
    <div className="p-3">
      <div
        className="rounded-xl p-4 relative overflow-hidden"
        style={{
          background: 'var(--color-bg-panel)',
          border: '1px solid var(--color-border-subtle)',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        <CopilotHeader stage={stage} />
        <p
          className="mt-3 text-sm leading-relaxed min-h-[3.5em]"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          <AnimatePresence mode="wait">
            <motion.span
              key={stage + narration.slice(0, 24)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              {output}
              {!done && <span className="copilot-caret" aria-hidden="true">|</span>}
            </motion.span>
          </AnimatePresence>
        </p>

        {stage === 'standby' && (
          <button
            type="button"
            onClick={() => selectedCity && analyzeDemo(selectedCity.id, activeScenario)}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold"
            style={{ background: 'var(--color-bg-hover)', color: 'var(--color-accent-cyan)', border: '1px solid rgba(var(--rgb-accent), 0.35)' }}
          >
            <Search size={15} />
            Analyze Infrastructure Gaps
          </button>
        )}

        {stage === 'diagnosed' && (
          <>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Impact label="Emergency Access" value={metricRange(before?.emergencyAccess, afterPreview.emergencyAccess)} />
              <Impact label="City Health" value={metricRange(before?.cityHealth, afterPreview.cityHealth)} />
              <Impact label="Equity Score" value={metricRange(before?.equityScore, afterPreview.equityScore)} />
              <Impact label="Commute" value={`${before?.averageCommute ?? '—'} to ${afterPreview.averageCommute} min`} />
              <Impact label="Cost" value={formatMoney(topItem?.costEstimate ?? topRecommendation.costEstimate ?? topRecommendation.estimatedCost)} />
              <Impact label="Confidence" value={`${Math.round((topItem?.confidence ?? topRecommendation.confidence ?? 0.82) * 100)}%`} />
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
                style={{ background: 'var(--color-bg-panel)', color: 'var(--color-accent-cyan)', border: '1px solid rgba(var(--rgb-accent), 0.35)' }}
              >
                Apply Full AI Plan
              </button>
            </div>
          </>
        )}

        {stage === 'applied' && (
          <>
            <div className="mt-4 grid grid-cols-2 gap-2">
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
          </>
        )}
      </div>
    </div>
  )
}

function CopilotHeader({ stage }: { stage: CopilotStage }) {
  const statusLabel = stage === 'standby' ? 'Standby' : stage === 'diagnosed' ? 'Diagnosed' : 'Plan Applied'
  const statusColor =
    stage === 'standby'
      ? 'var(--color-text-muted)'
      : stage === 'diagnosed'
        ? 'var(--color-accent-cyan)'
        : 'var(--color-accent-green)'
  return (
    <div className="flex items-center gap-2.5">
      <div className="relative grid h-8 w-8 place-items-center rounded-full" style={{ background: 'rgba(0,184,148,0.10)', border: '1px solid rgba(0,184,148,0.45)' }}>
        <Sparkles size={15} style={{ color: 'var(--color-accent-green)' }} />
        <span
          className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full"
          style={{ background: statusColor, border: '2px solid var(--color-bg-panel)', boxShadow: `0 0 8px ${statusColor}` }}
        />
      </div>
      <div>
        <div className="font-display text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          UrbanMind Copilot
        </div>
        <div className="font-mono text-[9px] uppercase tracking-widest" style={{ color: statusColor }}>
          {statusLabel}
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
