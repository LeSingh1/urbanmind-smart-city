import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FileText, Search, Sparkles, TriangleAlert } from 'lucide-react'
import { CopilotAdvisoryAlert } from '@/components/UI/CopilotAdvisoryAlert'
import { useCityStore } from '@/stores/cityStore'
import { useScenarioStore } from '@/stores/scenarioStore'
import { useSimulationStore } from '@/stores/simulationStore'
import { useTypewriter } from '@/hooks/useTypewriter'
import { buildReportData, suggestedRevisitYear, timelineDecadeLabel } from '@/state/buildReportData'

type CopilotStage = 'standby' | 'diagnosed' | 'applied'

// Phase 2 — Copilot Thinking Sequence. Honest copy paced for legibility,
// runs in parallel with the deterministic engine.
const THINKING_STEPS = [
  'Analyzing city growth...',
  'Mapping underserved zones...',
  'Ranking infrastructure gaps...',
  'Preparing recommendation...',
] as const

import type { ScenarioId } from '@/types/city.types'

const SCENARIO_LENS: Record<ScenarioId, { label: string; focus: string; priority: string; appliedNote: string }> = {
  balanced: {
    label: 'Balanced Growth',
    focus: 'service-coverage gaps and growth pressure',
    priority: 'I am weighing access, commute, and green space evenly.',
    appliedNote: 'Open the report or scrub the timeline to watch each year unfold.',
  },
  transit_first: {
    label: 'Transit First',
    focus: 'mobility gaps and commute chokepoints',
    priority: 'I am weighting transit hubs, rail access, and commute reduction first.',
    appliedNote: 'Commute and CO2 should improve fastest under this lens.',
  },
  climate_resilient: {
    label: 'Climate Resilient',
    focus: 'green-space gaps, CO2 hot spots, and heat-risk corridors',
    priority: 'I am prioritizing parks, tree corridors, and CO2 reduction.',
    appliedNote: 'Watch CO2 and green-space coverage rise across the timeline.',
  },
  equity_focused: {
    label: 'Equity Focused',
    focus: 'underserved zones, school access, and emergency response gaps',
    priority: 'I am surfacing the most underserved districts first.',
    appliedNote: 'Equity score and underserved-zone coverage should rise sharply.',
  },
  emergency_ready: {
    label: 'Emergency Ready',
    focus: 'emergency response time, fire and clinic coverage gaps',
    priority: 'I am weighting clinics, fire, police, and response coverage.',
    appliedNote: 'Emergency response time should drop quickly under this plan.',
  },
  max_growth: {
    label: 'Max Growth',
    focus: 'housing pressure and land-use throughput',
    priority: 'I am prioritizing housing capacity and supporting services.',
    appliedNote: 'Population capacity rises fastest, watch commute as it does.',
  },
}

export function RightPanel() {
  const selectedCity = useCityStore((state) => state.selectedCity)
  const activeScenario = useScenarioStore((state) => state.activeScenario)
  const { planning, analyzeDemo, applyAIPlan, applyDynamicAdvisoryPlan, openReport, focusRecommendation, acknowledgeDynamicAdvisory } = useSimulationStore()
  const topRecommendation = planning.topRecommendation
  const topItem = planning.aiRecommendations.find((item) => topRecommendation.itemIds?.includes(item.id)) ?? planning.aiRecommendations[0]
  const before = planning.beforeScores
  const afterPreview = previewAfterMetrics(planning)
  const populationServed = topRecommendation.expectedImpact.populationServed ?? Math.round((selectedCity?.population_current ?? planning.timelinePopulation) * 0.018)

  // One-shot Impact Summary shine sweep when the apply-plan flag flips true.
  const [justApplied, setJustApplied] = useState(false)
  const wasApplied = useRef(planning.hasAppliedAIPlan)
  useEffect(() => {
    if (planning.hasAppliedAIPlan && !wasApplied.current) {
      setJustApplied(true)
      const t = setTimeout(() => setJustApplied(false), 1100)
      wasApplied.current = true
      return () => clearTimeout(t)
    }
    wasApplied.current = planning.hasAppliedAIPlan
  }, [planning.hasAppliedAIPlan])

  const [thinkingStep, setThinkingStep] = useState<number | null>(null)
  const thinkingTimers = useRef<ReturnType<typeof setTimeout>[]>([])
  const lastAnalyzedScenario = useRef<ScenarioId | null>(null)
  const clearThinkingTimers = useCallback(() => {
    thinkingTimers.current.forEach((t) => clearTimeout(t))
    thinkingTimers.current = []
  }, [])
  useEffect(() => () => clearThinkingTimers(), [clearThinkingTimers])
  const handleAnalyze = useCallback(() => {
    if (!selectedCity) return
    clearThinkingTimers()
    const fullSequence = !planning.hasAnalyzed || lastAnalyzedScenario.current !== activeScenario
    lastAnalyzedScenario.current = activeScenario
    if (fullSequence) {
      setThinkingStep(0)
      thinkingTimers.current.push(setTimeout(() => setThinkingStep(1), 250))
      thinkingTimers.current.push(setTimeout(() => setThinkingStep(2), 500))
      thinkingTimers.current.push(setTimeout(() => setThinkingStep(3), 750))
    } else {
      setThinkingStep(THINKING_STEPS.length - 1)
      thinkingTimers.current.push(setTimeout(() => setThinkingStep(null), 400))
    }
    void analyzeDemo(selectedCity.id, activeScenario).finally(() => {
      clearThinkingTimers()
      setThinkingStep(null)
    })
  }, [activeScenario, analyzeDemo, clearThinkingTimers, planning.hasAnalyzed, selectedCity])
  const isThinking = thinkingStep !== null
  const stage: CopilotStage = isThinking
    ? 'standby'
    : planning.hasAppliedAIPlan ? 'applied' : planning.hasAnalyzed ? 'diagnosed' : 'standby'
  const cityName = selectedCity?.name ?? 'this city'
  const scenarioLens = SCENARIO_LENS[activeScenario]
  const reportData = useMemo(() => buildReportData(planning, activeScenario), [planning, activeScenario])
  const stressWarning = reportData.warningMessage
  const stressLevel = reportData.stressLevel
  const narration = useMemo(() => {
    if (isThinking) {
      return THINKING_STEPS[thinkingStep ?? 0] ?? THINKING_STEPS[THINKING_STEPS.length - 1]
    }
    if (stage === 'standby') {
      return `Standing by under the ${scenarioLens.label} lens — I will scan ${cityName} for ${scenarioLens.focus} when you press analyze.`
    }
    if (planning.dynamicAdvisory) {
      return planning.dynamicAdvisory.message
    }
    if (stage === 'applied') {
      const residents = reportData.residentsServed.toLocaleString()
      const cityHealthAfter = Math.round(reportData.afterMetrics?.cityHealth ?? 0)
      const horizonNote = reportData.status === 'needs_phase_2'
        ? ` But by ${reportData.selectedYear} the plan no longer covers projected demand — Phase 2 is needed.`
        : reportData.status === 'holds_through_2050s'
          ? ` Plan holds through the ${timelineDecadeLabel(reportData.selectedYear)}; recommend re-analysis before ${suggestedRevisitYear(reportData.selectedYear)}.`
          : ''
      return `${scenarioLens.label} plan applied. ${residents} residents now reached, City Health at ${cityHealthAfter}.${horizonNote} ${scenarioLens.appliedNote}`
    }
    const reason = topRecommendation.reason || `${topRecommendation.zoneName} shows the largest unmet demand.`
    const target = topItem?.name ?? topRecommendation.title.replace(/^Add\s+/i, '')
    return `Analysis complete for ${cityName} under the ${scenarioLens.label} lens. ${scenarioLens.priority} ${reason} I recommend adding ${target}.`
  }, [isThinking, thinkingStep, stage, cityName, scenarioLens, topRecommendation, topItem, reportData, planning.dynamicAdvisory])
  const { output: copilotText, done: copilotDone } = useTypewriter(narration, { speedMs: 16, startDelayMs: 60 })

  return (
    <aside
      className="w-[300px] shrink-0 overflow-y-auto"
      style={{
        background: 'var(--color-bg-sidebar)',
        borderLeft: '1px solid var(--color-border-subtle)',
        boxShadow: '-16px 0 46px rgba(0,0,0,0.18)',
      }}
    >
      <div className="space-y-2 p-2.5">
        <CopilotHeader stage={stage} />
        {planning.dynamicAdvisory ? (
          <CopilotAdvisoryAlert
            advisory={planning.dynamicAdvisory}
            density="compact"
            onReview={() => {
              acknowledgeDynamicAdvisory()
              focusRecommendation(planning.dynamicAdvisory?.recommendationId ?? null)
            }}
            onApply={() => applyDynamicAdvisoryPlan(activeScenario)}
          />
        ) : null}
        <p className="text-[13px] leading-snug min-h-[3em]" style={{ color: 'var(--color-text-secondary)' }}>
          <AnimatePresence mode="wait">
            <motion.span
              key={stage + narration.slice(0, 18)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              {copilotText}
              {!copilotDone && <span className="copilot-caret" aria-hidden="true">|</span>}
            </motion.span>
          </AnimatePresence>
        </p>

        {stressWarning && (stressLevel === 'high' || stressLevel === 'critical') ? (
          <div
            className="flex items-start gap-2 rounded-lg p-2.5"
            style={{
              background: stressLevel === 'critical' ? 'rgba(245,158,11,0.10)' : 'rgba(245,158,11,0.06)',
              border: `1px solid ${stressLevel === 'critical' ? 'rgba(245,158,11,0.45)' : 'rgba(245,158,11,0.28)'}`,
            }}
          >
            <TriangleAlert size={14} style={{ color: 'var(--color-accent-warning)', flexShrink: 0, marginTop: 1 }} />
            <div className="min-w-0">
              <div className="font-mono text-[9px] uppercase tracking-widest" style={{ color: 'var(--color-accent-warning)' }}>
                {stressLevel === 'critical' ? 'Capacity Warning' : 'Growth Pressure'}
              </div>
              <p className="text-[11px] leading-relaxed mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                {stressWarning}
              </p>
            </div>
          </div>
        ) : null}

        {!planning.hasAnalyzed ? (
          <section className="rounded-lg p-4" style={{ background: 'var(--color-bg-hover)', border: '1px solid var(--color-border-subtle)' }}>
            <button
              type="button"
              onClick={handleAnalyze}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg px-3 py-3 text-sm font-semibold"
              style={{ background: 'var(--color-bg-panel)', color: 'var(--color-accent-cyan)', border: '1px solid rgba(var(--rgb-accent), 0.35)', boxShadow: 'var(--shadow-sm)' }}
            >
              <Search size={16} />
              Analyze Infrastructure Gaps
            </button>
          </section>
        ) : (
          <section className="rounded-lg p-4" style={{ background: 'var(--color-bg-hover)', border: '1px solid rgba(var(--rgb-accent), 0.22)', boxShadow: 'var(--shadow-sm)' }}>
            <div className="flex items-center justify-between gap-2 font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--color-accent-cyan)' }}>
              <span className="inline-flex items-center gap-2"><Sparkles size={14} />Top Recommendation</span>
              {planning.useEngine && (
                <span
                  className="rounded-full px-2 py-0.5"
                  style={{ color: 'var(--color-accent-green)', border: '1px solid rgba(0,184,148,0.4)', background: 'rgba(0,184,148,0.08)' }}
                  title="Recommendation passed all 12 deterministic validation checks"
                >
                  Validated
                </span>
              )}
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
                {planning.aiRecommendations.length > 1 && (
                  <div className="mt-3">
                    <div className="font-mono text-[10px] uppercase tracking-widest mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                      All Recommendations
                    </div>
                    <div className="grid gap-1.5">
                      {planning.aiRecommendations.slice(0, 6).map((rec) => {
                        const focused = planning.focusedRecommendationId === rec.id
                        return (
                          <button
                            key={rec.id}
                            type="button"
                            onMouseEnter={() => focusRecommendation(rec.id)}
                            onMouseLeave={() => focusRecommendation(null)}
                            onClick={() => focusRecommendation(rec.id)}
                            className="rounded-md px-2 py-1.5 text-left text-xs transition-colors"
                            style={{
                              background: focused ? 'rgba(var(--rgb-accent), 0.10)' : 'var(--color-bg-card)',
                              border: `1px solid ${focused ? 'rgba(var(--rgb-accent), 0.45)' : 'var(--color-border-subtle)'}`,
                              boxShadow: focused ? '0 0 0 2px rgba(var(--rgb-accent), 0.15)' : 'none',
                              color: 'var(--color-text-secondary)',
                            }}
                          >
                            <div className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{rec.name}</div>
                            <div className="font-mono text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                              {rec.category.replace(/_/g, ' ')} · ${(rec.costEstimate / 1_000_000).toFixed(0)}M · {Math.round(rec.confidence * 100)}%
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
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
                    style={{ background: 'var(--color-bg-panel)', color: 'var(--color-accent-cyan)', border: '1px solid rgba(var(--rgb-accent), 0.35)' }}
                  >
                    Apply Full AI Plan
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 className="mt-2 font-display text-lg font-semibold" style={{ color: 'var(--color-accent-green)' }}>
                  Plan Applied Successfully
                </h2>
                <p className="mt-2 text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                  {selectedCity?.name ?? 'This city'} is now closer to 15-minute city compliance.
                </p>
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
          <section className={`rounded-lg p-4 ${justApplied ? 'impact-summary-sweep' : ''}`} style={{ background: 'rgba(0,184,148,0.08)', border: '1px solid rgba(0,184,148,0.32)' }}>
            <div className="flex items-center justify-between">
              <div className="font-display text-base font-semibold" style={{ color: 'var(--color-accent-green)' }}>Impact Summary</div>
              <span
                className="rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest"
                style={{
                  color: reportData.status === 'needs_phase_2' ? 'var(--color-accent-warning)' : 'var(--color-accent-green)',
                  background: reportData.status === 'needs_phase_2' ? 'rgba(245,158,11,0.10)' : 'rgba(16,185,129,0.10)',
                  border: `1px solid ${reportData.status === 'needs_phase_2' ? 'rgba(245,158,11,0.40)' : 'rgba(16,185,129,0.40)'}`,
                }}
              >
                {reportData.statusLabel}
              </span>
            </div>
            <ImpactSummary data={reportData} animate={justApplied} />
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

function ImpactSummary({ data, animate }: { data: ReturnType<typeof buildReportData>; animate: boolean }) {
  return (
    <div className="mt-3 grid grid-cols-2 gap-2">
      <Impact label="Residents Served" value={<RollingValue value={data.residentsServed} format={(v) => Math.round(v).toLocaleString()} active={animate} />} glow={animate} />
      <Impact label="Gaps Improved" value={<RollingValue value={data.serviceGapsImproved} active={animate} />} glow={animate} />
      <Impact label="City Health" value={<RollingValue value={data.cityHealthDelta} format={formatDelta} active={animate} />} glow={animate} />
      <Impact label="Emergency" value={<RollingValue value={data.emergencyDelta} format={formatDelta} active={animate} />} glow={animate} />
      <Impact label="Equity Score" value={<RollingValue value={data.equityDelta} format={formatDelta} active={animate} />} glow={animate} />
      <Impact label="15 Min City" value={<RollingValue value={data.fifteenMinuteDelta} format={formatDelta} active={animate} />} glow={animate} />
      <Impact label="Total Cost" value={<RollingValue value={data.totalCost} format={formatMoney} active={animate} />} glow={animate} />
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
    <div className="flex items-center gap-2.5 px-1 pt-1">
      <div className="relative grid h-9 w-9 place-items-center rounded-full" style={{ background: 'rgba(0,184,148,0.10)', border: '1px solid rgba(0,184,148,0.45)' }}>
        <Sparkles size={16} style={{ color: 'var(--color-accent-green)' }} />
        <span
          className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full"
          style={{ background: statusColor, border: '2px solid var(--color-bg-sidebar)', boxShadow: `0 0 8px ${statusColor}` }}
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

function Impact({ label, value, glow = false }: { label: string; value: ReactNode; glow?: boolean }) {
  return (
    <div className={`rounded-lg p-2 ${glow ? 'metric-glow' : ''}`} style={{ background: 'rgba(255,255,255,0.32)', border: '1px solid var(--color-border-subtle)' }}>
      <div className="font-mono text-[9px] uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>{label}</div>
      <div className="mt-1 font-mono text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>{value}</div>
    </div>
  )
}

function RollingValue({
  value,
  active,
  format = (v: number) => String(Math.round(v)),
}: {
  value: number
  active: boolean
  format?: (value: number) => string
}) {
  const [display, setDisplay] = useState(active ? 0 : value)

  useEffect(() => {
    if (!active) {
      setDisplay(value)
      return
    }
    let raf = 0
    const start = performance.now()
    const duration = 950
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplay(value * eased)
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [active, value])

  return <span className="tabular-nums">{format(display)}</span>
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
  const rounded = Math.round(value)
  return `${rounded > 0 ? '+' : ''}${rounded}`
}

function formatMoney(value?: number) {
  if (!value) return '$0M'
  return `$${Math.round(value / 1_000_000)}M`
}
