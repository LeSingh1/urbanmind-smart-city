import { FileText, Radar, Search } from 'lucide-react'
import { useCityStore } from '@/stores/cityStore'
import { useScenarioStore } from '@/stores/scenarioStore'
import {
  COPILOT_RESCAN_MIN_YEAR,
  currentPlanningYear,
  useSimulationStore,
} from '@/stores/simulationStore'
import { useNotification } from '@/hooks/useNotification'
import { Logo } from '@/components/UI/LandingScreen'
import { ArchitectureBadge } from '@/components/UI/ArchitectureModal'

export function TopBar({ onHome }: { onHome: () => void }) {
  const selectedCity = useCityStore((state) => state.selectedCity)
  const activeScenario = useScenarioStore((state) => state.activeScenario)
  const currentYear = useSimulationStore((state) => state.currentYear)
  const { planning, analyzeDemo, copilotRescanLateGame, openReport } = useSimulationStore()
  const notify = useNotification((state) => state.notify)

  const simYear = currentPlanningYear(currentYear, planning.timelineYear)

  const handlePrimaryPlanningClick = async () => {
    if (!selectedCity) {
      notify('warning', 'Choose a city before running infrastructure analysis.', 2400)
      return
    }
    if (planning.hasAppliedAIPlan && simYear >= COPILOT_RESCAN_MIN_YEAR && planning.cityId === 'fremon') {
      await copilotRescanLateGame(activeScenario)
      return
    }
    await analyzeDemo(selectedCity.id, activeScenario)
  }

  const primaryDisabled = !selectedCity || (planning.hasAppliedAIPlan && simYear < COPILOT_RESCAN_MIN_YEAR)

  let primaryLabel = 'Analyze Infrastructure Gaps'
  let primaryTitle = 'Run the gap engine and Copilot for the selected city.'
  if (planning.hasAnalyzed && !planning.hasAppliedAIPlan) {
    primaryLabel = 'Re-run gap analysis'
    primaryTitle = 'Start analysis over from the baseline map (use after changing scenario or budget).'
  } else if (planning.hasAppliedAIPlan && simYear < COPILOT_RESCAN_MIN_YEAR) {
    primaryLabel = `Rescan (${COPILOT_RESCAN_MIN_YEAR}+)`
    primaryTitle = `Advance the timeline to ${COPILOT_RESCAN_MIN_YEAR} or later after applying a plan — then Copilot can rescan the map for new recommendations and Phase 2.`
  } else if (planning.hasAppliedAIPlan && planning.cityId === 'fremon') {
    primaryLabel = 'Rescan map · new Copilot plan'
    primaryTitle =
      'Late-game only: clears the applied AI / Phase 2 placements from the map, reruns the validated engine, and refreshes Copilot for the current year.'
  } else if (planning.hasAppliedAIPlan) {
    primaryLabel = 'Rescan unavailable'
    primaryTitle = 'Late-game Copilot rescan is available on the Fremon demo in this build.'
  }

  const PrimaryIcon = planning.hasAppliedAIPlan && simYear >= COPILOT_RESCAN_MIN_YEAR && planning.cityId === 'fremon' ? Radar : Search

  return (
    <header
      className="relative flex h-[4.25rem] shrink-0 items-center gap-4 px-6"
      style={{
        background: 'linear-gradient(180deg, rgba(255,255,255,0.97) 0%, rgba(248,250,252,0.94) 100%)',
        borderBottom: '1px solid rgba(203, 213, 225, 0.85)',
        boxShadow: '0 4px 24px rgba(15, 23, 42, 0.06)',
      }}
    >
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(var(--rgb-accent), 0.45), transparent)',
        }}
        aria-hidden
      />

      <div className="relative flex min-w-0 items-center gap-3">
        <button
          onClick={onHome}
          className="-ml-1 rounded-xl px-2 py-1.5 transition-colors hover:bg-slate-100/80"
          style={{ border: '1px solid transparent', background: 'transparent' }}
          aria-label="Go to home page"
          title="Home"
        >
          <Logo />
        </button>
      </div>

      <div className="relative h-9 w-px shrink-0 bg-slate-200/90" />

      <div className="relative min-w-0">
        <div className="font-mono text-[9px] uppercase tracking-[0.2em]" style={{ color: 'var(--color-text-muted)' }}>
          Selected City
        </div>
        <div className="truncate font-semibold tracking-tight" style={{ color: 'var(--color-text-primary)', fontSize: '0.9375rem' }}>
          {selectedCity?.name ?? 'No city selected'}
        </div>
      </div>

      <span
        className="relative hidden rounded-full px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider md:inline-flex"
        style={{
          color: 'var(--color-accent-green)',
          border: '1px solid rgba(5, 150, 105, 0.25)',
          background: 'linear-gradient(135deg, rgba(5, 150, 105, 0.1), rgba(5, 150, 105, 0.04))',
          boxShadow: 'var(--shadow-xs)',
        }}
      >
        Demo Ready
      </span>

      <div className="relative flex-1" />

      <div className="relative flex items-center gap-2">
        <ArchitectureBadge />

        <button
          type="button"
          onClick={() => void handlePrimaryPlanningClick()}
          disabled={primaryDisabled || (planning.hasAppliedAIPlan && planning.cityId !== 'fremon')}
          title={primaryTitle}
          aria-label={primaryLabel}
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold tracking-tight shadow-sm transition-all disabled:cursor-not-allowed disabled:opacity-45"
          style={{
            color: '#fff',
            border: '1px solid rgba(var(--rgb-accent-dim), 0.35)',
            background: 'linear-gradient(165deg, var(--color-accent-primary) 0%, var(--color-accent-primary-dim) 100%)',
            boxShadow: '0 4px 14px rgba(var(--rgb-accent), 0.35)',
          }}
        >
          <PrimaryIcon size={16} strokeWidth={2.25} />
          {primaryLabel}
        </button>

        <button
          onClick={openReport}
          disabled={!planning.hasAnalyzed}
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold tracking-tight transition-all disabled:cursor-not-allowed disabled:opacity-40"
          style={{
            color: planning.hasAnalyzed ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
            border: '1px solid var(--color-border-subtle)',
            background: 'var(--color-bg-panel)',
            boxShadow: 'var(--shadow-xs)',
          }}
        >
          <FileText size={16} strokeWidth={2.25} />
          Generate Report
        </button>
      </div>
    </header>
  )
}
