import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getZoneColor } from '@/utils/colorUtils'
import { ChevronDown } from 'lucide-react'

const LEGEND_ITEMS = [
  { id: 'RES_LOW_DETACHED',    label: 'Residential (Low)' },
  { id: 'RES_MED_APARTMENT',   label: 'Residential (Med)' },
  { id: 'RES_HIGH_TOWER',      label: 'Residential (High)' },
  { id: 'COM_OFFICE_PLAZA',    label: 'Commercial / Office' },
  { id: 'IND_WAREHOUSE',       label: 'Industrial' },
  { id: 'PARK_SMALL',          label: 'Parks & Green Space' },
  { id: 'FOREST_RESERVE',      label: 'Forest / Nature Reserve' },
  { id: 'BUS_STATION',         label: 'Transit Hub' },
  { id: 'HEALTH_HOSPITAL',     label: 'Healthcare' },
  { id: 'EDU_HIGH',            label: 'Education' },
  { id: 'SMART_TRAFFIC_LIGHT', label: 'Smart Infrastructure' },
  { id: 'IND_WAREHOUSE_POWER', label: 'Utility / Power' },
]

export function ZoneLegend() {
  const [collapsed, setCollapsed] = useState(true)

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
      style={{
        position: 'absolute',
        bottom: 16,
        left: 16,
        zIndex: 10,
        background: 'rgba(9,14,23,0.90)',
        border: '1px solid rgba(0,212,255,0.16)',
        borderRadius: 10,
        backdropFilter: 'blur(16px)',
        minWidth: 156,
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        overflow: 'hidden',
      }}
    >
      <button
        onClick={() => setCollapsed((v) => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          padding: '7px 10px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'rgba(0,212,255,0.65)',
          gap: 8,
        }}
      >
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
          Zone Legend
        </span>
        <motion.span
          animate={{ rotate: collapsed ? 0 : 180 }}
          transition={{ duration: 0.22 }}
          style={{ display: 'flex' }}
        >
          <ChevronDown size={10} />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            key="legend-items"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '0 10px 9px', display: 'flex', flexDirection: 'column', gap: 5 }}>
              {LEGEND_ITEMS.map(({ id, label }, i) => {
                const color = getZoneColor(id)
                return (
                  <motion.div
                    key={id}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.025, duration: 0.18 }}
                    style={{ display: 'flex', alignItems: 'center', gap: 7 }}
                  >
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: color,
                        flexShrink: 0,
                        boxShadow: `0 0 5px ${color}70`,
                      }}
                    />
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'rgba(255,255,255,0.55)', whiteSpace: 'nowrap' }}>
                      {label}
                    </span>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
