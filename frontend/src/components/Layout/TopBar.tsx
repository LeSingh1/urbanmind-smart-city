import { motion } from 'framer-motion'
import { FileText, Search, Sparkles } from 'lucide-react'
import { useSimulationStore } from '@/stores/simulationStore'
import { useCityStore } from '@/stores/cityStore'
import { useScenarioStore, scenarioLabels } from '@/stores/scenarioStore'
import { useNotification } from '@/hooks/useNotification'
import { Logo } from '@/components/UI/LandingScreen'

export function TopBar() {
  const analyzeDemo = useSimulationStore((s) => s.analyzeDemo)
  const applyAIPlan = useSimulationStore((s) => s.applyAIPlan)
  const applyRecommendedPlan = useSimulationStore((s) => s.applyRecommendedPlan)
  const openReport = useSimulationStore((s) => s.openReport)
  const planning = useSimulationStore((s) => s.planning)
  const selectedCity = useCityStore((s) => s.selectedCity)
  const activeScenario = useScenarioStore((s) => s.activeScenario)
  const notify = useNotification((s) => s.notify)

  const handleAnalyze = () => {
    if (!selectedCity) return
    analyzeDemo(selectedCity.id, activeScenario)
    notify('success', 'Infrastructure gap analysis complete. Underserved zones and recommendations are now visible.', 2800)
  }

  const handleApply = () => {
    if (planning.cityId === 'fremon') {
      applyRecommendedPlan()
      notify('success', 'Recommended plan applied. Coverage rings and proposed infrastructure are now on the map.', 2800)
    } else {
      applyAIPlan(activeScenario)
      notify('success', 'AI plan applied. Proposed infrastructure is now on the map.', 2800)
    }
  }

  return (
    <header
      className="h-14 shrink-0 flex items-center gap-4 px-5"
      style={{
        background: 'linear-gradient(180deg, rgba(8,13,22,0.97), rgba(11,17,28,0.90))',
        borderBottom: '1px solid rgba(0,212,255,0.13)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
        backdropFilter: 'blur(18px)',
        zIndex: 30,
      }}
    >
      {/* Logo + title */}
      <div className="flex items-center gap-3 shrink-0">
        <div
          className="rounded-xl px-2 py-1.5"
          style={{ background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.16)' }}
        >
          <Logo />
        </div>
        <div>
          <div
            className="font-display text-sm font-bold tracking-tight"
            style={{ color: 'var(--color-text-primary)' }}
          >
            UrbanMind
          </div>
          <div
            className="font-mono text-[10px] truncate max-w-[260px]"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {selectedCity
              ? `${selectedCity.name} · ${scenarioLabels[activeScenario]}`
              : 'AI infrastructure planning simulator'}
          </div>
        </div>
      </div>

      <div className="flex-1" />

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        <ActionButton
          onClick={handleAnalyze}
          disabled={!selectedCity}
          icon={<Search size={13} />}
          color="var(--color-accent-cyan)"
          borderColor="rgba(0,212,255,0.45)"
          bg="rgba(0,212,255,0.10)"
        >
          Analyze
        </ActionButton>

        {planning.hasAnalyzed && !planning.hasAppliedAIPlan && (
          <ActionButton
            onClick={handleApply}
            icon={<Sparkles size={13} />}
            color="var(--color-accent-green)"
            borderColor="rgba(0,255,156,0.45)"
            bg="rgba(0,255,156,0.10)"
          >
            Apply Plan
          </ActionButton>
        )}

        {planning.hasAnalyzed && (
          <ActionButton
            onClick={openReport}
            icon={<FileText size={13} />}
            color="var(--color-text-secondary)"
            borderColor="rgba(255,255,255,0.14)"
            bg="rgba(255,255,255,0.04)"
          >
            Report
          </ActionButton>
        )}
      </div>
    </header>
  )
}

function ActionButton({
  children,
  icon,
  color,
  borderColor,
  bg,
  disabled,
  onClick,
}: {
  children: React.ReactNode
  icon: React.ReactNode
  color: string
  borderColor: string
  bg: string
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileHover={disabled ? undefined : { y: -1, scale: 1.01 }}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
      style={{ color, border: `1px solid ${borderColor}`, background: bg }}
    >
      {icon}
      {children}
    </motion.button>
  )
}
