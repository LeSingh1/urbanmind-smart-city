/**
 * Debug panel — visible only when the URL has `?debug=1`.
 * Shows the deterministic gap engine output, copilot recommendation list,
 * and the validation reasons attached to each recommendation. Helpful for
 * judges who want to see the architecture working under the hood.
 */

import { useEffect, useState } from 'react'
import { useSimulationStore } from '@/stores/simulationStore'

function useDebugFlag() {
  const [enabled, setEnabled] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    setEnabled(params.get('debug') === '1')
  }, [])
  return enabled
}

export function EngineDebugPanel() {
  const debug = useDebugFlag()
  const planning = useSimulationStore((s) => s.planning)
  const [collapsed, setCollapsed] = useState(false)
  if (!debug || !planning.engineBundle) return null
  const bundle = planning.engineBundle
  return (
    <div
      style={{
        position: 'fixed',
        right: 12,
        bottom: 76,
        zIndex: 200,
        width: 360,
        maxHeight: '60vh',
        overflow: 'auto',
        background: 'var(--color-bg-panel)',
        border: '1px solid var(--color-border-active)',
        borderRadius: 10,
        boxShadow: '0 12px 30px rgba(0,0,0,0.32)',
        fontFamily: 'ui-monospace,Menlo,monospace',
        fontSize: 11,
      }}
    >
      <div
        style={{
          padding: '8px 10px',
          borderBottom: '1px solid var(--color-border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ color: 'var(--color-accent-cyan)', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          Engine Debug
        </span>
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          style={{
            color: 'var(--color-text-muted)',
            border: '1px solid var(--color-border-subtle)',
            background: 'var(--color-bg-card)',
            borderRadius: 6,
            padding: '2px 6px',
            fontSize: 10,
          }}
        >
          {collapsed ? 'show' : 'hide'}
        </button>
      </div>
      {!collapsed && (
        <div style={{ padding: 10, color: 'var(--color-text-secondary)' }}>
          <div style={{ marginBottom: 6 }}>
            reports: {bundle.reports.length} &nbsp;|&nbsp; alerts: {bundle.alerts.length} &nbsp;|&nbsp; recs: {bundle.recommendations.length}
          </div>
          <div style={{ marginBottom: 6, color: 'var(--color-accent-green)' }}>
            passed: {bundle.validatedRecommendations.length} &nbsp; failed: {bundle.failedRecommendations.length}
          </div>
          <div style={{ borderTop: '1px solid var(--color-border-subtle)', paddingTop: 6 }}>
            {bundle.recommendations.map((r) => (
              <div key={r.id} style={{ marginBottom: 8 }}>
                <div style={{ color: 'var(--color-text-primary)' }}>
                  <strong>{r.sourceDistrictName}</strong> · {r.infrastructureType}
                </div>
                <div>
                  <span
                    style={{
                      color:
                        r.validationStatus === 'passed'
                          ? 'var(--color-accent-green)'
                          : r.validationStatus === 'needs_review'
                            ? 'var(--color-accent-cyan)'
                            : 'var(--color-accent-danger)',
                    }}
                  >
                    {r.validationStatus}
                  </span>{' '}
                  · conf {r.confidence}
                </div>
                {r.validationReasons.length > 0 && (
                  <ul style={{ margin: '4px 0 0 12px', padding: 0, color: 'var(--color-text-muted)', listStyle: 'disc' }}>
                    {r.validationReasons.map((reason, i) => (
                      <li key={i}>{reason}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
