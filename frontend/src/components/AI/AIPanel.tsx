import { motion, AnimatePresence } from 'framer-motion'
import { useAIStore } from '@/stores/aiStore'
import { Cpu, Zap } from 'lucide-react'
import { getZoneColor } from '@/utils/colorUtils'
import type { ZoneExplanation } from '@/types/simulation.types'

export function AIPanel() {
  const { lastExplanations, isLoadingExplanation, explanationCache } = useAIStore()
  const latestExplanation: ZoneExplanation | undefined = lastExplanations[0]
  const cachedCount = Object.keys(explanationCache).length

  return (
    <div className="p-3 space-y-3">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-2">
        <StatCard icon={<Cpu size={12} />} label="Cached" value={cachedCount.toString()} />
        <StatCard icon={<Zap size={12} />} label="History" value={lastExplanations.length.toString()} color="var(--color-accent-cyan)" />
      </div>

      {/* Generating indicator */}
      <AnimatePresence>
        {isLoadingExplanation && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2"
          >
            <motion.div
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: 'var(--color-accent-cyan)' }}
              animate={{ scale: [1, 1.5, 1] }}
              transition={{ duration: 0.8, repeat: Infinity }}
            />
            <span className="font-mono text-[10px]" style={{ color: 'var(--color-accent-cyan)' }}>
              Claude is analyzing...
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Latest explanation hero */}
      {latestExplanation && (
        <motion.div
          key={`${latestExplanation.zone_type_id}-${latestExplanation.year}`}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg p-3"
          style={{
            background: 'rgba(124,58,237,0.06)',
            border: '1px solid rgba(124,58,237,0.2)',
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <div
                className="w-2.5 h-2.5 rounded-sm shrink-0"
                style={{ background: getZoneColor(latestExplanation.zone_type_id) }}
              />
              <span
                className="font-display text-xs font-medium"
                style={{ color: 'var(--color-accent-purple)' }}
              >
                {latestExplanation.zone_display_name}
              </span>
            </div>
            <span className="font-mono text-[9px]" style={{ color: 'var(--color-text-muted)' }}>
              Y{latestExplanation.year}
            </span>
          </div>
          <p className="text-[10px] leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
            {latestExplanation.explanation_text}
          </p>
          <div className="mt-1.5 font-mono text-[9px]" style={{ color: 'var(--color-text-muted)' }}>
            ({latestExplanation.x}, {latestExplanation.y})
          </div>
        </motion.div>
      )}

      {/* History */}
      {lastExplanations.length > 1 && (
        <div>
          <div
            className="font-mono text-[9px] tracking-widest uppercase mb-2"
            style={{ color: 'var(--color-text-muted)' }}
          >
            History
          </div>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {lastExplanations.slice(1).map((exp, i) => (
              <div
                key={`${exp.zone_type_id}-${exp.year}-${i}`}
                className="pl-2 py-0.5"
                style={{ borderLeft: '2px solid var(--color-border-subtle)' }}
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  <div
                    className="w-2 h-2 rounded-sm shrink-0"
                    style={{ background: getZoneColor(exp.zone_type_id) }}
                  />
                  <span className="font-mono text-[9px]" style={{ color: 'var(--color-text-muted)' }}>
                    {exp.zone_display_name} — Y{exp.year}
                  </span>
                </div>
                <p
                  className="font-mono text-[9px] leading-relaxed line-clamp-2"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  {exp.explanation_text}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {lastExplanations.length === 0 && (
        <div className="text-center py-8">
          <div
            className="font-mono text-[10px] tracking-widest uppercase"
            style={{ color: 'var(--color-text-muted)' }}
          >
            AI explanations will appear here as the simulation places zones
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ icon, label, value, color = 'var(--color-text-primary)' }: {
  icon: React.ReactNode
  label: string
  value: string
  color?: string
}) {
  return (
    <div
      className="rounded-lg p-2 text-center"
      style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border-subtle)' }}
    >
      <div className="flex items-center justify-center gap-1 mb-1" style={{ color: 'var(--color-text-muted)' }}>
        {icon}
        <span className="font-mono text-[9px] tracking-widest uppercase">{label}</span>
      </div>
      <div className="font-mono font-bold text-lg" style={{ color }}>{value}</div>
    </div>
  )
}
