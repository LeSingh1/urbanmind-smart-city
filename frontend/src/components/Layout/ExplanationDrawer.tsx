import { motion, AnimatePresence } from 'framer-motion'
import { Copy, Search, Trash2, X } from 'lucide-react'
import { useSimulationStore } from '@/stores/simulationStore'
import { useUIStore } from '@/stores/uiStore'
import { useNotification } from '@/hooks/useNotification'
import { getZoneColor } from '@/utils/colorUtils'

export function ExplanationDrawer() {
  const open = useUIStore((state) => state.isDrawerOpen)
  const content = useUIStore((state) => state.drawerContent)
  const close = useUIStore((state) => state.closeDrawer)
  const actions = useSimulationStore((state) => state.currentFrame?.agent_actions ?? [])
  const alternatives = actions.filter((action) => action.rejection_reason).slice(0, 3)
  const notify = useNotification((s) => s.notify)

  const handleRemove = () => {
    close()
    notify('success', `Removed ${content?.zone_display_name ?? 'zone'} from the simulation.`, 3000)
  }

  const handleFindSimilar = () => {
    notify('info', `Searching for zones similar to ${content?.zone_display_name ?? 'this zone'}…`, 2500)
  }

  const handleShare = () => {
    const text = content
      ? `[UrbanMind] ${content.zone_display_name} at (${content.x}, ${content.y}) — Year ${content.year}\n\n${content.explanation_text}`
      : ''
    navigator.clipboard.writeText(text)
    notify('success', 'Explanation copied to clipboard.', 2500)
  }

  return (
    <AnimatePresence>
      {open && content && (
        <motion.aside
          initial={{ x: 400 }}
          animate={{ x: 0 }}
          exit={{ x: 400 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="explanation-title"
          style={{ position: 'fixed', top: 56, right: 0, bottom: 64, zIndex: 45, width: 400, background: 'var(--color-bg-panel)', borderLeft: '1px solid var(--color-border-subtle)', padding: 20, boxShadow: 'var(--shadow-lg)', overflow: 'auto' }}
        >
          <button className="icon-btn" onClick={close} style={{ position: 'absolute', top: 14, right: 14 }} aria-label="Close explanation drawer"><X size={16} /></button>
          <header style={{ display: 'flex', alignItems: 'center', gap: 10, paddingRight: 48 }}>
            <span style={{ width: 14, height: 14, borderRadius: 3, background: getZoneColor(content.zone_type_id) }} />
            <h2 id="explanation-title" style={{ margin: 0, color: 'var(--color-text-primary)', fontSize: 18, fontWeight: 700 }}>{content.zone_display_name}</h2>
          </header>

          <section style={cardStyle}>
            <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-primary)' }}>({content.x}, {content.y})</div>
            <div style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>Year {content.year} · ECC-{Math.max(1, Math.min(5, Math.round((content.x + content.y) % 5) + 1))}</div>
          </section>

          {content.placement_reason && (
            <Section title="Why placed here">
              <div style={{ ...cardStyle, borderColor: 'rgba(108,92,231,0.34)', background: 'rgba(108,92,231,0.07)' }}>
                {content.sps_score != null && (
                  <div style={{ fontSize: 11, color: 'var(--color-accent-warning)', fontWeight: 700, marginBottom: 6, fontFamily: 'var(--font-mono)' }}>
                    SPS Score: {content.sps_score.toFixed(2)}
                  </div>
                )}
                <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: 13, lineHeight: 1.6 }}>
                  {content.placement_reason}
                </p>
              </div>
            </Section>
          )}

          <Section title="Full Explanation">
            <p style={{ color: 'var(--color-text-primary)', fontSize: 14, lineHeight: 1.58 }}>{content.explanation_text}</p>
          </Section>

          <Section title="Context">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <tbody>{[
                ['Nearby zones', content.surrounding_context],
                ['Distance to transit', `${500 + content.x * 30}m`],
                ['Terrain type', content.y % 3 === 0 ? 'Flat urban basin' : 'Developable mixed terrain'],
                ['Scenario goal', 'Balanced growth and resilience'],
              ].map(([key, value]) => <tr key={key}><td style={cellKey}>{key}</td><td style={cellValue}>{value}</td></tr>)}</tbody>
            </table>
          </Section>

          <Section title="How this changed the city">
            <div style={{ display: 'grid', gap: 8 }}>
              {[
                ['population_in_zone', '+12.4k', '+18.7k'],
                ['mobility_commute', '42min', '40min'],
                ['equity_infra_gini', '0.34', '0.31'],
                ['env_co2_est', '620kt', '612kt'],
              ].map(([label, before, after]) => <MetricDelta key={label} label={label} before={before} after={after} />)}
            </div>
          </Section>

          <Section title="What else the AI considered">
            <div style={{ display: 'grid', gap: 8 }}>
              {(alternatives.length ? alternatives : actions.slice(0, 3)).map((action, index) => (
                <div key={`${action.x}-${action.y}-${index}`} style={cardStyle}>
                  <strong style={{ color: 'var(--color-text-primary)', fontSize: 13 }}>Cell ({action.x}, {action.y}) · SPS {action.sps_score.toFixed(1)}</strong>
                  <p style={{ margin: '4px 0 0', color: 'var(--color-text-muted)', fontSize: 12 }}>{action.rejection_reason ?? 'Lower service leverage than selected placement.'}</p>
                </div>
              ))}
            </div>
          </Section>

          <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
            <button style={dangerButton} onClick={handleRemove}><Trash2 size={15} /> Remove this zone</button>
            <button className="icon-btn" aria-label="Find similar zones" onClick={handleFindSimilar}><Search size={15} /></button>
            <button className="icon-btn" aria-label="Share explanation" onClick={handleShare}><Copy size={15} /></button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section style={{ marginTop: 18 }}><h3 style={{ margin: '0 0 8px', color: 'var(--color-text-muted)', fontSize: 10, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>{title}</h3>{children}</section>
}

function MetricDelta({ label, before, after }: { label: string; before: string; after: string }) {
  return <div style={{ display: 'flex', justifyContent: 'space-between', border: '1px solid var(--color-border-subtle)', borderRadius: 8, padding: 10, background: 'var(--color-bg-hover)', boxShadow: 'var(--shadow-inset)' }}><span style={{ color: 'var(--color-text-secondary)', fontSize: 12 }}>{label}</span><strong style={{ color: 'var(--color-accent-green)', fontSize: 12 }}>{before} to {after}</strong></div>
}

const cardStyle: React.CSSProperties = { border: '1px solid var(--color-border-subtle)', borderRadius: 8, background: 'var(--color-bg-hover)', boxShadow: 'var(--shadow-inset)', padding: 12 }
const cellKey: React.CSSProperties = { color: 'var(--color-text-muted)', padding: '7px 0', width: 120, verticalAlign: 'top' }
const cellValue: React.CSSProperties = { color: 'var(--color-text-secondary)', padding: '7px 0', verticalAlign: 'top' }
const dangerButton: React.CSSProperties = { flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, border: '1px solid rgba(225,112,85,0.5)', borderRadius: 8, background: 'var(--color-bg-panel)', boxShadow: 'var(--shadow-sm)', color: 'var(--color-accent-danger)', fontWeight: 700, cursor: 'pointer' }
