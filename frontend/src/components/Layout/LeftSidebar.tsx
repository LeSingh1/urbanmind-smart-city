import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BarChart3, MessageSquare, Layers, Crosshair, ChevronLeft, ChevronRight } from 'lucide-react'
import { MetricsDashboard } from '@/components/Simulation/MetricsDashboard'
import { AIPanel } from '@/components/AI/AIPanel'
import { ActionsPanel } from '@/components/Simulation/ActionsPanel'
import { ZonePalette } from '@/components/UI/ZonePalette'

const TABS = [
  { id: 'metrics', icon: BarChart3, label: 'Metrics' },
  { id: 'ai', icon: MessageSquare, label: 'AI Insights' },
  { id: 'actions', icon: Layers, label: 'Actions' },
  { id: 'placement', icon: Crosshair, label: 'Place Zones' },
] as const

type TabId = typeof TABS[number]['id']

export function LeftSidebar() {
  const [activePanel, setActivePanel] = useState<TabId | null>('metrics')
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div
      className="flex shrink-0"
      style={{
        width: collapsed ? 48 : 288,
        transition: 'width 300ms cubic-bezier(0.16,1,0.3,1)',
      }}
    >
      {/* Icon rail */}
      <div
        className="flex flex-col items-center gap-1.5 py-3 px-1.5 shrink-0 w-12"
        style={{
          background: 'var(--color-bg-sidebar)',
          borderRight: '1px solid var(--color-border-subtle)',
        }}
      >
        {TABS.map(({ id, icon: Icon, label }) => {
          const active = activePanel === id && !collapsed
          return (
            <motion.button
              key={id}
              onClick={() => {
                if (collapsed) setCollapsed(false)
                setActivePanel(activePanel === id && !collapsed ? null : id)
              }}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.93 }}
              className="w-9 h-9 flex items-center justify-center rounded-lg transition-all relative"
              style={
                active
                  ? {
                      background: 'rgba(0,212,255,0.1)',
                      color: 'var(--color-accent-cyan)',
                      border: '1px solid rgba(0,212,255,0.25)',
                    }
                  : {
                      color: 'var(--color-text-muted)',
                      border: '1px solid transparent',
                    }
              }
              title={label}
            >
              <Icon size={15} />
              {active && (
                <motion.div
                  layoutId="sidebar-active-dot"
                  className="absolute right-0.5 top-1/2 -translate-y-1/2 w-1 h-4 rounded-full"
                  style={{ background: 'var(--color-accent-cyan)' }}
                />
              )}
            </motion.button>
          )
        })}

        <div className="flex-1" />

        <motion.button
          onClick={() => setCollapsed((v) => !v)}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.93 }}
          className="w-9 h-9 flex items-center justify-center rounded-lg"
          style={{ color: 'var(--color-text-muted)', border: '1px solid transparent' }}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
        </motion.button>
      </div>

      {/* Panel content */}
      <AnimatePresence>
        {!collapsed && activePanel && (
          <motion.div
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } }}
            exit={{ opacity: 0, x: -12, transition: { duration: 0.2 } }}
            className="flex-1 flex flex-col overflow-hidden"
            style={{
              background: 'var(--color-bg-panel)',
              borderRight: '1px solid var(--color-border-subtle)',
            }}
          >
            {/* Panel header */}
            <div
              className="px-4 py-3 shrink-0 flex items-center gap-2"
              style={{ borderBottom: '1px solid var(--color-border-subtle)' }}
            >
              <div
                className="w-1 h-4 rounded-full"
                style={{ background: 'var(--color-accent-cyan)' }}
              />
              <h2
                className="font-display font-semibold text-sm tracking-wide"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {TABS.find((t) => t.id === activePanel)?.label}
              </h2>
            </div>

            {/* Panel body */}
            <div className="flex-1 overflow-y-auto">
              {activePanel === 'metrics' && <MetricsDashboard />}
              {activePanel === 'ai' && <AIPanel />}
              {activePanel === 'actions' && <ActionsPanel />}
              {activePanel === 'placement' && <ZonePalette />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
