import { FileText, Search } from 'lucide-react'
import { useCityStore } from '@/stores/cityStore'
import { useScenarioStore } from '@/stores/scenarioStore'
import { useSimulationStore } from '@/stores/simulationStore'
import { useNotification } from '@/hooks/useNotification'
import { Logo } from '@/components/UI/LandingScreen'

export function TopBar({ onHome }: { onHome: () => void }) {
  const selectedCity = useCityStore((state) => state.selectedCity)
  const activeScenario = useScenarioStore((state) => state.activeScenario)
  const { planning, analyzeDemo, openReport } = useSimulationStore()
  const notify = useNotification((state) => state.notify)

  const handleAnalyze = () => {
    if (!selectedCity) {
      notify('warning', 'Choose a city before running infrastructure analysis.', 2400)
      return
    }
    analyzeDemo(selectedCity.id, activeScenario)
    notify('success', 'Infrastructure gaps detected for the selected city.', 2400)
  }

  return (
    <header
      className="flex h-16 shrink-0 items-center gap-4 px-5"
      style={{
        background: 'var(--color-bg-sidebar)',
        borderBottom: '1px solid var(--color-border-subtle)',
        boxShadow: '0 2px 14px rgba(0,0,0,0.18)',
      }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onHome}
          className="rounded-lg px-1 py-1"
          style={{ border: '1px solid transparent', background: 'transparent' }}
          aria-label="Go to home page"
          title="Home"
        >
          <Logo />
        </button>
        <div className="hidden sm:block min-w-0">
          <div className="font-display text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            UrbanMind
          </div>
          <div className="text-xs truncate" style={{ color: 'var(--color-text-secondary)' }}>
            AI infrastructure planning simulator
          </div>
        </div>
      </div>

      <div className="h-8 w-px" style={{ background: 'var(--color-border-subtle)' }} />

      <div className="min-w-0">
        <div className="font-mono text-[9px] uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>
          Selected City
        </div>
        <div className="truncate text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          {selectedCity?.name ?? 'No city selected'}
        </div>
      </div>

      <span
        className="hidden rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider md:inline-flex"
        style={{
          color: 'var(--color-accent-green)',
          border: '1px solid rgba(0,184,148,0.28)',
          background: 'rgba(0,184,148,0.07)',
        }}
      >
        Demo data ready
      </span>

      <div className="flex-1" />

      <button
        onClick={handleAnalyze}
        disabled={!selectedCity}
        className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-45"
        style={{
          color: 'var(--color-accent-cyan)',
          border: '1px solid rgba(0,212,255,0.35)',
          background: 'var(--color-bg-hover)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <Search size={15} />
        Analyze Infrastructure Gaps
      </button>

      <button
        onClick={openReport}
        disabled={!planning.hasAnalyzed}
        className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"
        style={{
          color: planning.hasAnalyzed ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
          border: '1px solid var(--color-border-subtle)',
          background: 'var(--color-bg-panel)',
        }}
      >
        <FileText size={15} />
        Report
      </button>
    </header>
  )
}
