import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { useSimulationStore } from '@/stores/simulationStore'
import { useUIStore } from '@/stores/uiStore'

interface Props {
  open: boolean
  onClose: () => void
}

const LAYER_IDS = ['Zones', '3D Buildings']

export function SettingsModal({ open, onClose }: Props) {
  const speed = useSimulationStore((s) => s.speed)
  const setSpeed = useSimulationStore((s) => s.setSpeed)
  const reset = useSimulationStore((s) => s.reset)
  const activeLayers = useUIStore((s) => s.activeLayers)
  const toggleLayer = useUIStore((s) => s.toggleLayer)
  const detailedGrid = useUIStore((s) => s.detailedGrid)
  const setDetailedGrid = useUIStore((s) => s.setDetailedGrid)

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 60,
            background: 'rgba(150,155,165,0.35)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 400,
              maxWidth: '92vw',
              background: 'var(--color-bg-panel)',
              border: '1px solid var(--color-border-light)',
              borderRadius: 16,
              boxShadow: 'var(--shadow-lg)',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid var(--color-border-subtle)' }}>
              <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)' }}>Settings</h2>
              <button
                onClick={onClose}
                style={{ background: 'none', border: '1px solid var(--color-border-subtle)', borderRadius: 6, padding: '4px 6px', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex' }}
              >
                <X size={13} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Simulation speed */}
              <SettingGroup label="Simulation Speed">
                <div style={{ display: 'flex', gap: 8 }}>
                  {([1, 5, 10, 50] as const).map((s) => (
                    <motion.button
                      key={s}
                      onClick={() => setSpeed(s)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      style={{
                        flex: 1,
                        padding: '6px 0',
                        borderRadius: 6,
                        border: speed === s ? '1px solid rgba(255,71,87,0.4)' : '1px solid var(--color-border-subtle)',
                        background: speed === s ? 'var(--color-bg-hover)' : 'var(--color-bg-panel)',
                        color: speed === s ? 'var(--color-accent-cyan)' : 'var(--color-text-muted)',
                        boxShadow: speed === s ? 'var(--shadow-pressed)' : 'var(--shadow-sm)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: 11,
                        cursor: 'pointer',
                        fontWeight: speed === s ? 700 : 400,
                      }}
                    >
                      {s}×
                    </motion.button>
                  ))}
                </div>
              </SettingGroup>

              {/* Map layers */}
              <SettingGroup label="Map Layers">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {LAYER_IDS.map((id) => (
                    <Toggle
                      key={id}
                      label={id}
                      checked={activeLayers.has(id)}
                      onChange={() => toggleLayer(id)}
                    />
                  ))}
                  <Toggle
                    label="Detailed Grid Mode"
                    checked={detailedGrid}
                    onChange={() => setDetailedGrid(!detailedGrid)}
                  />
                </div>
              </SettingGroup>

              {/* Danger zone */}
              <SettingGroup label="Simulation">
                <motion.button
                  onClick={() => { reset(); onClose() }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  style={{
                    width: '100%',
                    padding: '8px 0',
                    borderRadius: 8,
                    border: '1px solid var(--color-brand-danger)',
                    background: 'transparent',
                    color: 'var(--color-brand-danger)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    letterSpacing: '0.08em',
                    cursor: 'pointer',
                    fontWeight: 700,
                  }}
                >
                  RESET SIMULATION
                </motion.button>
              </SettingGroup>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}

function SettingGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 8 }}>
        {label}
      </div>
      {children}
    </div>
  )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <div
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
      onClick={onChange}
    >
      <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{label}</span>
      <motion.div
        style={{
          width: 34,
          height: 18,
          borderRadius: 99,
          border: '1px solid var(--color-border-subtle)',
          background: checked ? 'var(--color-bg-hover)' : 'var(--color-bg-panel)',
          borderColor: checked ? 'rgba(255,71,87,0.4)' : 'var(--color-border-subtle)',
          boxShadow: checked ? 'var(--shadow-inset)' : 'var(--shadow-sm)',
          position: 'relative',
          flexShrink: 0,
        }}
        animate={{ borderColor: checked ? 'rgba(255,71,87,0.4)' : 'var(--color-border-subtle)' }}
      >
        <motion.div
          style={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: checked ? 'var(--color-accent-cyan)' : 'var(--color-text-muted)',
            position: 'absolute',
            top: 2,
          }}
          animate={{ left: checked ? 18 : 2 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
        />
      </motion.div>
    </div>
  )
}
