import { useMemo } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, Sparkles, X } from 'lucide-react'
import { useSimulationStore } from '@/stores/simulationStore'
import type { PlanBattlePlan } from '@/types/city.types'

interface Props {
  open: boolean
  onClose: () => void
}

const TAB_PREFIX = ['A', 'B', 'C'] as const

/**
 * Review Plan modal — shows the three available plans (Balanced / Transit / Equity)
 * as A/B/C tabs. Switching tabs updates `selectedPlanId` in the store. Applying
 * fires `applyRecommendedPlan()` which reads the same `selectedPlanId` — so the
 * modal, the right rail Impact Summary, and the generated report all share one
 * source of truth.
 */
export function ReviewPlanModal({ open, onClose }: Props) {
  const planBattlePlans = useSimulationStore((s) => s.planning.planBattlePlans)
  const selectedPlanId = useSimulationStore((s) => s.planning.selectedPlanId)
  const recommendedPlanId = useSimulationStore((s) => s.planning.recommendedPlanId)
  const hasAppliedAIPlan = useSimulationStore((s) => s.planning.hasAppliedAIPlan)
  const setSelectedPlanId = useSimulationStore((s) => s.setSelectedPlanId)
  const applyRecommendedPlan = useSimulationStore((s) => s.applyRecommendedPlan)
  const comparePlans = useSimulationStore((s) => s.comparePlans)

  // Lazily seed when the modal opens with no Plan Battle data.
  const plans = useMemo<PlanBattlePlan[]>(() => {
    if (planBattlePlans.length) return planBattlePlans
    return []
  }, [planBattlePlans])

  const activePlan = plans.find((p) => p.id === selectedPlanId) ?? plans[0]

  if (!open) return null

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 70,
          background: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 24,
        }}
        aria-modal="true"
        role="dialog"
        aria-label="Review Plan"
      >
        <motion.div
          initial={{ y: 24, opacity: 0, scale: 0.98 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 12, opacity: 0, scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 240, damping: 28 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            width: 'min(880px, 100%)',
            maxHeight: '88vh',
            background: 'var(--color-bg-panel)',
            border: '1px solid var(--color-border-subtle)',
            borderRadius: 18,
            boxShadow: 'var(--shadow-lg)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header */}
          <div
            className="flex items-start justify-between gap-4 px-6 py-4"
            style={{ borderBottom: '1px solid var(--color-border-subtle)' }}
          >
            <div>
              <div className="flex items-center gap-2">
                <Sparkles size={14} style={{ color: 'var(--color-accent-cyan)' }} />
                <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--color-accent-cyan)' }}>
                  Review Plan
                </span>
              </div>
              <h2 className="mt-1 font-display text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                Compare three Copilot plans for Fremon
              </h2>
              <p className="mt-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                Switch tabs to inspect Plan A, B, or C — then apply your choice. The selected plan drives the report and the right‑rail impact summary.
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5"
              style={{ color: 'var(--color-text-muted)', border: '1px solid var(--color-border-subtle)' }}
              aria-label="Close Review Plan"
            >
              <X size={16} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 px-6 pt-4" role="tablist">
            {plans.length === 0 ? (
              <div className="w-full px-2 py-6 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
                <p className="mb-3">Plan Battle data not loaded yet.</p>
                <button
                  type="button"
                  onClick={comparePlans}
                  className="rounded-lg px-3 py-2 text-xs font-semibold"
                  style={{
                    background: 'var(--color-bg-panel)',
                    color: 'var(--color-accent-cyan)',
                    border: '1px solid rgba(var(--rgb-accent), 0.35)',
                  }}
                >
                  Load plans
                </button>
              </div>
            ) : plans.map((plan, idx) => {
              const isActive = activePlan?.id === plan.id
              const isRecommended = plan.id === recommendedPlanId
              return (
                <button
                  key={plan.id}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setSelectedPlanId(plan.id)}
                  className="flex-1 rounded-t-lg px-4 py-2.5 text-left transition-colors"
                  style={{
                    background: isActive ? 'var(--color-bg-card)' : 'transparent',
                    border: isActive ? '1px solid var(--color-border-subtle)' : '1px solid transparent',
                    borderBottom: isActive ? '1px solid var(--color-bg-card)' : '1px solid var(--color-border-subtle)',
                    color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                    marginBottom: -1,
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-widest" style={{ color: isActive ? 'var(--color-accent-cyan)' : 'var(--color-text-muted)' }}>
                      Plan {TAB_PREFIX[idx]}
                    </span>
                    {isRecommended && (
                      <span className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-widest" style={{ color: 'var(--color-accent-green)', background: 'rgba(5,150,105,0.08)', border: '1px solid rgba(5,150,105,0.3)' }}>
                        Recommended
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 text-sm font-semibold">{plan.label.replace(/^Plan\s+[A-Z]:\s*/, '')}</div>
                </button>
              )
            })}
          </div>

          {/* Body */}
          {activePlan && (
            <div className="flex-1 overflow-auto px-6 py-5" style={{ background: 'var(--color-bg-card)' }}>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                    {activePlan.summary}
                  </p>
                  <div className="mt-4 rounded-lg p-3" style={{ background: 'var(--color-bg-panel)', border: '1px solid var(--color-border-subtle)' }}>
                    <div className="font-mono text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--color-text-muted)' }}>
                      Tradeoff
                    </div>
                    <p className="text-[12px] leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{activePlan.tradeoff}</p>
                  </div>
                  {activePlan.reason && (
                    <div className="mt-3 rounded-lg p-3" style={{ background: 'rgba(5,150,105,0.06)', border: '1px solid rgba(5,150,105,0.18)' }}>
                      <div className="font-mono text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--color-accent-green)' }}>
                        Why Copilot picks this
                      </div>
                      <p className="text-[12px] leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{activePlan.reason}</p>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 content-start">
                  <MetricChip label="Budget" value={`$${(activePlan.cost / 1_000_000).toFixed(0)}M`} />
                  <MetricChip label="Residents served" value={activePlan.populationServed.toLocaleString()} />
                  <MetricChip label="Gaps fixed" value={activePlan.gapsFixed} />
                  <MetricChip label="City Health" value={Math.round(activePlan.metrics.cityHealth ?? 0)} />
                  <MetricChip label="Emergency Access" value={Math.round(activePlan.metrics.emergencyAccess ?? 0)} />
                  <MetricChip label="Equity Score" value={Math.round(activePlan.metrics.equityScore ?? 0)} />
                  <MetricChip label="Commute" value={`${Math.round(activePlan.metrics.averageCommute ?? 0)} min`} />
                  <MetricChip label="Transit Coverage" value={Math.round(activePlan.metrics.transitCoverage ?? 0)} />
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div
            className="flex items-center justify-between gap-3 px-6 py-4"
            style={{ borderTop: '1px solid var(--color-border-subtle)' }}
          >
            <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {hasAppliedAIPlan ? (
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 size={13} style={{ color: 'var(--color-accent-green)' }} />
                  A plan is currently applied. Switching tabs and re-applying will replace it.
                </span>
              ) : (
                <span>Pick a tab, then apply to commit the plan to the map and metrics.</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="rounded-lg px-3 py-2 text-xs font-semibold"
                style={{
                  background: 'var(--color-bg-panel)',
                  color: 'var(--color-text-secondary)',
                  border: '1px solid var(--color-border-subtle)',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  applyRecommendedPlan()
                  onClose()
                }}
                disabled={!activePlan}
                className="rounded-lg px-4 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-45"
                style={{
                  background: 'rgba(0,184,148,0.10)',
                  color: 'var(--color-accent-green)',
                  border: '1px solid rgba(0,184,148,0.40)',
                }}
              >
                Apply Plan {activePlan ? TAB_PREFIX[plans.indexOf(activePlan)] : ''}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  )
}

function MetricChip({ label, value }: { label: string; value: string | number }) {
  return (
    <div
      className="rounded-lg p-2"
      style={{ background: 'var(--color-bg-panel)', border: '1px solid var(--color-border-subtle)' }}
    >
      <div className="font-mono text-[9px] uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>
        {label}
      </div>
      <div className="mt-0.5 font-mono text-sm font-bold tabular-nums" style={{ color: 'var(--color-text-primary)' }}>
        {value}
      </div>
    </div>
  )
}
