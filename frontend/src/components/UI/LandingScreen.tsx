import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus } from 'lucide-react'
import { useCityStore } from '@/stores/cityStore'
import type { CityProfile } from '@/types/city.types'
import { SandboxBuilder } from './SandboxBuilder'

interface Props {
  onEnter: () => void
}

export function LandingScreen({ onEnter }: Props) {
  const [sandboxOpen, setSandboxOpen] = useState(false)
  const [showMoreCities, setShowMoreCities] = useState(false)
  const cities = useCityStore((state) => state.cities)
  const selectCity = useCityStore((state) => state.selectCity)
  const mainCities = useMemo(
    () => ['fremon', 'fremont', 'san_jose'].map((id) => cities.find((city) => city.id === id)).filter(Boolean) as CityProfile[],
    [cities],
  )
  const moreCities = useMemo(
    () => cities.filter((city) => !['fremon', 'fremont', 'san_jose'].includes(city.id)),
    [cities],
  )

  const chooseCity = (city: CityProfile) => {
    selectCity(city)
    onEnter()
  }

  return (
    <div className="relative h-screen overflow-auto noise-overlay" style={{ background: 'var(--color-bg-app)' }}>
      <div className="relative z-10 max-w-6xl mx-auto px-8 py-14">
        {/* Hero row */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1 } } }}
          className="flex items-start gap-12 mb-14"
        >
          {/* Hero panel */}
          <motion.div
            variants={{ hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } } }}
            className="relative rounded-2xl p-8 shrink-0 w-72"
            style={{ background: 'var(--color-bg-panel)', border: '1px solid var(--color-border-light)', boxShadow: 'var(--shadow-lg)' }}
          >
            <ScrewCorners />
            <div style={{ position: 'absolute', top: 14, right: 28, display: 'flex', gap: 4 }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{ width: 3, height: 20, borderRadius: 99, background: 'var(--color-bg-hover)', boxShadow: 'inset 1px 1px 2px rgba(0,0,0,0.12)' }} />
              ))}
            </div>

            <div className="mb-4"><CityIcon /></div>

            <h1 className="font-display font-bold tracking-widest uppercase mb-1" style={{ fontSize: 32, color: 'var(--color-text-primary)', letterSpacing: '0.15em', lineHeight: 1.1, filter: 'drop-shadow(0 1px 0 #ffffff)' }}>
              UrbanMind
            </h1>
            <p className="font-mono text-[10px] tracking-widest uppercase mb-3" style={{ color: 'var(--color-text-muted)', letterSpacing: '0.25em' }}>
              AI infrastructure planning simulator
            </p>

            <div className="mb-4">
              <span className="font-mono text-[9px] tracking-widest uppercase" style={{ color: '#00b894' }}>DEMO READY</span>
            </div>

            <p style={{ color: 'var(--color-text-secondary)', fontSize: 12, lineHeight: 1.7 }} className="mb-6">
              Analyze underserved districts, apply a targeted AI plan, and present measurable before/after impact.
            </p>

            <TactileButton variant="secondary" onClick={() => setSandboxOpen(true)} icon={<Plus size={13} />}>
              Build a New City
            </TactileButton>

            <div className="mt-4 flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: 'var(--color-accent-cyan)' }} />
              <span className="font-mono text-[9px]" style={{ color: 'var(--color-text-muted)', letterSpacing: '0.15em' }}>
                {cities.length} CITY OPTIONS · FREMON DEMO READY
              </span>
            </div>
          </motion.div>

          {/* City grid */}
          <motion.div
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.06, delayChildren: 0.15 } } }}
            className="flex-1 grid gap-6"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))' }}
          >
            {mainCities.map((city) => (
              <CityCard key={city.id} city={city} onSelect={chooseCity} />
            ))}
            {showMoreCities && moreCities.map((city) => (
              <CityCard key={city.id} city={city} onSelect={chooseCity} compact />
            ))}
            {moreCities.length > 0 && (
              <button
                onClick={() => setShowMoreCities((v) => !v)}
                className="rounded-xl border px-4 py-3 text-left text-sm font-semibold"
                style={{ borderColor: 'var(--color-border-subtle)', color: 'var(--color-text-secondary)', background: 'var(--color-bg-card)' }}
              >
                {showMoreCities ? 'Hide More Cities' : `More Cities (${moreCities.length})`}
              </button>
            )}
          </motion.div>
        </motion.div>
      </div>

      <AnimatePresence>
        {sandboxOpen && (
          <SandboxOverlay onClose={() => setSandboxOpen(false)} onGenerated={onEnter} />
        )}
      </AnimatePresence>
    </div>
  )
}

function TactileButton({
  children,
  onClick,
  variant,
  icon,
}: {
  children: React.ReactNode
  onClick: () => void
  variant: 'primary' | 'secondary'
  icon?: React.ReactNode
}) {
  const isPrimary = variant === 'primary'
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98, y: 2 }}
      className="relative w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-display font-bold text-sm tracking-widest uppercase transition-all"
      style={{
        background: isPrimary ? 'var(--color-accent-cyan)' : 'var(--color-bg-panel)',
        color: isPrimary ? '#ffffff' : 'var(--color-text-primary)',
        border: isPrimary ? '1px solid rgba(255,255,255,0.2)' : '1px solid var(--color-border-subtle)',
        boxShadow: isPrimary
          ? '4px 4px 8px rgba(166,50,60,0.35), -2px -2px 6px rgba(255,100,110,0.3)'
          : 'var(--shadow-sm)',
        letterSpacing: '0.08em',
      }}
    >
      {icon}
      {children}
    </motion.button>
  )
}

function CityCard({ city, onSelect, compact = false }: { city: CityProfile; onSelect: (c: CityProfile) => void; compact?: boolean }) {
  const typeLabel = city.id === 'fremon' ? 'Generated Future City' : 'Real City'
  const populationLabel = city.population_current.toLocaleString()
  return (
    <motion.button
      variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } } }}
      onClick={() => onSelect(city)}
      whileHover={{ y: -4, boxShadow: '12px 12px 24px #babecc, -12px -12px 24px #ffffff' }}
      whileTap={{ scale: 0.98, y: 0 }}
      className="group text-left rounded-xl overflow-hidden transition-all relative"
      style={{
        background: 'var(--color-bg-panel)',
        border: '1px solid var(--color-border-subtle)',
        boxShadow: 'var(--shadow-md)',
      }}
    >
      {/* City thumbnail */}
      <div
        className={`relative flex items-end p-5 ${compact ? 'h-24' : 'h-32'}`}
        style={{
          background: cityColorLight(city.id),
        }}
      >
        <div className="absolute top-2 right-3 flex gap-1">
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ width: 2, height: 14, borderRadius: 99, background: 'var(--color-border-subtle)', boxShadow: 'inset 1px 1px 1px rgba(0,0,0,0.1)' }} />
          ))}
        </div>
        <h3
          className="relative font-display font-bold text-lg leading-tight"
          style={{ color: 'var(--color-text-primary)', filter: 'drop-shadow(0 1px 0 #ffffff)' }}
        >
          {city.name}
        </h3>
      </div>

      {/* City info */}
      <div className="p-5">
        <p className="font-mono text-[11px] mb-2" style={{ color: 'var(--color-text-muted)' }}>
          {typeLabel} · {populationLabel} residents
        </p>
        <p className="text-xs leading-relaxed line-clamp-2" style={{ color: 'var(--color-text-secondary)', fontSize: 12, lineHeight: 1.6 }}>
          {city.key_planning_challenge}
        </p>
        <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[10px] font-bold font-mono tracking-widest uppercase" style={{ color: 'var(--color-accent-cyan)', borderColor: 'var(--color-border-subtle)' }}>
          SIMULATE →
        </div>
      </div>
    </motion.button>
  )
}

function SandboxOverlay({ onClose, onGenerated }: { onClose: () => void; onGenerated: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 overflow-auto p-8"
      style={{ background: 'var(--color-bg-app)' }}
    >
      <button
        onClick={onClose}
        className="fixed top-5 right-5 flex items-center justify-center w-9 h-9 rounded-lg transition-all"
        style={{
          border: '1px solid var(--color-border-subtle)',
          color: 'var(--color-text-secondary)',
          background: 'var(--color-bg-panel)',
          boxShadow: 'var(--shadow-sm)',
        }}
        aria-label="Close sandbox builder"
      >
        <X size={16} />
      </button>
      <SandboxBuilder onGenerated={() => { onClose(); onGenerated() }} />
    </motion.div>
  )
}

export function Logo({ large = false }: { large?: boolean }) {
  return (
    <div className="inline-flex items-center gap-3">
      <span
        className="font-display font-bold tracking-widest uppercase"
        style={{
          fontSize: large ? 32 : 15,
          color: 'var(--color-accent-cyan)',
          letterSpacing: '0.12em',
          filter: 'drop-shadow(0 1px 0 #ffffff)',
        }}
      >
        UrbanMind
      </span>
      {large && (
        <span className="font-mono text-xs tracking-widest" style={{ color: 'var(--color-text-muted)', letterSpacing: '0.2em' }}>
          AI
        </span>
      )}
    </div>
  )
}

function CityIcon() {
  return (
    <svg width={52} height={42} viewBox="0 0 56 44" aria-hidden="true">
      {/* Building silhouette — subtle drop shadow for depth */}
      <path
        d="M4 40V22h7V10h9v30h5V16h8v24h5V4h11v36h4v4H1v-4h3z"
        fill="var(--color-accent-cyan)"
        style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.15)) drop-shadow(0 -1px 0 rgba(255,255,255,0.4))' }}
      />
    </svg>
  )
}

function ScrewCorners() {
  const positions: React.CSSProperties[] = [
    { top: 10, left: 10 },
    { top: 10, right: 10 },
    { bottom: 10, left: 10 },
    { bottom: 10, right: 10 },
  ]
  return (
    <>
      {positions.map((pos, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: 'var(--color-border-subtle)',
            boxShadow: 'inset 1px 1px 2px rgba(255,255,255,0.8), inset -1px -1px 2px rgba(0,0,0,0.12)',
            ...pos,
          }}
        />
      ))}
    </>
  )
}

function cityColorLight(id: string): string {
  const map: Record<string, string> = {
    new_york:    '#c8d8e8',
    los_angeles: '#e8d8c8',
    tokyo:       '#c8d8e8',
    lagos:       '#c8e8d0',
    london:      '#d0d8e0',
    sao_paulo:   '#d8c8e8',
    singapore:   '#c8e8d8',
    dubai:       '#e8dcc8',
    mumbai:      '#e8d8c0',
    fremont:     '#d8e8d0',
    fremon:      '#e8e0d8',
    san_jose:    '#d8d0e8',
    sacramento:  '#e8e8d0',
    stockton:    '#d0e8e0',
    austin:      '#e8d8d8',
    phoenix:     '#e8e0c8',
  }
  return map[id] ?? '#cdd5e0'
}
