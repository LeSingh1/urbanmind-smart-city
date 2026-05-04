import { useRef, useEffect, useState } from 'react'
import * as d3 from 'd3'
import { motion } from 'framer-motion'
import { useSimulationStore } from '@/stores/simulationStore'
import { METRIC_CONFIGS, type MetricConfig } from '@/utils/metricsUtils'
import type { MetricsSnapshot } from '@/types/city.types'

const CATEGORIES = ['mobility', 'economy', 'environment', 'social', 'infrastructure'] as const
type Category = typeof CATEGORIES[number]

const CATEGORY_COLORS: Record<Category, string> = {
  mobility: 'var(--color-accent-cyan)',
  economy: 'var(--color-accent-warning)',
  environment: 'var(--color-accent-green)',
  social: 'var(--color-accent-purple)',
  infrastructure: '#06b6d4',
}

function computeHealth(m: MetricsSnapshot): number {
  const scores = [
    m.equity_hosp_coverage,
    m.equity_school_access,
    m.mobility_transit_coverage,
    100 - m.mobility_congestion,
    Math.min(100, m.env_green_ratio * 2.5),
    m.mobility_walkability,
    100 - Math.min(100, m.safety_response_time * 5),
  ]
  return scores.reduce((a, b) => a + b, 0) / scores.length
}

export function MetricsDashboard() {
  const [activeCategory, setActiveCategory] = useState<Category | 'all'>('all')
  const metricsHistory = useSimulationStore((state) => state.metricsHistory)
  const currentMetrics = metricsHistory.at(-1) ?? null

  const visibleMetrics = METRIC_CONFIGS.filter(
    (m) => activeCategory === 'all' || m.category === activeCategory
  ).slice(0, 12)

  return (
    <div className="p-3 space-y-3">
      {/* Category filter */}
      <div className="flex flex-wrap gap-1">
        <motion.button
          onClick={() => setActiveCategory('all')}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="px-2 py-0.5 rounded-md text-[10px] font-display transition-all"
          style={
            activeCategory === 'all'
              ? { background: 'rgba(0,212,255,0.12)', color: 'var(--color-accent-cyan)', border: '1px solid rgba(0,212,255,0.3)' }
              : { color: 'var(--color-text-muted)', border: '1px solid transparent' }
          }
        >
          All
        </motion.button>
        {CATEGORIES.map((cat) => (
          <motion.button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="px-2 py-0.5 rounded-md text-[10px] font-display capitalize transition-all"
            style={
              activeCategory === cat
                ? { background: `${CATEGORY_COLORS[cat]}20`, color: CATEGORY_COLORS[cat], border: `1px solid ${CATEGORY_COLORS[cat]}40` }
                : { color: 'var(--color-text-muted)', border: '1px solid transparent' }
            }
          >
            {cat}
          </motion.button>
        ))}
      </div>

      {!currentMetrics ? (
        <div
          className="text-center py-8 font-mono text-[10px] tracking-widest uppercase"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Start simulation to see live metrics
        </div>
      ) : (
        <>
          <HealthGauge value={computeHealth(currentMetrics)} />

          <div className="space-y-2">
            {visibleMetrics.map((config) => (
              <MetricRow
                key={String(config.key)}
                config={config}
                metrics={currentMetrics}
                history={metricsHistory}
              />
            ))}
          </div>

          {metricsHistory.length > 2 && (
            <MetricsChart history={metricsHistory} />
          )}
        </>
      )}
    </div>
  )
}

function HealthGauge({ value }: { value: number }) {
  const color = value > 70 ? 'var(--color-accent-green)' : value > 50 ? 'var(--color-accent-warning)' : 'var(--color-accent-danger)'
  const angle = -135 + (value / 100) * 270

  return (
    <div className="flex flex-col items-center py-2">
      <div className="relative w-24 h-14 overflow-hidden">
        <svg viewBox="0 0 100 60" className="w-full h-full">
          <path d="M 10 55 A 40 40 0 0 1 90 55" fill="none" stroke="rgba(0,212,255,0.1)" strokeWidth="8" strokeLinecap="round" />
          <motion.path
            d="M 10 55 A 40 40 0 0 1 90 55"
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray="125.7"
            strokeDashoffset={125.7}
            animate={{ strokeDashoffset: 125.7 - (value / 100) * 125.7 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            style={{ filter: `drop-shadow(0 0 4px ${color})` }}
          />
          <line
            x1="50" y1="55"
            x2={50 + 28 * Math.cos((angle - 90) * Math.PI / 180)}
            y2={55 + 28 * Math.sin((angle - 90) * Math.PI / 180)}
            stroke={color} strokeWidth="2" strokeLinecap="round"
          />
          <circle cx="50" cy="55" r="3" fill={color} />
        </svg>
      </div>
      <div className="text-center -mt-1">
        <motion.div
          key={Math.round(value)}
          initial={{ opacity: 0.5, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="font-mono font-bold text-2xl"
          style={{ color }}
        >
          {value.toFixed(0)}
        </motion.div>
        <div
          className="font-mono text-[9px] tracking-widest uppercase"
          style={{ color: 'var(--color-text-muted)' }}
        >
          City Health Score
        </div>
      </div>
    </div>
  )
}

function MetricRow({ config, metrics, history }: {
  config: MetricConfig
  metrics: MetricsSnapshot
  history: MetricsSnapshot[]
}) {
  const value = metrics[config.key] as number
  const pct = Math.max(0, Math.min(100, ((value - config.min) / (config.max - config.min)) * 100))
  const isGood = config.higherIsBetter ? pct > 60 : pct < 40
  const color = isGood ? 'var(--color-accent-green)' : pct > 30 && pct < 70 ? 'var(--color-accent-warning)' : 'var(--color-accent-danger)'
  const prev = history.length > 1 ? history[history.length - 2][config.key] as number : null
  const delta = prev !== null ? value - prev : null

  return (
    <div>
      <div className="flex justify-between items-center mb-0.5">
        <span className="font-display text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>
          {config.label}
        </span>
        <div className="flex items-center gap-1">
          {delta !== null && Math.abs(delta) > 0.001 && (
            <span
              className="text-[9px] font-mono"
              style={{ color: (config.higherIsBetter ? delta > 0 : delta < 0) ? 'var(--color-accent-green)' : 'var(--color-accent-danger)' }}
            >
              {delta > 0 ? '▲' : '▼'}
            </span>
          )}
          <span className="font-mono text-[10px]" style={{ color: 'var(--color-text-primary)' }}>
            {config.format(value)}
          </span>
        </div>
      </div>
      <div
        className="h-0.5 rounded-full overflow-hidden"
        style={{ background: 'rgba(0,212,255,0.08)' }}
      >
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}

function MetricsChart({ history }: { history: MetricsSnapshot[] }) {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!svgRef.current || history.length < 2) return
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const width = svgRef.current.clientWidth || 240
    const height = 80
    const margin = { top: 8, right: 8, bottom: 16, left: 28 }
    const innerW = width - margin.left - margin.right
    const innerH = height - margin.top - margin.bottom

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`)

    const xScale = d3.scaleLinear().domain([0, history.length - 1]).range([0, innerW])
    const yScale = d3.scaleLinear().domain([0, 100]).range([innerH, 0])

    const lines: Array<{ key: keyof MetricsSnapshot; color: string; label: string }> = [
      { key: 'mobility_transit_coverage', color: '#00D4FF', label: 'Transit' },
      { key: 'equity_hosp_coverage', color: '#7C3AED', label: 'Health' },
      { key: 'env_green_ratio', color: '#00FF9C', label: 'Green' },
    ]

    g.append('g')
      .selectAll('line')
      .data(yScale.ticks(3))
      .enter()
      .append('line')
      .attr('x1', 0).attr('x2', innerW)
      .attr('y1', (d) => yScale(d)).attr('y2', (d) => yScale(d))
      .attr('stroke', 'rgba(0,212,255,0.06)').attr('stroke-width', 0.5)

    lines.forEach(({ key, color }) => {
      const lineFn = d3.line<MetricsSnapshot>()
        .x((_, i) => xScale(i))
        .y((d) => yScale(Math.min(100, d[key] as number)))
        .curve(d3.curveCatmullRom)

      g.append('path')
        .datum(history)
        .attr('fill', 'none')
        .attr('stroke', color)
        .attr('stroke-width', 1.5)
        .attr('opacity', 0.8)
        .attr('d', lineFn)
        .style('filter', `drop-shadow(0 0 2px ${color})`)
    })

    g.append('g')
      .attr('transform', `translate(0,${innerH})`)
      .call(d3.axisBottom(xScale).ticks(4).tickFormat((d) => `Y${history[d as number]?.year ?? ''}`))
      .call((ax) => ax.select('.domain').remove())
      .call((ax) => ax.selectAll('text').attr('fill', 'rgba(0,212,255,0.4)').style('font-size', '8px').style('font-family', 'JetBrains Mono'))
      .call((ax) => ax.selectAll('line').remove())
  }, [history])

  return (
    <div>
      <div
        className="font-mono text-[9px] tracking-widest uppercase mb-1"
        style={{ color: 'var(--color-text-muted)' }}
      >
        Score History
      </div>
      <svg ref={svgRef} className="w-full" height={88} />
    </div>
  )
}
