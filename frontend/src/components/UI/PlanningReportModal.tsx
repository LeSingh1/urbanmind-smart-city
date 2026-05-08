import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, Copy, FileText, Sparkles, TriangleAlert, X } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useSimulationStore } from '@/stores/simulationStore'
import { useScenarioStore } from '@/stores/scenarioStore'
import { buildReportData, type PlanningReportData, type ReportStatus } from '@/state/buildReportData'

const GENERATING_STEPS = [
  'Analyzing applied infrastructure...',
  'Summarizing before/after impact...',
  'Preparing planning memo...',
] as const

export function PlanningReportModal() {
  const planning = useSimulationStore((s) => s.planning)
  const closeReport = useSimulationStore((s) => s.closeReport)

  return createPortal(
    <AnimatePresence>
      {planning.isReportOpen && <PlanningReport onClose={closeReport} />}
    </AnimatePresence>,
    document.body
  )
}

function PlanningReport({ onClose }: { onClose: () => void }) {
  const planning = useSimulationStore((s) => s.planning)
  const activeScenario = useScenarioStore((s) => s.activeScenario)
  const [generatingStep, setGeneratingStep] = useState(0)
  const [generating, setGenerating] = useState(true)

  useEffect(() => {
    const t1 = window.setTimeout(() => setGeneratingStep(1), 380)
    const t2 = window.setTimeout(() => setGeneratingStep(2), 760)
    const done = window.setTimeout(() => setGenerating(false), 1180)
    return () => { window.clearTimeout(t1); window.clearTimeout(t2); window.clearTimeout(done) }
  }, [])

  // Rebuild on every open; never cache. Year, scenario, and applied state may
  // have changed since the last open.
  const data = useMemo(() => buildReportData(planning, activeScenario), [planning, activeScenario])

  const reportJson = useMemo(() => JSON.stringify({
    executiveSummary: `Infrastructure planning report for ${data.cityName}`,
    selectedCity: data.cityName,
    scenario: data.scenarioName,
    growthScenario: `${data.growthPercent}% over ${data.horizonYears} years`,
    selectedYear: data.selectedYear,
    status: data.status,
    statusLabel: data.statusLabel,
    stressLevel: data.stressLevel,
    warningMessage: data.warningMessage,
    gaps: data.activeGaps,
    improvedZones: data.improvedZones,
    recommendedAIPlan: {
      name: data.topRecommendationName,
      reason: data.topRecommendationReason,
      cost: data.topRecommendationCost,
      confidence: data.topRecommendationConfidence,
      populationServed: data.topRecommendationPopulationServed,
    },
    proposedInfrastructure: data.recommendations,
    beforeMetrics: data.beforeMetrics,
    afterMetrics: data.afterMetrics,
    metrics: data.metrics,
    residentsServed: data.residentsServed,
    serviceGapsImproved: data.serviceGapsImproved,
    totalCost: data.totalCost,
    pitchSummary: data.pitchSummary,
    narrative: data.narrative,
    assumptions: data.assumptions,
    limitations: data.limitations,
    nextSteps: data.nextSteps,
  }, null, 2), [data])

  const copyReport = () => {
    const body = document.getElementById('urbanmind-report-body')?.innerText
    navigator.clipboard?.writeText(body ?? reportJson).catch(() => {})
  }
  const copyPitch = () => navigator.clipboard?.writeText(data.pitchSummary).catch(() => {})
  const downloadJson = () => {
    const blob = new Blob([reportJson], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `urbanmind-${data.cityId}-planning-report.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex items-center justify-center p-6"
      style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.96 }}
        style={{
          width: 760,
          maxWidth: '94vw',
          maxHeight: '88vh',
          overflow: 'auto',
          background: 'var(--color-bg-panel)',
          border: '1px solid var(--color-border-subtle)',
          borderRadius: 10,
          boxShadow: '0 16px 70px rgba(0,0,0,0.65)',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <AnimatePresence>
          {generating && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              style={{ position: 'absolute', inset: 0, zIndex: 5, display: 'grid', placeItems: 'center', background: 'var(--color-bg-panel)', borderRadius: 10 }}
            >
              <div className="flex flex-col items-center gap-3 px-6">
                <div className="flex items-center gap-2">
                  <Sparkles size={18} style={{ color: 'var(--color-accent-green)' }} />
                  <div className="font-display text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>Generating Planning Report</div>
                </div>
                <div className="w-[280px] h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-bg-hover)' }}>
                  <motion.div
                    initial={{ width: '8%' }}
                    animate={{ width: ['8%', '40%', '78%', '100%'][generatingStep] ?? '100%' }}
                    transition={{ duration: 0.35, ease: 'easeOut' }}
                    style={{ height: '100%', background: 'var(--color-accent-cyan)' }}
                  />
                </div>
                <div className="font-mono text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                  {GENERATING_STEPS[generatingStep] ?? GENERATING_STEPS[GENERATING_STEPS.length - 1]}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
          <div className="flex items-center gap-2">
            <FileText size={18} style={{ color: 'var(--color-accent-cyan)' }} />
            <div>
              <div className="font-display font-semibold text-lg" style={{ color: 'var(--color-text-primary)' }}>
                UrbanMind Planning Report
              </div>
              <div className="font-mono text-[10px] tracking-widest uppercase" style={{ color: 'var(--color-text-muted)' }}>
                {data.cityName} · {data.scenarioName} · year {data.selectedYear}
              </div>
            </div>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-lg grid place-items-center" style={{ border: '1px solid var(--color-border-subtle)', color: 'var(--color-text-muted)' }}>
            <X size={14} />
          </button>
        </div>

        <div className="flex flex-wrap gap-2 px-5 py-3" style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
          <button type="button" onClick={copyReport} className="px-3 py-1.5 rounded-lg text-[11px]" style={{ border: '1px solid var(--color-border-subtle)', color: 'var(--color-accent-cyan)' }}>
            Copy Report
          </button>
          <button type="button" onClick={downloadJson} className="px-3 py-1.5 rounded-lg text-[11px]" style={{ border: '1px solid var(--color-border-subtle)', color: 'var(--color-accent-purple)' }}>
            Download JSON
          </button>
          <button type="button" onClick={() => window.print()} className="px-3 py-1.5 rounded-lg text-[11px]" style={{ border: '1px solid var(--color-border-subtle)', color: 'var(--color-text-muted)' }}>
            Print Report
          </button>
          <button type="button" onClick={copyPitch} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px]" style={{ border: '1px solid rgba(0,184,148,0.4)', color: 'var(--color-accent-green)' }}>
            <Copy size={11} />
            Copy Pitch Summary
          </button>
        </div>

        <div id="urbanmind-report-body" className="p-5 space-y-4">
          <StatusCard data={data} />

          <KeyOutcomes data={data} />

          <section>
            <h3 className="font-mono text-[10px] tracking-widest uppercase mb-2" style={{ color: 'var(--color-accent-cyan)' }}>
              Executive Summary
            </h3>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
              {data.narrative}
            </p>
            <div className="mt-3 rounded-lg p-3" style={{ border: '1px solid rgba(0,184,148,0.3)', background: 'rgba(0,184,148,0.06)' }}>
              <div className="font-mono text-[9px] uppercase tracking-widest mb-1" style={{ color: 'var(--color-accent-green)' }}>
                Pitch Summary
              </div>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                {data.pitchSummary}
              </p>
            </div>
          </section>

          <section>
            <h3 className="font-mono text-[10px] tracking-widest uppercase mb-2" style={{ color: 'var(--color-accent-cyan)' }}>
              City and Scenario
            </h3>
            <DataLine label="City" value={data.cityName} />
            <DataLine label="Scenario" value={data.scenarioName} />
            <DataLine label="Growth Scenario" value={`${data.growthPercent}% over ${data.horizonYears} years`} />
            <DataLine label="Timeline Year" value={`${data.selectedYear} · ${data.population.toLocaleString()} projected residents`} />
            {data.warningMessage ? (
              <p className="mt-2 text-[11px]" style={{ color: 'var(--color-accent-warning)' }}>
                {data.warningMessage}
              </p>
            ) : null}
          </section>

          <section>
            <h3 className="font-mono text-[10px] tracking-widest uppercase mb-2" style={{ color: 'var(--color-accent-cyan)' }}>
              Main Infrastructure Gaps
            </h3>
            <DataLine label="Top Gap" value={`${data.topGapName}: ${data.topGapReason}`} />
          </section>

          <section>
            <h3 className="font-mono text-[10px] tracking-widest uppercase mb-2" style={{ color: 'var(--color-accent-cyan)' }}>
              Current Infrastructure Gaps
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {data.activeGaps.length === 0 && (
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>No open gaps recorded (zones may already be improved).</p>
              )}
              {data.activeGaps.map((zone) => (
                <div key={zone.id} className="rounded-lg p-3" style={{ border: '1px solid rgba(255,90,61,0.2)', background: 'rgba(255,90,61,0.05)' }}>
                  <div className="font-display text-xs font-semibold" style={{ color: 'var(--color-text-primary)' }}>{zone.name}</div>
                  <p className="text-[11px] mt-1 leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>{zone.reason}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="font-mono text-[10px] tracking-widest uppercase mb-2" style={{ color: 'var(--color-accent-cyan)' }}>
              Recommended AI Plan
            </h3>
            <p className="text-xs leading-relaxed mb-2" style={{ color: 'var(--color-text-secondary)' }}>
              {data.topRecommendationReason}
            </p>
            <DataLine label="Recommendation" value={data.topRecommendationName} />
            <DataLine label="Cost" value={`${formatMoney(data.topRecommendationCost)} top recommendation · ${formatMoney(data.totalCost)} full plan`} />
            <DataLine label="Population Served" value={`${data.topRecommendationPopulationServed.toLocaleString()} top · ${data.residentsServed.toLocaleString()} full plan`} />
            <DataLine label="Confidence" value={`${Math.round((data.topRecommendationConfidence ?? 0) * 100)}%`} />
          </section>

          <section>
            <h3 className="font-mono text-[10px] tracking-widest uppercase mb-2" style={{ color: 'var(--color-accent-cyan)' }}>
              Proposed Infrastructure
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {data.recommendations.map((item) => (
                <div key={item.id} className="rounded-lg p-2" style={{ border: '1px solid var(--color-border-subtle)', background: 'var(--color-bg-hover)' }}>
                  <div className="font-display text-xs" style={{ color: 'var(--color-text-primary)' }}>{item.name}</div>
                  <div className="font-mono text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                    {item.category.replace(/_/g, ' ')} · ${(item.costEstimate / 1_000_000).toFixed(1)}M
                  </div>
                  <div className="text-[10px] mt-1" style={{ color: 'var(--color-text-secondary)' }}>{item.reason}</div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="font-mono text-[10px] tracking-widest uppercase mb-2" style={{ color: 'var(--color-accent-cyan)' }}>
              Before / After Metrics
            </h3>
            {data.metrics.length ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {data.metrics.map((m) => (
                  <div key={m.key} className="rounded-lg p-3" style={{ border: '1px solid var(--color-border-subtle)', background: 'var(--color-bg-card)' }}>
                    <div className="font-mono text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{m.label}</div>
                    <div className="font-mono text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                      {fmtMetric(m.before, m.isCommute)} to {fmtMetric(m.after, m.isCommute)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Run analysis and apply plan to populate before/after metrics.</p>
            )}
          </section>

          <section>
            <h3 className="font-mono text-[10px] tracking-widest uppercase mb-2" style={{ color: 'var(--color-accent-cyan)' }}>
              Cost and Population Served
            </h3>
            <DataLine label="Total Cost" value={formatMoney(data.totalCost)} />
            <DataLine label="Population Served" value={`${data.residentsServed.toLocaleString()} projected residents`} />
            <DataLine label="Service Gaps Improved" value={String(data.serviceGapsImproved)} />
          </section>

          <section>
            <h3 className="font-mono text-[10px] tracking-widest uppercase mb-2" style={{ color: 'var(--color-accent-cyan)' }}>
              Assumptions & Limitations
            </h3>
            <ul className="text-xs space-y-1 list-disc list-inside" style={{ color: 'var(--color-text-secondary)' }}>
              {data.assumptions.map((line, i) => <li key={`a-${i}`}>{line}</li>)}
              {data.limitations.map((line, i) => <li key={`l-${i}`}>{line}</li>)}
            </ul>
          </section>

          <section>
            <h3 className="font-mono text-[10px] tracking-widest uppercase mb-2" style={{ color: 'var(--color-accent-cyan)' }}>
              Next Steps
            </h3>
            <ul className="text-xs space-y-1 list-disc list-inside" style={{ color: 'var(--color-text-secondary)' }}>
              {data.nextSteps.map((line, i) => <li key={`n-${i}`}>{line}</li>)}
            </ul>
          </section>
        </div>
      </motion.div>
    </motion.div>
  )
}

function StatusCard({ data }: { data: PlanningReportData }) {
  const tone = STATUS_TONE[data.status]
  const Icon = tone.icon
  return (
    <div className="rounded-lg p-4" style={{ background: tone.bg, border: `1px solid ${tone.border}` }}>
      <div className="flex items-start gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-full shrink-0" style={{ background: tone.iconBg, color: tone.iconColor }}>
          <Icon size={18} />
        </div>
        <div className="min-w-0">
          <div className="font-mono text-[9px] uppercase tracking-widest" style={{ color: tone.iconColor }}>
            {data.scenarioName} · {data.selectedYear}
          </div>
          <div className="font-display text-base font-bold mt-0.5" style={{ color: tone.iconColor }}>
            {data.statusLabel}
          </div>
          <p className="text-[12px] mt-1 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
            {data.statusBlurb}
          </p>
          {data.warningMessage ? (
            <p className="text-[11px] mt-2 leading-relaxed" style={{ color: 'var(--color-accent-warning)' }}>
              {data.warningMessage}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function KeyOutcomes({ data }: { data: PlanningReportData }) {
  if (!data.hasAppliedAIPlan) return null
  const cityHealthBefore = Math.round(data.beforeMetrics?.cityHealth ?? 0)
  const cityHealthAfter = Math.round(data.afterMetrics?.cityHealth ?? cityHealthBefore)
  const fifteenBefore = Math.round(data.beforeMetrics?.fifteenMinuteCityScore ?? 0)
  const fifteenAfter = Math.round(data.afterMetrics?.fifteenMinuteCityScore ?? fifteenBefore)
  const rows: { label: string; value: string }[] = [
    { label: 'Projected residents served', value: data.residentsServed.toLocaleString() },
    { label: 'Service gaps improved', value: String(data.serviceGapsImproved) },
    { label: 'City Health', value: `${cityHealthBefore} → ${cityHealthAfter}` },
    { label: '15-Minute City Score', value: `${fifteenBefore} → ${fifteenAfter}` },
    { label: 'Total cost', value: formatMoney(data.totalCost) },
  ]
  return (
    <section>
      <h3 className="font-mono text-[10px] tracking-widest uppercase mb-2" style={{ color: 'var(--color-accent-cyan)' }}>
        Key Outcomes
      </h3>
      <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--color-border-subtle)' }}>
        {rows.map((row, idx) => (
          <div
            key={row.label}
            className="flex items-baseline justify-between px-3 py-2"
            style={{
              borderBottom: idx === rows.length - 1 ? 'none' : '1px solid var(--color-border-subtle)',
              background: idx % 2 === 0 ? 'var(--color-bg-panel)' : 'var(--color-bg-card)',
            }}
          >
            <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{row.label}</span>
            <span className="font-mono font-bold tabular-nums" style={{ fontSize: 22, color: 'var(--color-accent-cyan)', letterSpacing: '-0.01em' }}>{row.value}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

const STATUS_TONE: Record<ReportStatus, { bg: string; border: string; iconBg: string; iconColor: string; icon: typeof CheckCircle2 }> = {
  future_proofed: {
    bg: 'rgba(16,185,129,0.08)',
    border: 'rgba(16,185,129,0.35)',
    iconBg: 'rgba(16,185,129,0.18)',
    iconColor: 'var(--color-accent-green)',
    icon: CheckCircle2,
  },
  holds_through_2050s: {
    bg: 'rgba(6,182,212,0.08)',
    border: 'rgba(6,182,212,0.35)',
    iconBg: 'rgba(6,182,212,0.18)',
    iconColor: 'var(--color-accent-cyan)',
    icon: Sparkles,
  },
  needs_phase_2: {
    bg: 'rgba(245,158,11,0.10)',
    border: 'rgba(245,158,11,0.40)',
    iconBg: 'rgba(245,158,11,0.20)',
    iconColor: 'var(--color-accent-warning)',
    icon: TriangleAlert,
  },
  no_plan: {
    bg: 'var(--color-bg-card)',
    border: 'var(--color-border-subtle)',
    iconBg: 'var(--color-bg-hover)',
    iconColor: 'var(--color-text-muted)',
    icon: Sparkles,
  },
}

function DataLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-1 text-sm" style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
      <span style={{ color: 'var(--color-text-muted)' }}>{label}</span>
      <span style={{ color: 'var(--color-text-secondary)' }}>{value}</span>
    </div>
  )
}

function fmtMetric(v: number, isCommute = false) {
  return isCommute ? v.toFixed(1) : Math.round(v).toString()
}

function formatMoney(value?: number) {
  if (!value) return '$0M'
  return `$${Math.round(value / 1_000_000)}M`
}
