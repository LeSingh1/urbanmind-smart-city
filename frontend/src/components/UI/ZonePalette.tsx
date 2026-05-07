import { motion, AnimatePresence } from 'framer-motion'
import { X, Crosshair, Undo2, Save } from 'lucide-react'
import { getZoneColor } from '@/utils/colorUtils'
import { useUIStore } from '@/stores/uiStore'
import { useSimulationStore } from '@/stores/simulationStore'

const ZONE_CATEGORIES: { label: string; zones: { id: string; label: string }[] }[] = [
  {
    label: 'Residential',
    zones: [
      { id: 'RES_LOW_DETACHED',  label: 'Low Density Housing' },
      { id: 'RES_MED_APARTMENT', label: 'Medium Density' },
      { id: 'RES_HIGH_TOWER',    label: 'High Rise Tower' },
      { id: 'RES_AFFORDABLE',    label: 'Affordable Housing' },
    ],
  },
  {
    label: 'Commercial & Industrial',
    zones: [
      { id: 'COM_SMALL_SHOP',   label: 'Commercial District' },
      { id: 'COM_OFFICE_PLAZA', label: 'Office Plaza' },
      { id: 'IND_WAREHOUSE',    label: 'Industrial Zone' },
      { id: 'CARGO_TERMINAL',   label: 'Cargo / Logistics Hub' },
    ],
  },
  {
    label: 'Utilities & Infrastructure',
    zones: [
      { id: 'POWER_PLANT',        label: 'Power Plant / Grid' },
      { id: 'WATER_PUMP_STATION', label: 'Water Pumping Station' },
      { id: 'SEWAGE_TREATMENT',   label: 'Sewage Treatment' },
      { id: 'TELECOM_TOWER',      label: 'Telecom / Internet' },
    ],
  },
  {
    label: 'Transport',
    zones: [
      { id: 'BUS_STATION',        label: 'Public Transit Hub' },
      { id: 'TRAIN_STATION',      label: 'Train Station / Rail' },
    ],
  },
  {
    label: 'Safety & Government',
    zones: [
      { id: 'GOV_POLICE_STATION', label: 'Police Station' },
      { id: 'DIS_FIRE_STATION',   label: 'Fire Station' },
      { id: 'GOV_CITY_HALL',      label: 'City Hall / Gov Center' },
    ],
  },
  {
    label: 'Health & Education',
    zones: [
      { id: 'HEALTH_HOSPITAL', label: 'Hospital' },
      { id: 'HEALTH_CLINIC',   label: 'Medical Clinic' },
      { id: 'EDU_ELEMENTARY',  label: 'Elementary School' },
      { id: 'EDU_HIGH',        label: 'High School' },
    ],
  },
  {
    label: 'Green Space & Waste',
    zones: [
      { id: 'PARK_SMALL',        label: 'Park / Recreation' },
      { id: 'ENV_TREE_CORRIDOR', label: 'Tree Corridor' },
      { id: 'WASTE_LANDFILL',    label: 'Landfill' },
      { id: 'WASTE_RECYCLING',   label: 'Recycling Center' },
    ],
  },
]

export function ZonePalette({ compact = false }: { compact?: boolean }) {
  const { isOverrideModeActive, selectedOverrideZone, setOverrideZone } = useUIStore()
  const { planning, undoInfrastructure, saveScenario } = useSimulationStore()

  const toggleMode = () => {
    if (isOverrideModeActive) setOverrideZone(null)
  }

  return (
    <div className={compact ? 'space-y-3' : 'p-3 space-y-3'}>
      {/* Instructions */}
      <div
        className="rounded-lg p-3 text-xs leading-relaxed"
        style={{
          background: 'var(--color-bg-hover)',
          border: '1px solid var(--color-border-subtle)',
          boxShadow: 'var(--shadow-inset)',
          color: 'var(--color-text-muted)',
        }}
      >
        {selectedOverrideZone
          ? selectedOverrideZone === 'HEALTH_CLINIC'
            ? 'Placing clinic: click inside an underserved emergency zone.'
            : `Placing ${selectedOverrideZone.replace(/_/g, ' ').toLowerCase()}: click a valid area on the map.`
          : 'Select a tool, then click a valid area on the map.'}
      </div>

      <div className="grid grid-cols-2 gap-1">
        {[
          ['Select', ''],
          ['Add Clinic', 'HEALTH_CLINIC'],
          ['Add School', 'EDU_HIGH'],
          ['Add Park', 'PARK_SMALL'],
          ['Add Transit Stop', 'BUS_STATION'],
          ['Add Housing Zone', 'RES_MED_APARTMENT'],
        ].map(([label, id]) => (
          <button
            key={id}
            onClick={() => setOverrideZone(id || null)}
            className="px-2 py-1.5 rounded-lg text-left"
            style={{
              border: selectedOverrideZone === id ? `1px solid ${getZoneColor(id)}66` : '1px solid var(--color-border-subtle)',
              background: selectedOverrideZone === id ? `${getZoneColor(id)}18` : 'transparent',
              color: selectedOverrideZone === id ? getZoneColor(id) : 'var(--color-text-secondary)',
              fontSize: 10,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-1">
        <button
          onClick={undoInfrastructure}
          className="flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px]"
          style={{ border: '1px solid var(--color-border-subtle)', color: 'var(--color-text-muted)' }}
        >
          <Undo2 size={10} /> Undo
        </button>
        <button
          onClick={saveScenario}
          className="flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px]"
          style={{ border: '1px solid var(--color-border-active)', color: 'var(--color-accent-cyan)' }}
        >
          <Save size={10} /> Save
        </button>
      </div>

      {/* Override mode toggle */}
      <motion.button
        onClick={toggleMode}
        disabled={!planning.hasAnalyzed || !isOverrideModeActive}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        className="w-full py-2 rounded-lg text-xs font-semibold font-display tracking-wide disabled:opacity-40 disabled:cursor-not-allowed"
        style={
          isOverrideModeActive
            ? { background: 'var(--color-bg-hover)', color: 'var(--color-accent-warning)', border: '1px solid rgba(108,92,231,0.4)', boxShadow: 'var(--shadow-pressed)' }
            : { background: 'var(--color-bg-hover)', color: 'var(--color-accent-cyan)', border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-sm)' }
        }
      >
        {isOverrideModeActive
          ? <><X size={11} className="inline mr-1" />Exit Override Mode</>
          : <><Crosshair size={11} className="inline mr-1" />Choose a tool above</>}
      </motion.button>

      {/* Zone categories */}
      {!compact && ZONE_CATEGORIES.map(({ label, zones }) => (
        <div key={label}>
          <div
            className="font-mono text-[9px] tracking-widest uppercase mb-1.5 flex items-center gap-1.5"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <span className="inline-block w-2 h-px" style={{ background: 'var(--color-border-subtle)' }} />
            {label}
          </div>
          <div className="grid grid-cols-2 gap-1">
            {zones.map(({ id, label: zLabel }) => {
              const active = selectedOverrideZone === id
              const color = getZoneColor(id)
              return (
                <motion.button
                  key={id}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setOverrideZone(selectedOverrideZone === id ? null : id)}
                  className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-left"
                  style={
                    active
                      ? { background: `${color}18`, border: `1px solid ${color}66` }
                      : { background: 'transparent', border: '1px solid var(--color-border-subtle)' }
                  }
                >
                  <div className="w-3 h-3 rounded-sm shrink-0" style={{ background: color }} />
                  <span
                    className="font-display text-[10px] truncate"
                    style={{ color: active ? color : 'var(--color-text-secondary)' }}
                    title={zLabel}
                  >
                    {zLabel}
                  </span>
                </motion.button>
              )
            })}
          </div>
        </div>
      ))}

      {/* Clear */}
      <AnimatePresence>
        {selectedOverrideZone && (
          <motion.button
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onClick={() => setOverrideZone(null)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="w-full py-1.5 rounded-lg text-[10px] font-mono tracking-wide overflow-hidden"
            style={{ border: '1px dashed var(--color-border-subtle)', color: 'var(--color-text-muted)' }}
          >
            CLEAR SELECTION
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}
