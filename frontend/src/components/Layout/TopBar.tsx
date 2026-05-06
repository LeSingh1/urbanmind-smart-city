import { motion } from 'framer-motion'
import { Database, FileText, RefreshCw, Save, Search, Sparkles, Wifi, WifiOff } from 'lucide-react'
import { useSimulationStore } from '@/stores/simulationStore'
import { useCityStore } from '@/stores/cityStore'
import { useScenarioStore, scenarioLabels } from '@/stores/scenarioStore'
import { useWebSocket } from '@/hooks/useWebSocket'
import { useNotification } from '@/hooks/useNotification'
import { Logo } from '@/components/UI/LandingScreen'

export function TopBar() {
  const { sessionId, currentYear, analyzeDemo, applyAIPlan, planning, openReport, saveScenario } = useSimulationStore()
  const { selectedCity } = useCityStore()
  const { activeScenario } = useScenarioStore()
  const ws = useWebSocket(sessionId)
  const notify = useNotification((s) => s.notify)

  const handleAnalyze = () => {
    if (!selectedCity) return
    analyzeDemo(selectedCity.id, activeScenario)
    notify('success', 'Infrastructure gaps detected for the selected growth scenario.', 2800)
  }

  const handleApplyAIPlan = () => {
    applyAIPlan(activeScenario)
    notify('success', 'AI plan applied. Proposed infrastructure is now on the map.', 2800)
  }

  const handleSave = () => {
    saveScenario()
    notify('success', 'Scenario saved locally.', 2400)
  }

  return (
    <header
      className="h-[72px] shrink-0 flex items-center gap-4 px-5"
      style={{
        background: 'linear-gradient(180deg, rgba(8,13,22,0.94), rgba(11,17,28,0.78))',
        borderBottom: '1px solid rgba(0,212,255,0.13)',
        boxShadow: '0 14px 44px rgba(0,0,0,0.22)',
        backdropFilter: 'blur(18px)',
      }}
    >
      <div className="flex items-center gap-4 min-w-[360px]">
        <div className="rounded-2xl px-3 py-2" style={{ background: 'rgba(0,212,255,0.055)', border: '1px solid rgba(0,212,255,0.16)' }}>
          <Logo />
        </div>
        <div>
          <div className="font-display text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            AI infrastructure planning simulator
          </div>
          <div className="mt-0.5 font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>
            {selectedCity?.name ?? 'No city selected'} · {scenarioLabels[activeScenario]} · {planning.growthPercent}% / {planning.horizonYears}Y
          </div>
        </div>
      </div>

      <div className="hidden xl:flex items-center gap-2">
        <Badge color="var(--color-accent-green)">Demo Mode</Badge>
        <Badge color="var(--color-accent-cyan)" icon={<Database size={11} />}>MapLibre · OSM · Growth Model · UrbanMind Engine</Badge>
        <Badge color={ws.isConnected ? 'var(--color-accent-cyan)' : 'var(--color-accent-warning)'} icon={ws.isConnected ? <Wifi size={11} /> : <WifiOff size={11} />}>
          {ws.isConnected ? 'Live APIs' : 'Seeded Fallback'}
        </Badge>
      </div>

      <div className="flex-1" />

      <div className="hidden lg:flex items-center gap-3">
        <div className="rounded-xl px-3 py-2 min-w-[96px] text-center" style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="font-mono text-[9px] uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>Year</div>
          <motion.div key={currentYear} initial={{ y: -4, opacity: 0.5 }} animate={{ y: 0, opacity: 1 }} className="font-mono text-lg font-bold" style={{ color: 'var(--color-accent-cyan)' }}>
            {currentYear || planning.horizonYears}
          </motion.div>
        </div>
        <MiniScore label="City Health" value={planning.afterScores?.cityHealth ?? planning.beforeScores?.cityHealth} />
        <MiniScore label="Emergency" value={planning.afterScores?.emergencyAccess ?? planning.beforeScores?.emergencyAccess} />
      </div>

      <div className="flex items-center gap-2">
        <TopAction onClick={handleAnalyze} icon={<Search size={14} />} color="var(--color-accent-cyan)">
          Analyze Infrastructure Gaps
        </TopAction>
        <TopAction onClick={handleApplyAIPlan} disabled={!planning.hasAnalyzed || planning.hasAppliedAIPlan} icon={<Sparkles size={14} />} color="var(--color-accent-green)">
          Apply AI Plan
        </TopAction>
        <TopIcon onClick={handleSave} label="Save Scenario" icon={<Save size={15} />} />
        <TopIcon onClick={openReport} label="Generate Planning Report" icon={planning.hasAnalyzed ? <FileText size={15} /> : <RefreshCw size={15} />} disabled={!planning.hasAnalyzed} />
      </div>
    </header>
  )
}

function Badge({ children, color, icon }: { children: React.ReactNode; color: string; icon?: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest" style={{ color, border: `1px solid ${color}33`, background: `${color}0D` }}>
      {icon}
      {children}
    </span>
  )
}

function MiniScore({ label, value }: { label: string; value?: number }) {
  return (
    <div className="rounded-xl px-3 py-2 min-w-[96px]" style={{ background: 'rgba(0,212,255,0.045)', border: '1px solid rgba(0,212,255,0.12)' }}>
      <div className="font-mono text-[9px] uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>{label}</div>
      <div className="font-mono text-lg font-bold" style={{ color: value ? 'var(--color-accent-cyan)' : 'var(--color-text-muted)' }}>{value ?? '--'}</div>
    </div>
  )
}

function TopAction({ children, icon, color, disabled, onClick }: { children: React.ReactNode; icon: React.ReactNode; color: string; disabled?: boolean; onClick: () => void }) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileHover={disabled ? undefined : { y: -1, scale: 1.01 }}
      whileTap={disabled ? undefined : { scale: 0.98 }}
      className="hidden md:inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
      style={{ color, border: `1px solid ${color}55`, background: `linear-gradient(135deg, ${color}18, rgba(255,255,255,0.035))`, boxShadow: disabled ? 'none' : `0 0 20px ${color}12` }}
    >
      {icon}
      {children}
    </motion.button>
  )
}

function TopIcon({ icon, label, disabled, onClick }: { icon: React.ReactNode; label: string; disabled?: boolean; onClick: () => void }) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileHover={disabled ? undefined : { y: -1, scale: 1.04 }}
      whileTap={disabled ? undefined : { scale: 0.95 }}
      aria-label={label}
      title={label}
      className="w-10 h-10 grid place-items-center rounded-xl disabled:opacity-40 disabled:cursor-not-allowed"
      style={{ color: 'var(--color-text-secondary)', border: '1px solid rgba(255,255,255,0.09)', background: 'rgba(255,255,255,0.035)' }}
    >
      {icon}
    </motion.button>
  )
}
