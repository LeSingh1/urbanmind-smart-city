import { motion, AnimatePresence } from 'framer-motion'
import { useAIStore } from '@/stores/aiStore'
import { createPortal } from 'react-dom'
import { Cpu, FileText, Sparkles, X, Zap } from 'lucide-react'
import { getZoneColor } from '@/utils/colorUtils'
import { useScenarioStore } from '@/stores/scenarioStore'
import { useSimulationStore } from '@/stores/simulationStore'
import type { ZoneExplanation } from '@/types/simulation.types'

export function AIPanel() {
  const { lastExplanations, isLoadingExplanation, explanationCache } = useAIStore()
  const { planning, applyAIPlan, openReport, closeReport } = useSimulationStore()
  const activeScenario = useScenarioStore((s) => s.activeScenario)
  const latestExplanation: ZoneExplanation | undefined = lastExplanations[0]
  const cachedCount = Object.keys(explanationCache).length
  const rec = planning.topRecommendation

  return (
    <div className="p-3 space-y-3">
      <div
        className="rounded-lg p-3"
        style={{
          background: 'linear-gradient(135deg, rgba(0,212,255,0.09), rgba(124,58,237,0.08))',
          border: '1px solid rgba(0,212,255,0.24)',
          boxShadow: planning.hasAnalyzed ? '0 0 24px rgba(0,212,255,0.08)' : 'none',
        }}
      >
        <div className="font-mono text-[9px] tracking-widest uppercase mb-2" style={{ color: 'var(--color-accent-cyan)' }}>
          Infrastructure Planning Copilot
        </div>
        <div className="font-display text-sm font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>
          {rec.title}
        </div>
        <div className="font-mono text-[10px] mb-3" style={{ color: 'var(--color-text-muted)' }}>
          {rec.zoneName} · {rec.infrastructureType.replace(/_/g, ' ')}
        </div>
        <p className="text-[11px] leading-relaxed mb-3" style={{ color: 'var(--color-text-secondary)' }}>
          {rec.reason}
        </p>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <Impact label="Emergency Access" value={`+${rec.expectedImpact.emergencyAccess}`} />
          <Impact label="City Health" value={`+${rec.expectedImpact.cityHealth}`} />
          <Impact label="Response Time" value={`${rec.expectedImpact.averageResponseTime} min`} positive />
          <Impact label="Confidence" value={`${Math.round(rec.confidence * 100)}%`} />
        </div>
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="font-mono text-[9px]" style={{ color: 'var(--color-text-muted)' }}>Estimated Cost</div>
            <div className="font-mono font-bold text-xs" style={{ color: 'var(--color-accent-warning)' }}>
              ${(rec.estimatedCost / 1_000_000).toFixed(0)}M
            </div>
          </div>
          <button
            onClick={() => applyAIPlan(activeScenario)}
            disabled={!planning.hasAnalyzed || planning.hasAppliedAIPlan}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-display font-semibold disabled:opacity-40"
            style={{ background: 'rgba(0,255,156,0.08)', color: 'var(--color-accent-green)', border: '1px solid rgba(0,255,156,0.3)' }}
          >
            <Sparkles size={12} />
            {planning.hasAppliedAIPlan ? 'Plan Applied' : 'Apply AI Plan'}
          </button>
        </div>
        <button
          onClick={openReport}
          disabled={!planning.hasAnalyzed}
          className="mt-2 w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-display font-semibold disabled:opacity-40"
          style={{ background: 'rgba(124,58,237,0.08)', color: 'var(--color-accent-purple)', border: '1px solid rgba(124,58,237,0.3)' }}
        >
          <FileText size={12} />
          Generate Planning Report
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2">
        <StatCard icon={<Cpu size={12} />} label="Cached" value={cachedCount.toString()} />
        <StatCard icon={<Zap size={12} />} label="History" value={lastExplanations.length.toString()} color="var(--color-accent-cyan)" />
      </div>

      {/* Generating indicator */}
      <AnimatePresence>
        {isLoadingExplanation && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2"
          >
            <motion.div
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: 'var(--color-accent-cyan)' }}
              animate={{ scale: [1, 1.5, 1] }}
              transition={{ duration: 0.8, repeat: Infinity }}
            />
            <span className="font-mono text-[10px]" style={{ color: 'var(--color-accent-cyan)' }}>
              Claude is analyzing...
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Latest explanation hero */}
      {latestExplanation && (
        <motion.div
          key={`${latestExplanation.zone_type_id}-${latestExplanation.year}`}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg p-3"
          style={{
            background: 'rgba(124,58,237,0.06)',
            border: '1px solid rgba(124,58,237,0.2)',
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <div
                className="w-2.5 h-2.5 rounded-sm shrink-0"
                style={{ background: getZoneColor(latestExplanation.zone_type_id) }}
              />
              <span
                className="font-display text-xs font-medium"
                style={{ color: 'var(--color-accent-purple)' }}
              >
                {latestExplanation.zone_display_name}
              </span>
            </div>
            <span className="font-mono text-[9px]" style={{ color: 'var(--color-text-muted)' }}>
              Y{latestExplanation.year}
            </span>
          </div>
          <p className="text-[10px] leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
            {latestExplanation.explanation_text}
          </p>
          <div className="mt-1.5 font-mono text-[9px]" style={{ color: 'var(--color-text-muted)' }}>
            ({latestExplanation.x}, {latestExplanation.y})
          </div>
        </motion.div>
      )}

      {/* History */}
      {lastExplanations.length > 1 && (
        <div>
          <div
            className="font-mono text-[9px] tracking-widest uppercase mb-2"
            style={{ color: 'var(--color-text-muted)' }}
          >
            History
          </div>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {lastExplanations.slice(1).map((exp, i) => (
              <div
                key={`${exp.zone_type_id}-${exp.year}-${i}`}
                className="pl-2 py-0.5"
                style={{ borderLeft: '2px solid var(--color-border-subtle)' }}
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  <div
                    className="w-2 h-2 rounded-sm shrink-0"
                    style={{ background: getZoneColor(exp.zone_type_id) }}
                  />
                  <span className="font-mono text-[9px]" style={{ color: 'var(--color-text-muted)' }}>
                    {exp.zone_display_name} — Y{exp.year}
                  </span>
                </div>
                <p
                  className="font-mono text-[9px] leading-relaxed line-clamp-2"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  {exp.explanation_text}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {lastExplanations.length === 0 && (
        <div className="text-center py-8">
          <div
            className="font-mono text-[10px] tracking-widest uppercase"
            style={{ color: 'var(--color-text-muted)' }}
          >
            AI explanations will appear here as the simulation places zones
          </div>
        </div>
      )}
      {createPortal(
        <AnimatePresence>
          {planning.isReportOpen && <PlanningReport onClose={closeReport} />}
        </AnimatePresence>,
        document.body
      )}
    </div>
  )
}

function Impact({ label, value }: { label: string; value: string; positive?: boolean }) {
  return (
    <div style={{ background: 'rgba(0,0,0,0.18)', border: '1px solid rgba(0,212,255,0.12)', borderRadius: 8, padding: 8 }}>
      <div className="font-mono text-[9px]" style={{ color: 'var(--color-text-muted)' }}>{label}</div>
      <div className="font-mono font-bold text-sm" style={{ color: 'var(--color-accent-green)' }}>{value}</div>
    </div>
  )
}

function PlanningReport({ onClose }: { onClose: () => void }) {
  const planning = useSimulationStore((s) => s.planning)
  const before = planning.beforeScores
  const after = planning.afterScores ?? before
  const proposed = planning.infrastructure.filter((item) => item.status === 'proposed')
  const activeGaps = planning.underservedZones.filter((zone) => !zone.isImproved)
  const reportJson = JSON.stringify({
    city: 'Fremont, CA',
    growthScenario: `${planning.growthPercent}% over ${planning.horizonYears} years`,
    gaps: planning.underservedZones,
    recommendations: planning.aiRecommendations,
    proposedInfrastructure: proposed,
    beforeMetrics: before,
    afterMetrics: after,
    limitations: [
      'Population growth is simulated.',
      'Infrastructure data may be incomplete.',
      'Scores are estimates for early-stage scenario comparison.',
    ],
  }, null, 2)
  const copyReport = () => navigator.clipboard?.writeText(document.getElementById('urbanmind-report-body')?.innerText ?? reportJson)
  const downloadJson = () => {
    const blob = new Blob([reportJson], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'urbanmind-fremont-planning-report.json'
    a.click()
    URL.revokeObjectURL(url)
  }
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] flex items-center justify-center p-6"
      style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.96 }}
        style={{ width: 760, maxWidth: '94vw', maxHeight: '88vh', overflow: 'auto', background: 'var(--color-bg-panel)', border: '1px solid var(--color-border-subtle)', borderRadius: 10, boxShadow: '0 16px 70px rgba(0,0,0,0.65)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
          <div>
            <div className="font-display font-semibold text-lg" style={{ color: 'var(--color-text-primary)' }}>UrbanMind Planning Report</div>
            <div className="font-mono text-[10px] tracking-widest uppercase" style={{ color: 'var(--color-text-muted)' }}>Fremont, CA · 30% growth over 10 years</div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg grid place-items-center" style={{ border: '1px solid var(--color-border-subtle)', color: 'var(--color-text-muted)' }}>
            <X size={14} />
          </button>
        </div>
        <div className="flex gap-2 px-5 py-3" style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
          <button onClick={copyReport} className="px-3 py-1.5 rounded-lg text-[11px]" style={{ border: '1px solid rgba(0,212,255,0.25)', color: 'var(--color-accent-cyan)' }}>Copy Report</button>
          <button onClick={downloadJson} className="px-3 py-1.5 rounded-lg text-[11px]" style={{ border: '1px solid rgba(124,58,237,0.25)', color: 'var(--color-accent-purple)' }}>Download JSON</button>
          <button onClick={() => window.print()} className="px-3 py-1.5 rounded-lg text-[11px]" style={{ border: '1px solid var(--color-border-subtle)', color: 'var(--color-text-muted)' }}>Print Report</button>
        </div>
        <div id="urbanmind-report-body" className="p-5 space-y-4">
          <section>
            <h3 className="font-mono text-[10px] tracking-widest uppercase mb-2" style={{ color: 'var(--color-accent-cyan)' }}>Executive Summary</h3>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
              UrbanMind identified emergency access, school access, transit coverage, green space, congestion, and housing pressure gaps under the selected growth scenario. The proposed plan estimates improved city health while prioritizing underserved zones.
            </p>
          </section>
          <section>
            <h3 className="font-mono text-[10px] tracking-widest uppercase mb-2" style={{ color: 'var(--color-accent-cyan)' }}>City and Scenario</h3>
            <DataLine label="City" value="Fremont, CA" />
            <DataLine label="Growth Scenario" value={`${planning.growthPercent}% growth over ${planning.horizonYears} years`} />
            <DataLine label="Scenario Type" value="Balanced Growth default, adjustable by scenario controls" />
          </section>
          <section>
            <h3 className="font-mono text-[10px] tracking-widest uppercase mb-2" style={{ color: 'var(--color-accent-cyan)' }}>Current Infrastructure Gaps</h3>
            <div className="grid grid-cols-2 gap-2">
              {activeGaps.map((zone) => (
                <div key={zone.id} className="rounded-lg p-3" style={{ border: '1px solid rgba(255,90,61,0.2)', background: 'rgba(255,90,61,0.05)' }}>
                  <div className="font-display text-xs font-semibold" style={{ color: 'var(--color-text-primary)' }}>{zone.name}</div>
                  <p className="text-[10px] mt-1 leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>{zone.reason}</p>
                </div>
              ))}
            </div>
          </section>
          <section>
            <h3 className="font-mono text-[10px] tracking-widest uppercase mb-2" style={{ color: 'var(--color-accent-cyan)' }}>AI Recommendations</h3>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{planning.topRecommendation.reason}</p>
            <div className="mt-2 font-mono text-[10px]" style={{ color: 'var(--color-accent-warning)' }}>Estimated first project cost: ${(planning.topRecommendation.estimatedCost / 1_000_000).toFixed(0)}M</div>
          </section>
          <section>
            <h3 className="font-mono text-[10px] tracking-widest uppercase mb-2" style={{ color: 'var(--color-accent-cyan)' }}>Proposed Additions</h3>
            <div className="grid grid-cols-2 gap-2">
              {(proposed.length ? proposed : planning.aiRecommendations).map((item) => (
                <div key={item.id} className="rounded-lg p-2" style={{ border: '1px solid rgba(0,212,255,0.14)', background: 'rgba(0,212,255,0.04)' }}>
                  <div className="font-display text-xs" style={{ color: 'var(--color-text-primary)' }}>{item.name}</div>
                  <div className="font-mono text-[9px]" style={{ color: 'var(--color-text-muted)' }}>{item.category.replace(/_/g, ' ')} · ${(item.costEstimate / 1_000_000).toFixed(1)}M</div>
                </div>
              ))}
            </div>
          </section>
          <section>
            <h3 className="font-mono text-[10px] tracking-widest uppercase mb-2" style={{ color: 'var(--color-accent-cyan)' }}>Before / After Scores</h3>
            <div className="grid grid-cols-4 gap-2">
              {before && after && [
                ['City Health', before.cityHealth, after.cityHealth],
                ['Emergency', before.emergencyAccess, after.emergencyAccess],
                ['Transit', before.transitCoverage, after.transitCoverage],
                ['Green Space', before.greenSpace, after.greenSpace],
                ['Commute', before.averageCommute, after.averageCommute],
                ['CO2', before.co2Estimate, after.co2Estimate],
                ['Equity', before.equityScore, after.equityScore],
                ['Cost', 0, after.totalEstimatedCost / 1_000_000],
              ].map(([label, b, a]) => (
                <div key={label as string} className="rounded-lg p-3" style={{ border: '1px solid var(--color-border-subtle)', background: 'rgba(255,255,255,0.02)' }}>
                  <div className="font-mono text-[9px]" style={{ color: 'var(--color-text-muted)' }}>{label}</div>
                  <div className="font-mono text-xs" style={{ color: 'var(--color-text-primary)' }}>{Number(b).toFixed(label === 'Commute' ? 1 : 0)} → {Number(a).toFixed(label === 'Commute' || label === 'Cost' ? 1 : 0)}</div>
                </div>
              ))}
            </div>
          </section>
          <section>
            <h3 className="font-mono text-[10px] tracking-widest uppercase mb-2" style={{ color: 'var(--color-accent-cyan)' }}>Estimated Costs</h3>
            <DataLine label="Proposed plan estimate" value={`$${(((after?.totalEstimatedCost ?? 0) - (before?.totalEstimatedCost ?? 0)) / 1_000_000).toFixed(1)}M`} />
          </section>
          <section>
            <h3 className="font-mono text-[10px] tracking-widest uppercase mb-2" style={{ color: 'var(--color-accent-cyan)' }}>Planning Rationale</h3>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
              Recommendations are grounded in seeded gap zones, visible growth pressure overlays, service coverage estimates, and deterministic score deltas. The model favors lower-cost clinics, schools, parks, bus corridors, and mixed-use growth near transit before larger capital projects.
            </p>
          </section>
          <section>
            <h3 className="font-mono text-[10px] tracking-widest uppercase mb-2" style={{ color: 'var(--color-accent-cyan)' }}>Data Sources and Limitations</h3>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
              Data sources: MapLibre, OpenStreetMap, simulated growth model, UrbanMind scoring engine. Infrastructure data may be incomplete, population growth is simulated, and scores are estimates for early-stage decision support.
            </p>
          </section>
          <section>
            <h3 className="font-mono text-[10px] tracking-widest uppercase mb-2" style={{ color: 'var(--color-accent-cyan)' }}>Next Steps</h3>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
              Validate assumptions with city GIS data, refine service radii, consult agencies and community stakeholders, and run formal traffic, environmental, zoning, and budget reviews.
            </p>
          </section>
          <div className="rounded-lg p-4 text-center" style={{ border: '1px dashed rgba(0,212,255,0.18)', color: 'var(--color-text-muted)', fontSize: 11 }}>
            Map preview placeholder: current Fremont infrastructure gaps and proposed scenario layers.
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

function DataLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-1 text-xs" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <span style={{ color: 'var(--color-text-muted)' }}>{label}</span>
      <span style={{ color: 'var(--color-text-secondary)' }}>{value}</span>
    </div>
  )
}

function StatCard({ icon, label, value, color = 'var(--color-text-primary)' }: {
  icon: React.ReactNode
  label: string
  value: string
  color?: string
}) {
  return (
    <div
      className="rounded-lg p-2 text-center"
      style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border-subtle)' }}
    >
      <div className="flex items-center justify-center gap-1 mb-1" style={{ color: 'var(--color-text-muted)' }}>
        {icon}
        <span className="font-mono text-[9px] tracking-widest uppercase">{label}</span>
      </div>
      <div className="font-mono font-bold text-lg" style={{ color }}>{value}</div>
    </div>
  )
}
