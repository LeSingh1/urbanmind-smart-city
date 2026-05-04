import { useState } from 'react'
import { getZoneColor } from '@/utils/colorUtils'
import { ChevronDown, ChevronUp } from 'lucide-react'

const LEGEND_ITEMS = [
  { id: 'RES_LOW_DETACHED', label: 'Residential (Low)' },
  { id: 'RES_MED_APARTMENT', label: 'Residential (Med)' },
  { id: 'RES_HIGH_TOWER', label: 'Residential (High)' },
  { id: 'COM_OFFICE_PLAZA', label: 'Commercial / Office' },
  { id: 'IND_WAREHOUSE', label: 'Industrial' },
  { id: 'PARK_SMALL', label: 'Parks & Green Space' },
  { id: 'FOREST_RESERVE', label: 'Forest / Nature Reserve' },
  { id: 'BUS_STATION', label: 'Transit Hub' },
  { id: 'HEALTH_HOSPITAL', label: 'Healthcare' },
  { id: 'EDU_HIGH', label: 'Education' },
  { id: 'SMART_TRAFFIC_LIGHT', label: 'Smart Infrastructure' },
  { id: 'IND_WAREHOUSE_POWER', label: 'Utility / Power' },
]

export function ZoneLegend() {
  const [collapsed, setCollapsed] = useState(true)

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 16,
        left: 16,
        zIndex: 10,
        background: 'rgba(11,17,28,0.88)',
        border: '1px solid rgba(0,212,255,0.18)',
        borderRadius: 8,
        backdropFilter: 'blur(12px)',
        minWidth: 152,
        boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
      }}
    >
      <button
        onClick={() => setCollapsed((v) => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          padding: '6px 10px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'rgba(0,212,255,0.7)',
          gap: 8,
        }}
      >
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          Zone Legend
        </span>
        {collapsed ? <ChevronDown size={10} /> : <ChevronUp size={10} />}
      </button>

      {!collapsed && (
        <div style={{ padding: '0 10px 8px', display: 'flex', flexDirection: 'column', gap: 5 }}>
          {LEGEND_ITEMS.map(({ id, label }) => (
            <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 2,
                  background: getZoneColor(id),
                  flexShrink: 0,
                  boxShadow: `0 0 4px ${getZoneColor(id)}60`,
                }}
              />
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9,
                  color: 'rgba(255,255,255,0.6)',
                  whiteSpace: 'nowrap',
                }}
              >
                {label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
