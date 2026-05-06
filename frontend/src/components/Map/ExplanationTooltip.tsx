import { motion } from 'framer-motion'
import { getZoneColor } from '@/utils/colorUtils'

function humanize(value: string) {
  return value.toLowerCase().split('_').map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ')
}

export function ExplanationTooltip({ hover }: { hover: { x: number; y: number; properties: any } }) {
  const props = hover.properties ?? {}
  const zone: string = props.zone_type_id ?? 'RES_LOW_DETACHED'
  const displayName: string = props.zone_display_name ?? props.building_name ?? humanize(zone)
  const buildingName: string | null = props.building_name ?? null
  const category: string | null = props.category ?? null
  const placementReason: string | null = props.placement_reason ?? null
  const spsScore: number | null = props.sps_score ?? null
  const isKeyInfra: boolean = props.isKeyInfrastructure === true

  const color = getZoneColor(zone)
  const left = hover.x > window.innerWidth - 300 ? hover.x - 280 : hover.x + 14
  const top = hover.y - 10

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      style={{
        position: 'absolute',
        left,
        top,
        zIndex: 20,
        maxWidth: 270,
        padding: '12px 14px',
        borderRadius: 10,
        background: 'var(--color-bg-sidebar)',
        border: `1px solid ${color}44`,
        boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        color: 'white',
        pointerEvents: 'none',
      }}
    >
      {/* Zone name + color dot */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: color,
            flexShrink: 0,
          }}
        />
        <span style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.2 }}>
          {buildingName ?? displayName}
        </span>
      </div>

      {/* Sub-label for named landmarks */}
      {buildingName && (
        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 6, paddingLeft: 18 }}>
          {category ? `${category} · ` : ''}{humanize(zone)}
        </div>
      )}

      {/* Badges row */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: placementReason ? 8 : 0 }}>
        {isKeyInfra && (
          <span style={badgeStyle('#F59E0B', 'rgba(245,158,11,0.12)')}>Key Infrastructure</span>
        )}
        {spsScore != null && (
          <span style={badgeStyle('#60A5FA', 'rgba(96,165,250,0.1)')}>
            SPS {spsScore.toFixed(2)}
          </span>
        )}
      </div>

      {/* Placement reason */}
      {placementReason && (
        <p style={{ margin: 0, fontSize: 12, color: 'rgba(203,213,225,0.85)', lineHeight: 1.55 }}>
          {placementReason}
        </p>
      )}

      <div style={{ marginTop: 8, fontSize: 10, color: 'var(--color-text-muted)', letterSpacing: '0.05em' }}>
        Click to open full details
      </div>
    </motion.div>
  )
}

function badgeStyle(color: string, bg: string): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 10,
    fontWeight: 700,
    padding: '2px 7px',
    borderRadius: 99,
    background: bg,
    color,
    letterSpacing: '0.03em',
  }
}
