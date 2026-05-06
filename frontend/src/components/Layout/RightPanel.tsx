import { Building2, Sparkles, Swords } from 'lucide-react'
import { useCityStore } from '@/stores/cityStore'
import { useSimulationStore } from '@/stores/simulationStore'
import { useScenarioStore } from '@/stores/scenarioStore'

export function RightPanel() {
  const selectedCity = useCityStore((state) => state.selectedCity)
  const activeScenario = useScenarioStore((state) => state.activeScenario)
  const {
    planning,
    applyAIPlan,
    applyRecommendedPlan,
    comparePlans,
    selectDistrict,
  } = useSimulationStore()

  const applyPlan = () => {
    if (planning.cityId === 'fremon') applyRecommendedPlan()
    else applyAIPlan(activeScenario)
  }

  return (
    <aside
      className="w-[252px] shrink-0 overflow-y-auto"
      style={{
        background: 'var(--color-bg-sidebar)',
        borderLeft: '1px solid var(--color-border-subtle)',
        boxShadow: '-16px 0 46px rgba(0,0,0,0.18)',
      }}
    >
      <div className="space-y-3 p-3">
        <Section title="Selected City">
          {selectedCity ? (
            <div className="flex items-center gap-3 rounded-xl p-3" style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border-subtle)' }}>
              <div className="grid h-10 w-10 place-items-center rounded-xl" style={{ color: 'var(--color-accent-cyan)', background: 'var(--color-bg-hover)' }}>
                <Building2 size={18} />
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{selectedCity.name}</div>
                <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{selectedCity.population_current.toLocaleString()} residents</div>
              </div>
            </div>
          ) : (
            <EmptyState title="No city selected" body="Choose a city to begin." />
          )}
        </Section>

        <Section title="Infrastructure Planning Copilot">
          {planning.hasAnalyzed ? (
            <div className="rounded-2xl p-4" style={{ background: 'var(--color-bg-hover)', border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
              <div className="mb-3 flex items-start gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl" style={{ color: 'var(--color-accent-cyan)', border: '1px solid rgba(0,212,255,0.28)' }}>
                  <Sparkles size={20} />
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--color-accent-cyan)' }}>Top Recommendation</div>
                  <div className="mt-1 text-base font-semibold leading-snug" style={{ color: 'var(--color-text-primary)' }}>{planning.topRecommendation.title}</div>
                  <div className="mt-1 text-xs" style={{ color: 'var(--color-text-secondary)' }}>{planning.topRecommendation.zoneName}</div>
                </div>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{planning.topRecommendation.reason}</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Impact label="Emergency" value={`+${planning.topRecommendation.expectedImpact.emergencyAccess}`} />
                <Impact label="City Health" value={`+${planning.topRecommendation.expectedImpact.cityHealth}`} />
                <Impact label="Cost" value={`$${(planning.topRecommendation.estimatedCost / 1_000_000).toFixed(0)}M`} />
                <Impact label="Confidence" value={`${Math.round(planning.topRecommendation.confidence * 100)}%`} />
              </div>
              <button
                onClick={applyPlan}
                disabled={planning.hasAppliedAIPlan}
                className="mt-3 w-full rounded-xl py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-45"
                style={{ color: 'var(--color-accent-green)', border: '1px solid rgba(0,184,148,0.34)', background: 'rgba(0,184,148,0.08)' }}
              >
                {planning.hasAppliedAIPlan ? 'Plan Applied' : 'Apply Recommended Plan'}
              </button>
            </div>
          ) : (
            <EmptyState title="No analysis yet" body="Click Analyze Infrastructure Gaps to reveal underserved zones and recommendations." />
          )}
        </Section>

        {planning.beforeScores && (
          <Section title="Before / After Metrics">
            <div className="grid gap-2">
              <Metric label="City Health" before={planning.beforeScores.cityHealth} after={planning.afterScores?.cityHealth} />
              <Metric label="Emergency Access" before={planning.beforeScores.emergencyAccess} after={planning.afterScores?.emergencyAccess} />
              <Metric label="Transit Coverage" before={planning.beforeScores.transitCoverage} after={planning.afterScores?.transitCoverage} />
              <Metric label="Green Space" before={planning.beforeScores.greenSpace} after={planning.afterScores?.greenSpace} />
              <Metric label="15 Minute City" before={planning.beforeScores.fifteenMinuteCityScore ?? 54} after={planning.afterScores?.fifteenMinuteCityScore} />
              <Metric label="Average Commute" before={planning.beforeScores.averageCommute} after={planning.afterScores?.averageCommute} inverse />
            </div>
          </Section>
        )}

        <Section title="Plan Battle">
          <button
            onClick={comparePlans}
            disabled={!planning.hasAnalyzed}
            className="mb-2 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"
            style={{ color: 'var(--color-accent-purple)', border: '1px solid var(--color-border-subtle)', background: 'var(--color-bg-hover)' }}
          >
            <Swords size={15} />
            Compare Plans
          </button>
          {planning.planBattlePlans.length === 0 ? (
            <EmptyState title="No comparison yet" body="Run analysis, then compare the seeded planning options." />
          ) : (
            <div className="grid gap-2">
              {planning.planBattlePlans.map((plan) => (
                <div key={plan.id} className="rounded-xl p-3" style={{ background: 'var(--color-bg-card)', border: plan.isRecommended ? '1px solid rgba(0,184,148,0.42)' : '1px solid var(--color-border-subtle)' }}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{plan.label}</div>
                    {plan.isRecommended && <span className="rounded-full px-2 py-0.5 font-mono text-[9px] uppercase" style={{ color: 'var(--color-accent-green)', border: '1px solid rgba(0,184,148,0.3)' }}>Recommended</span>}
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-1.5">
                    <Impact label="Health" value={String(plan.metrics.cityHealth)} />
                    <Impact label="Cost" value={`$${plan.cost / 1_000_000}M`} />
                    <Impact label="Gaps" value={String(plan.gapsFixed)} />
                  </div>
                  <p className="mt-2 text-xs leading-relaxed" style={{ color: plan.isRecommended ? 'var(--color-accent-green)' : 'var(--color-text-secondary)' }}>
                    {plan.isRecommended ? plan.reason : plan.tradeoff}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Section>

        {planning.placementFeedback && (
          <Section title="Placement Feedback">
            <div className="rounded-xl p-3" style={{ border: planning.placementFeedback.type === 'good' ? '1px solid rgba(0,184,148,0.34)' : '1px solid rgba(108,92,231,0.34)', background: planning.placementFeedback.type === 'good' ? 'rgba(0,184,148,0.07)' : 'rgba(108,92,231,0.07)' }}>
              <div className="text-sm font-semibold" style={{ color: planning.placementFeedback.type === 'good' ? 'var(--color-accent-green)' : 'var(--color-accent-warning)' }}>{planning.placementFeedback.title}</div>
              <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{planning.placementFeedback.message}</p>
            </div>
          </Section>
        )}

        <Section title="Current Gaps">
          {planning.hasAnalyzed ? (
            <div className="grid gap-2">
              {planning.underservedZones.slice(0, 5).map((gap) => (
                <div key={gap.id} className="rounded-xl p-3" style={{ background: gap.isImproved ? 'rgba(0,184,148,0.08)' : 'rgba(225,112,85,0.08)', border: gap.isImproved ? '1px solid rgba(0,184,148,0.25)' : '1px solid rgba(225,112,85,0.25)' }}>
                  <div className="flex justify-between gap-2">
                    <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{gap.name}</span>
                    <span className="font-mono text-[10px]" style={{ color: gap.isImproved ? 'var(--color-accent-green)' : 'var(--color-accent-warning)' }}>{gap.isImproved ? 'Improved' : `${Math.round(gap.severity * 100)}%`}</span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{gap.reason}</p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No gaps detected" body="Analysis results will appear here." />
          )}
        </Section>

        {planning.districtProfiles.length > 0 && (
          <Section title="Districts">
            <div className="grid gap-2">
              {planning.districtProfiles.slice(0, 7).map((district) => (
                <button
                  key={district.id}
                  onClick={() => selectDistrict(district.id)}
                  className="rounded-xl p-3 text-left"
                  style={{ background: planning.selectedDistrictId === district.id ? 'var(--color-bg-hover)' : 'var(--color-bg-card)', border: planning.selectedDistrictId === district.id ? '1px solid rgba(0,212,255,0.35)' : '1px solid var(--color-border-subtle)' }}
                >
                  <div className="flex justify-between gap-2">
                    <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{district.name}</span>
                    <span className="font-mono text-[10px]" style={{ color: 'var(--color-accent-warning)' }}>{Math.round(district.severity * 100)}%</span>
                  </div>
                  <p className="mt-1 text-xs" style={{ color: 'var(--color-text-secondary)' }}>{district.mainIssue} · {district.populationAffected.toLocaleString()} affected</p>
                  <div className="mt-1 font-mono text-[10px]" style={{ color: 'var(--color-accent-cyan)' }}>{district.recommendedFix} · {district.beforeScore} to {district.afterScore}</div>
                </button>
              ))}
            </div>
          </Section>
        )}
      </div>
    </aside>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 font-mono text-[11px] uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>{title}</h2>
      {children}
    </section>
  )
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl p-4 text-center" style={{ background: 'var(--color-bg-card)', border: '1px dashed var(--color-border-subtle)' }}>
      <div className="text-sm font-semibold" style={{ color: 'var(--color-text-secondary)' }}>{title}</div>
      <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>{body}</p>
    </div>
  )
}

function Impact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg p-2" style={{ background: 'rgba(0,0,0,0.16)', border: '1px solid var(--color-border-subtle)' }}>
      <div className="font-mono text-[9px] uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>{label}</div>
      <div className="mt-0.5 font-mono text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>{value}</div>
    </div>
  )
}

function Metric({ label, before, after, inverse = false }: { label: string; before: number; after?: number; inverse?: boolean }) {
  const currentAfter = after ?? before
  const delta = Math.round((currentAfter - before) * 10) / 10
  const improved = inverse ? delta < 0 : delta > 0
  const unchanged = Math.abs(delta) < 0.1
  return (
    <div className="rounded-xl p-3" style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border-subtle)' }}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
        <span className="font-mono text-[11px]" style={{ color: unchanged ? 'var(--color-text-muted)' : improved ? 'var(--color-accent-green)' : 'var(--color-accent-danger)' }}>
          {delta > 0 ? '+' : ''}{delta}
        </span>
      </div>
      <div className="mt-1 font-mono text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
        {before} <span style={{ color: 'var(--color-text-muted)' }}>to</span> {currentAfter}
      </div>
    </div>
  )
}
