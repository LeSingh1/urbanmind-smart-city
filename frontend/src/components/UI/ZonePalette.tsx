import { motion } from 'framer-motion'
import { getZoneColor } from '@/utils/colorUtils'
import { useUIStore } from '@/stores/uiStore'
import { useSimulationStore } from '@/stores/simulationStore'

const ZONE_CATEGORIES: { label: string; zones: string[] }[] = [
  { label: 'Residential', zones: ['RES_LOW_DETACHED', 'RES_MED_APARTMENT', 'RES_HIGH_TOWER'] },
  { label: 'Commercial', zones: ['COM_SMALL_SHOP', 'COM_OFFICE_PLAZA'] },
  { label: 'Green Space', zones: ['PARK_SMALL', 'ENV_TREE_CORRIDOR'] },
  { label: 'Health & Edu', zones: ['HEALTH_HOSPITAL', 'EDU_HIGH'] },
  { label: 'Infrastructure', zones: ['INFRA_POWER_SUBSTATION', 'BUS_STATION', 'SMART_TRAFFIC_LIGHT'] },
]

const ZONE_LABELS: Record<string, string> = {
  RES_LOW_DETACHED: 'Low Density Res',
  RES_MED_APARTMENT: 'Medium Density',
  RES_HIGH_TOWER: 'High Rise',
  COM_SMALL_SHOP: 'Small Commercial',
  COM_OFFICE_PLAZA: 'Office Plaza',
  PARK_SMALL: 'Small Park',
  ENV_TREE_CORRIDOR: 'Tree Corridor',
  HEALTH_HOSPITAL: 'Hospital',
  EDU_HIGH: 'High School',
  INFRA_POWER_SUBSTATION: 'Power Substation',
  BUS_STATION: 'Bus Station',
  SMART_TRAFFIC_LIGHT: 'Smart Traffic',
}

const ZONE_ICONS: Record<string, string> = {
  RES_LOW_DETACHED: '🏘',
  RES_MED_APARTMENT: '🏢',
  RES_HIGH_TOWER: '🏙',
  COM_SMALL_SHOP: '🏪',
  COM_OFFICE_PLAZA: '🏦',
  PARK_SMALL: '🌳',
  ENV_TREE_CORRIDOR: '🌲',
  HEALTH_HOSPITAL: '🏥',
  EDU_HIGH: '🏫',
  INFRA_POWER_SUBSTATION: '⚡',
  BUS_STATION: '🚌',
  SMART_TRAFFIC_LIGHT: '🚦',
}

export function ZonePalette() {
  const { isOverrideModeActive, selectedOverrideZone, setOverrideZone } = useUIStore()
  const sessionId = useSimulationStore((state) => state.sessionId)

  const handleZoneSelect = (zone: string) => {
    setOverrideZone(selectedOverrideZone === zone ? null : zone)
  }

  const toggleMode = () => {
    setOverrideZone(isOverrideModeActive ? null : (selectedOverrideZone ?? 'RES_LOW_DETACHED'))
  }

  return (
    <div className="p-3 space-y-3">
      {/* Instructions */}
      <div
        className="rounded-lg p-3 text-xs leading-relaxed"
        style={{
          background: 'rgba(0,212,255,0.04)',
          border: '1px solid var(--color-border-subtle)',
          color: 'var(--color-text-muted)',
        }}
      >
        Select a zone type, then click the map to place it. The AI calculates the impact of your override.
      </div>

      {/* Toggle */}
      <motion.button
        onClick={toggleMode}
        disabled={!sessionId}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        className="w-full py-2 rounded-lg text-xs font-semibold font-display tracking-wide disabled:opacity-40 disabled:cursor-not-allowed"
        style={
          isOverrideModeActive
            ? {
                background: 'rgba(255,184,0,0.08)',
                color: 'var(--color-accent-warning)',
                border: '1px solid rgba(255,184,0,0.3)',
                boxShadow: '0 0 10px rgba(255,184,0,0.15)',
              }
            : {
                background: 'rgba(0,212,255,0.06)',
                color: 'var(--color-accent-cyan)',
                border: '1px solid rgba(0,212,255,0.25)',
              }
        }
      >
        {isOverrideModeActive ? '✕ Exit Override Mode' : '◈ Enter Override Mode'}
      </motion.button>

      {/* Zone categories */}
      {ZONE_CATEGORIES.map(({ label, zones }) => (
        <div key={label}>
          <div
            className="font-mono text-[9px] tracking-widest uppercase mb-1.5 flex items-center gap-1.5"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <span
              className="inline-block w-2 h-px"
              style={{ background: 'var(--color-accent-cyan)', opacity: 0.4 }}
            />
            {label}
          </div>
          <div className="grid grid-cols-2 gap-1">
            {zones.map((zone) => {
              const active = selectedOverrideZone === zone
              const color = getZoneColor(zone)
              return (
                <motion.button
                  key={zone}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => handleZoneSelect(zone)}
                  className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-left"
                  style={
                    active
                      ? {
                          background: `${color}18`,
                          border: `1px solid ${color}66`,
                          boxShadow: `0 0 8px ${color}25`,
                        }
                      : {
                          background: 'transparent',
                          border: '1px solid var(--color-border-subtle)',
                        }
                  }
                >
                  <span className="text-sm shrink-0">{ZONE_ICONS[zone] ?? '⬜'}</span>
                  <span
                    className="font-display text-[10px] truncate"
                    style={{ color: active ? color : 'var(--color-text-secondary)' }}
                  >
                    {ZONE_LABELS[zone] ?? zone}
                  </span>
                </motion.button>
              )
            })}
          </div>
        </div>
      ))}

      {/* Clear */}
      <motion.button
        onClick={() => setOverrideZone(null)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        className="w-full py-1.5 rounded-lg text-[10px] font-mono tracking-wide"
        style={{
          border: '1px dashed var(--color-border-subtle)',
          color: 'var(--color-text-muted)',
        }}
      >
        CLEAR SELECTION
      </motion.button>
    </div>
  )
}
