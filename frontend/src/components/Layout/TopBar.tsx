import { useState } from 'react'
import { motion } from 'framer-motion'
import { Play, Pause, Download, Settings, RefreshCw, Zap, Scale, TrendingUp, Leaf, Users, Landmark, RotateCcw } from 'lucide-react'
import { useSimulationStore } from '@/stores/simulationStore'
import { useCityStore } from '@/stores/cityStore'
import { useScenarioStore, scenarioColors, scenarioLabels } from '@/stores/scenarioStore'
import { useSimulation } from '@/hooks/useSimulation'
import { useWebSocket } from '@/hooks/useWebSocket'
import { useNotification } from '@/hooks/useNotification'
import { Logo } from '@/components/UI/LandingScreen'
import type { ScenarioId } from '@/types/city.types'

const SCENARIO_IDS: ScenarioId[] = ['balanced', 'max_growth', 'climate_resilient', 'equity_focused', 'historic']

const SCENARIO_ICONS: Record<ScenarioId, React.ElementType> = {
  balanced: Scale,
  max_growth: TrendingUp,
  climate_resilient: Leaf,
  equity_focused: Users,
  historic: Landmark,
}

export function TopBar() {
  const { isRunning, isPaused, currentYear, sessionId, metricsHistory, frameHistory } = useSimulationStore()
  const { selectedCity } = useCityStore()
  const { activeScenario, setScenario } = useScenarioStore()
  const { start, pause, resume } = useSimulation()
  const reset = useSimulationStore((s) => s.reset)
  const ws = useWebSocket(sessionId)
  const notify = useNotification((s) => s.notify)
  const [starting, setStarting] = useState(false)

  const totalSteps = 50
  const progress = (currentYear / totalSteps) * 100

  const status = isRunning && !isPaused
    ? 'running'
    : isPaused
    ? 'paused'
    : sessionId && !isRunning && metricsHistory.length > 0
    ? 'completed'
    : 'idle'

  const handleStart = async () => {
    if (!selectedCity) return
    setStarting(true)
    await start(selectedCity.id, activeScenario)
    setStarting(false)
  }

  const handleExport = () => {
    const last = frameHistory.at(-1)
    if (!last) return
    const blob = new Blob([JSON.stringify(last, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `urbanmind-${selectedCity?.id ?? 'sim'}-year${currentYear}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const statusColor =
    status === 'running' ? 'var(--color-accent-cyan)' :
    status === 'paused' ? 'var(--color-accent-warning)' :
    status === 'completed' ? 'var(--color-accent-green)' :
    'var(--color-text-muted)'

  const scenarioColor = scenarioColors[activeScenario]

  return (
    <div
      className="flex items-center gap-4 px-4 h-14 shrink-0"
      style={{
        background: 'var(--color-bg-sidebar)',
        borderBottom: '1px solid var(--color-border-subtle)',
        boxShadow: 'none',
      }}
    >
      {/* Logo + city */}
      <div className="flex items-center gap-3 shrink-0">
        <Logo />
        <div className="w-px h-5 opacity-30" style={{ background: 'var(--color-accent-cyan)' }} />
        <span
          className="font-mono text-xs tracking-widest uppercase"
          style={{ color: 'var(--color-text-muted)', letterSpacing: '0.15em' }}
        >
          {selectedCity?.name ?? '——'}
        </span>
      </div>

      <div className="w-px h-8" style={{ background: 'var(--color-border-subtle)' }} />

      {/* Scenario selector */}
      <div className="flex gap-1">
        {SCENARIO_IDS.map((id) => {
          const active = activeScenario === id
          const color = scenarioColors[id]
          return (
            <motion.button
              key={id}
              onClick={() => {
                setScenario(id)
                if (isRunning) ws.send({ type: 'CHANGE_SCENARIO', scenario_id: id })
              }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="px-2.5 py-1 rounded-md text-xs font-display font-medium transition-all"
              style={
                active
                  ? { background: `${color}18`, color, border: `1px solid ${color}45` }
                  : { color: 'var(--color-text-muted)', border: '1px solid transparent' }
              }
              title={scenarioLabels[id]}
            >
              {(() => { const Icon = SCENARIO_ICONS[id]; return <Icon size={11} className="mr-1 inline-block" /> })()}
              {scenarioLabels[id]}
            </motion.button>
          )
        })}
      </div>

      <div className="w-px h-8" style={{ background: 'var(--color-border-subtle)' }} />

      {/* Year + Progress */}
      <div className="flex items-center gap-3">
        <div className="text-center min-w-[40px]">
          <motion.div
            key={currentYear}
            initial={{ opacity: 0.4, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-mono font-bold text-lg leading-none"
            style={{ color: 'var(--color-accent-cyan)' }}
          >
            {currentYear}
          </motion.div>
          <div className="font-mono text-[9px] tracking-widest uppercase mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            YEAR
          </div>
        </div>
        <div className="min-w-[120px]">
          <div className="flex justify-between mb-1.5">
            <span className="font-mono text-[9px] tracking-widest uppercase" style={{ color: 'var(--color-text-muted)' }}>PROGRESS</span>
            <span className="font-mono text-[9px]" style={{ color: 'var(--color-text-muted)' }}>{progress.toFixed(0)}%</span>
          </div>
          <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--color-bg-card)' }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: 'var(--color-accent-cyan)' }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
        </div>
      </div>

      {/* Status */}
      <div className="flex items-center gap-2">
        <motion.div
          className="w-2 h-2 rounded-full"
          style={{ background: statusColor }}
          animate={status === 'running' ? { opacity: [1, 0.3, 1], scale: [1, 1.3, 1] } : {}}
          transition={{ duration: 1.4, repeat: Infinity }}
        />
        <span className="font-mono text-xs tracking-widest uppercase" style={{ color: 'var(--color-text-muted)' }}>{status}</span>
      </div>

      <div className="flex-1" />

      {/* Controls */}
      <div className="flex items-center gap-2">
        {(status === 'idle' || status === 'completed') ? (
          <motion.button
            onClick={handleStart}
            disabled={starting || !selectedCity}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold font-display disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: 'rgba(0,255,156,0.08)', color: 'var(--color-accent-green)', border: '1px solid rgba(0,255,156,0.3)' }}
          >
            {starting ? <RefreshCw size={13} className="animate-spin" /> : <Play size={13} />}
            {starting ? 'Starting…' : 'Start Simulation'}
          </motion.button>
        ) : status === 'running' ? (
          <motion.button
            onClick={pause}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold font-display"
            style={{ background: 'rgba(255,184,0,0.08)', color: 'var(--color-accent-warning)', border: '1px solid rgba(255,184,0,0.3)' }}
          >
            <Pause size={13} /> Pause
          </motion.button>
        ) : status === 'paused' ? (
          <motion.button
            onClick={resume}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold font-display"
            style={{ background: 'rgba(0,255,156,0.08)', color: 'var(--color-accent-green)', border: '1px solid rgba(0,255,156,0.3)' }}
          >
            <Play size={13} /> Resume
          </motion.button>
        ) : null}

        <motion.button
          onClick={reset}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center justify-center w-8 h-8 rounded-lg"
          style={{ border: '1px solid var(--color-border-subtle)', color: 'var(--color-text-muted)', background: 'var(--color-bg-panel)' }}
          title="Reset simulation"
        >
          <RotateCcw size={13} />
        </motion.button>

        {sessionId && (
          <motion.button
            onClick={handleExport}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center justify-center w-8 h-8 rounded-lg"
            style={{ border: '1px solid var(--color-border-subtle)', color: 'var(--color-text-muted)', background: 'var(--color-bg-panel)' }}
            title="Export simulation data as JSON"
          >
            <Download size={13} />
          </motion.button>
        )}

        <motion.button
          onClick={() => notify('info', 'Settings panel coming soon.', 2500)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center justify-center w-8 h-8 rounded-lg"
          style={{ border: '1px solid var(--color-border-subtle)', color: 'var(--color-text-muted)', background: 'var(--color-bg-panel)' }}
          title="Settings"
        >
          <Settings size={13} />
        </motion.button>

        <div
          className="flex items-center gap-1.5 px-2 py-1 rounded-md font-mono text-[10px] tracking-widest uppercase"
          style={{
            color: ws.isConnected ? 'var(--color-accent-cyan)' : 'var(--color-accent-danger)',
            border: `1px solid ${ws.isConnected ? 'rgba(0,212,255,0.2)' : 'rgba(255,51,102,0.2)'}`,
            background: ws.isConnected ? 'rgba(0,212,255,0.05)' : 'rgba(255,51,102,0.05)',
          }}
        >
          <Zap size={9} />
          {ws.isConnected ? 'LIVE' : 'OFF'}
        </div>
      </div>
    </div>
  )
}
