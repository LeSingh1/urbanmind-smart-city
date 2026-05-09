import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Columns2, Download, Pause, Play, RotateCcw, Settings, Share2, SkipBack, SkipForward } from 'lucide-react'
import { Logo } from '@/components/UI/LandingScreen'
import { useCityStore } from '@/stores/cityStore'
import { useScenarioStore } from '@/stores/scenarioStore'
import { useSimulationStore } from '@/stores/simulationStore'
import { useSimulation } from '@/hooks/useSimulation'
import { useUIStore } from '@/stores/uiStore'
import { useNotification } from '@/hooks/useNotification'
import { exportSimulationPdfUrl, isExportableSessionId } from '@/utils/sessionExport'

export function ControlBar({ connectionState }: { connectionState: string }) {
  const selectedCity = useCityStore((state) => state.selectedCity)
  const currentYear = useSimulationStore((state) => state.currentYear)
  const frameHistory = useSimulationStore((state) => state.frameHistory)
  const isRunning = useSimulationStore((state) => state.isRunning)
  const isPaused = useSimulationStore((state) => state.isPaused)
  const speed = useSimulationStore((state) => state.speed)
  const setSpeed = useSimulationStore((state) => state.setSpeed)
  const scrubToYear = useSimulationStore((state) => state.scrubToYear)
  const reset = useSimulationStore((state) => state.reset)
  const activeScenario = useScenarioStore((state) => state.activeScenario)
  const { start, pause, resume } = useSimulation()
  const isSplitScreen = useUIStore((state) => state.isSplitScreen)
  const setSplitScreen = useUIStore((state) => state.setSplitScreen)
  const notify = useNotification((s) => s.notify)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const sessionId = useSimulationStore((state) => state.sessionId)

  const play = () => {
    if (!selectedCity) return
    if (isPaused) resume()
    else if (!isRunning) start(selectedCity.id, activeScenario)
    else pause()
  }

  const step = (direction: 1 | -1) => {
    const years = frameHistory.map((frame) => frame.year)
    const index = Math.max(0, years.indexOf(currentYear))
    const next = years[Math.max(0, Math.min(years.length - 1, index + direction))]
    if (next !== undefined) scrubToYear(next)
  }

  return (
    <header style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 56, zIndex: 50, background: 'linear-gradient(180deg, rgba(255,255,255,0.97) 0%, rgba(248,250,252,0.95) 100%)', borderBottom: '1px solid rgba(203, 213, 225, 0.85)', boxShadow: '0 4px 20px rgba(15, 23, 42, 0.06)' }} onKeyDown={(event) => {
      if (event.code === 'Space') {
        event.preventDefault()
        play()
      }
      if (event.key === 'ArrowLeft') step(-1)
      if (event.key === 'ArrowRight') step(1)
    }}>
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', gap: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 260 }}>
          <Logo />
          <span style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>to {selectedCity?.name}</span>
        </div>
        <div style={{ display: 'grid', placeItems: 'center', minWidth: 170 }}>
          <span style={{ color: 'var(--color-text-muted)', fontSize: 10, fontWeight: 700, letterSpacing: 1.4 }}>YEAR</span>
          <AnimatePresence mode="popLayout">
            <motion.strong
              key={currentYear}
              initial={{ y: 18, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -18, opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ marginTop: -4, fontSize: 36, lineHeight: 0.9, fontWeight: 800, color: 'var(--color-accent-primary)', letterSpacing: '-0.02em' }}
              aria-live="polite"
            >
              {currentYear}
            </motion.strong>
          </AnimatePresence>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="icon-btn" aria-label="Reset" onClick={reset}><RotateCcw size={17} /></button>
          <button className="icon-btn" aria-label="Step back" onClick={() => step(-1)}><SkipBack size={17} /></button>
          <button className="icon-btn" aria-label="Play or pause" onClick={play} style={{ width: 44, height: 44, color: 'white', borderColor: 'rgba(var(--rgb-accent-dim), 0.45)', background: 'linear-gradient(165deg, var(--color-accent-primary) 0%, var(--color-accent-primary-dim) 100%)', boxShadow: '0 4px 14px rgba(var(--rgb-accent), 0.35)' }}>
            {isRunning ? <Pause size={19} /> : <Play size={19} />}
          </button>
          <button className="icon-btn" aria-label="Step forward" onClick={() => step(1)}><SkipForward size={17} /></button>
          <select value={speed} onChange={(event) => setSpeed(Number(event.target.value))} style={{ height: 36, border: '1px solid var(--color-border-subtle)', borderRadius: 8, background: 'var(--color-bg-panel)', color: 'var(--color-brand-secondary)', padding: '0 8px', fontWeight: 700 }}>
            {[1, 5, 10, 50].map((value) => <option key={value} value={value}>{value}x</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 160, justifyContent: 'flex-end' }}>
          <span style={{ color: 'var(--color-text-muted)', fontSize: 11, textTransform: 'uppercase' }}>{connectionState}</span>
          <button className="icon-btn" aria-label="Share" onClick={() => { navigator.clipboard.writeText(window.location.href); notify('success', 'Link copied to clipboard.', 2500) }}><Share2 size={17} /></button>
          <button className="icon-btn" aria-label="Compare scenarios" onClick={() => setSplitScreen(!isSplitScreen)}><Columns2 size={17} /></button>
          <button
            className="icon-btn"
            aria-label="Export PDF"
            title={
              !isExportableSessionId(sessionId)
                ? 'PDF requires a backend simulation session'
                : 'Download PDF report'
            }
            onClick={() => {
            if (!isExportableSessionId(sessionId)) {
              notify(
                'warning',
                'PDF export needs a live simulation from the backend. Start the API with Docker (or npm run dev + backend) and run Play on the timeline, or use Print / Save from the report modal while offline.',
                6000,
              )
              return
            }
            window.open(exportSimulationPdfUrl(sessionId), '_blank')
          }}
          ><Download size={17} /></button>
          <button className="icon-btn" aria-label="Settings" onClick={() => setSettingsOpen(true)}><Settings size={17} /></button>
          <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
        </div>
      </div>
      <div style={{ position: 'absolute', bottom: 0, left: 0, height: 2, width: `${Math.min(100, Math.max(0, (currentYear >= 2026 ? ((currentYear - 2026) / (2101 - 2026)) * 100 : 0)))}%`, background: 'var(--color-brand-accent)', transition: 'width 400ms ease' }} />
    </header>
  )
}
