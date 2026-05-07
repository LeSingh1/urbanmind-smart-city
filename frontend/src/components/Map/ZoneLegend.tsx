import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { getZoneColor, getZoneToken } from '@/utils/colorUtils'
import { useUIStore } from '@/stores/uiStore'

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
  const highlightedZoneToken = useUIStore((s) => s.highlightedZoneToken)
  const setHighlightedZoneToken = useUIStore((s) => s.setHighlightedZoneToken)

  const handleItemClick = (id: string) => {
    const token = getZoneToken(id)
    setHighlightedZoneToken(highlightedZoneToken === token ? null : token)
  }

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
        background: 'var(--color-bg-sidebar)',
        border: '1px solid var(--color-border-subtle)',
        borderRadius: 10,
        minWidth: 156,
        boxShadow: 'var(--shadow-lg)',
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
          color: 'var(--color-text-muted)',
          gap: 8,
        }}
      >
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
          Zone Legend{highlightedZoneToken ? ' ·' : ''}
        </span>
        {highlightedZoneToken && (
          <span
            style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--color-accent-cyan)', letterSpacing: '0.1em' }}
            onClick={(e) => { e.stopPropagation(); setHighlightedZoneToken(null) }}
          >
            CLEAR
          </span>
        )}
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
            <div style={{ padding: '0 10px 9px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {LEGEND_ITEMS.map(({ id, label }, i) => {
                const color = getZoneColor(id)
                const token = getZoneToken(id)
                const isActive = highlightedZoneToken === token
                const isDimmed = highlightedZoneToken !== null && !isActive

                return (
                  <motion.button
                    key={id}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: isDimmed ? 0.35 : 1, x: 0 }}
                    transition={{ delay: i * 0.025, duration: 0.18 }}
                    onClick={() => handleItemClick(id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 7,
                      background: isActive ? `${color}18` : 'none',
                      border: isActive ? `1px solid ${color}40` : '1px solid transparent',
                      borderRadius: 5,
                      padding: '3px 5px',
                      cursor: 'pointer',
                      width: '100%',
                      textAlign: 'left',
                    }}
                    title={`Filter: ${label}`}
                  >
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: color,
                        flexShrink: 0,
                      }}
                    />
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 9,
                      color: isActive ? color : 'var(--color-text-secondary)',
                      whiteSpace: 'nowrap',
                      fontWeight: isActive ? 700 : 400,
                    }}>
                      {label}
                    </span>
                  </motion.button>
                )
              })}
              <div style={{ marginTop: 2, fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--color-text-muted)', textAlign: 'center' }}>
                Click to filter map
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
