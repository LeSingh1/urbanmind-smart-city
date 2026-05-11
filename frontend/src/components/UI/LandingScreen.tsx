import { useEffect, useRef, useMemo, useState } from 'react'
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
  useSpring,
  useReducedMotion,
} from 'framer-motion'
import { X, Plus, Shield, Zap, Layers } from 'lucide-react'
import { useCityStore } from '@/stores/cityStore'
import type { CityProfile } from '@/types/city.types'
import { SandboxBuilder } from './SandboxBuilder'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

interface Props {
  onEnter: () => void
}

// Dark glass style tokens for landing overlay
const GLASS = {
  panel: 'rgba(10, 15, 28, 0.72)',
  card: 'rgba(15, 23, 42, 0.68)',
  border: 'rgba(255, 255, 255, 0.10)',
  borderAccent: 'rgba(14, 165, 233, 0.35)',
  textPrimary: '#f1f5f9',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
}

// Spring presets — one rhythm across the page (motion-consistency rule)
const SPRING_ENTER = { type: 'spring' as const, stiffness: 260, damping: 26, mass: 0.9 }
const SPRING_SOFT  = { type: 'spring' as const, stiffness: 180, damping: 22, mass: 1.0 }
const SPRING_SNAP  = { type: 'spring' as const, stiffness: 420, damping: 28, mass: 0.6 }

// Flyover anchor (Fremont)
const FLYOVER_CENTER: [number, number] = [-121.9886, 37.5485]

function useLandingMap(containerRef: React.RefObject<HTMLDivElement>) {
  const mapRef = useRef<maplibregl.Map | null>(null)
  const animFrameRef = useRef<number>(0)
  const [mapReady, setMapReady] = useState(false)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
        sources: {
          'carto-dark': {
            type: 'raster',
            tiles: [
              'https://a.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}@2x.png',
              'https://b.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}@2x.png',
              'https://c.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}@2x.png',
            ],
            tileSize: 256,
            attribution: '© OSM © CARTO',
          },
          'ofm-buildings': {
            type: 'vector',
            tiles: ['https://tiles.openfreemap.org/planet/{z}/{x}/{y}'],
            minzoom: 0,
            maxzoom: 14,
          },
        },
        layers: [
          { id: 'background', type: 'background', paint: { 'background-color': '#080d1a' } },
          { id: 'raster-base', type: 'raster', source: 'carto-dark', paint: { 'raster-opacity': 0.85 } },
          {
            id: 'buildings-3d',
            type: 'fill-extrusion',
            source: 'ofm-buildings',
            'source-layer': 'building',
            minzoom: 13,
            paint: {
              'fill-extrusion-color': [
                'interpolate', ['linear'],
                ['coalesce', ['get', 'height'], ['get', 'render_height'], 5],
                0,   '#1a2744',
                20,  '#1e3a5f',
                60,  '#0ea5e9',
                150, '#38bdf8',
              ],
              'fill-extrusion-height': ['coalesce', ['get', 'height'], ['get', 'render_height'], 5],
              'fill-extrusion-base': ['coalesce', ['get', 'min_height'], 0],
              'fill-extrusion-opacity': 0.85,
            },
          } as maplibregl.LayerSpecification,
        ],
      },
      center: FLYOVER_CENTER,
      zoom: 14.5,
      pitch: 52,
      bearing: 0,
      antialias: true,
      interactive: false,
      attributionControl: false,
    })

    mapRef.current = map

    map.on('load', () => {
      setMapReady(true)
      let bearing = 0
      const rotate = () => {
        bearing = (bearing + 0.04) % 360
        map.setBearing(bearing)
        animFrameRef.current = requestAnimationFrame(rotate)
      }
      animFrameRef.current = requestAnimationFrame(rotate)
    })

    return () => {
      cancelAnimationFrame(animFrameRef.current)
      map.remove()
      mapRef.current = null
      setMapReady(false)
    }
  }, [containerRef])

  return { mapReady }
}

export function LandingScreen({ onEnter }: Props) {
  const [sandboxOpen, setSandboxOpen] = useState(false)
  const [showMoreCities, setShowMoreCities] = useState(false)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const { mapReady } = useLandingMap(mapContainerRef)
  const reduceMotion = useReducedMotion()
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
    <div className="relative h-screen overflow-hidden" style={{ background: '#080d1a' }}>
      {/* Live 3D city flyover background */}
      <motion.div
        ref={mapContainerRef}
        initial={{ opacity: 0, scale: 1.08 }}
        animate={{ opacity: mapReady ? 1 : 0, scale: mapReady ? 1 : 1.08 }}
        transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
        style={{ position: 'absolute', inset: 0, zIndex: 0 }}
        aria-hidden="true"
      />

      {/* Gradient vignette */}
      <div
        style={{
          position: 'absolute', inset: 0, zIndex: 1,
          background: 'radial-gradient(ellipse at 30% 40%, transparent 10%, rgba(8,13,26,0.65) 100%)',
          pointerEvents: 'none',
        }}
        aria-hidden="true"
      />

      {/* Subtle scanline texture */}
      <div
        style={{
          position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
          background: 'repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(14,165,233,0.012) 2px, rgba(14,165,233,0.012) 3px)',
          mixBlendMode: 'overlay',
        }}
        aria-hidden="true"
      />

      {/* Content */}
      <div className="relative z-10 h-full overflow-auto">
        <div className="max-w-6xl mx-auto px-8 py-14">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.08, delayChildren: 0.15 } },
            }}
            className="flex items-start gap-12 mb-14"
          >
            <HeroPanel
              onSandboxOpen={() => setSandboxOpen(true)}
              cityCount={cities.length}
              reduceMotion={!!reduceMotion}
            />

            <motion.div
              variants={{
                hidden: {},
                visible: { transition: { staggerChildren: 0.07, delayChildren: 0.35 } },
              }}
              className="flex-1 grid gap-6"
              style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))' }}
            >
              {mainCities.map((city, idx) => (
                <CityCard
                  key={city.id}
                  city={city}
                  onSelect={chooseCity}
                  index={idx}
                  reduceMotion={!!reduceMotion}
                />
              ))}
              {showMoreCities && moreCities.map((city, idx) => (
                <CityCard
                  key={city.id}
                  city={city}
                  onSelect={chooseCity}
                  index={mainCities.length + idx}
                  compact
                  reduceMotion={!!reduceMotion}
                />
              ))}
              {moreCities.length > 0 && (
                <motion.button
                  variants={{
                    hidden: { opacity: 0, y: 18 },
                    visible: { opacity: 1, y: 0, transition: SPRING_SOFT },
                  }}
                  onClick={() => setShowMoreCities((v) => !v)}
                  whileHover={{ y: -2, borderColor: 'rgba(14,165,233,0.35)' }}
                  whileTap={{ scale: 0.97 }}
                  transition={SPRING_SNAP}
                  className="rounded-xl border px-4 py-3 text-left text-sm font-semibold"
                  style={{
                    borderColor: GLASS.border,
                    color: GLASS.textSecondary,
                    background: GLASS.card,
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                  }}
                >
                  {showMoreCities ? 'Hide More Cities' : `More Cities (${moreCities.length})`}
                </motion.button>
              )}
            </motion.div>
          </motion.div>
        </div>

        {/* Bottom marquee ticker */}
        <DataSourcesMarquee reduceMotion={!!reduceMotion} />
      </div>

      <AnimatePresence>
        {sandboxOpen && (
          <SandboxOverlay onClose={() => setSandboxOpen(false)} onGenerated={onEnter} />
        )}
      </AnimatePresence>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────
// Hero Panel — pulsing glow + magnetic CTA
// ──────────────────────────────────────────────────────────────────────────

function HeroPanel({
  onSandboxOpen,
  cityCount,
  reduceMotion,
}: {
  onSandboxOpen: () => void
  cityCount: number
  reduceMotion: boolean
}) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 36 },
        visible: { opacity: 1, y: 0, transition: SPRING_ENTER },
      }}
      className="relative shrink-0 w-72"
      style={{ perspective: 1200 }}
    >
      {/* Pulsing cyan glow behind panel */}
      {!reduceMotion && (
        <motion.div
          aria-hidden="true"
          initial={{ opacity: 0 }}
          animate={{
            opacity: [0.35, 0.7, 0.35],
            scale: [0.98, 1.04, 0.98],
          }}
          transition={{ duration: 5.2, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute',
            inset: -28,
            borderRadius: 36,
            background:
              'radial-gradient(circle at 50% 50%, rgba(14,165,233,0.35) 0%, rgba(14,165,233,0.10) 40%, transparent 70%)',
            filter: 'blur(24px)',
            zIndex: 0,
          }}
        />
      )}

      {/* Glass panel */}
      <motion.div
        whileHover={!reduceMotion ? { y: -3 } : undefined}
        transition={SPRING_SOFT}
        className="relative rounded-2xl p-8"
        style={{
          background: GLASS.panel,
          border: `1px solid ${GLASS.border}`,
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow:
            '0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(14,165,233,0.12), inset 0 1px 0 rgba(255,255,255,0.06)',
        }}
      >
        <ScrewCorners />

        <motion.div
          initial={{ rotate: -8, scale: 0.85, opacity: 0 }}
          animate={{ rotate: 0, scale: 1, opacity: 1 }}
          transition={{ ...SPRING_ENTER, delay: 0.25 }}
          className="mb-4"
        >
          <CityIcon />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...SPRING_ENTER, delay: 0.32 }}
          className="font-display font-bold tracking-widest uppercase mb-1"
          style={{ fontSize: 32, color: '#f1f5f9', letterSpacing: '0.15em', lineHeight: 1.1 }}
        >
          UrbanMind
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...SPRING_SOFT, delay: 0.4 }}
          className="font-mono text-[10px] tracking-widest uppercase mb-1"
          style={{ color: '#0ea5e9', letterSpacing: '0.25em' }}
        >
          15-Minute City Intelligence
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          className="font-mono text-[9px] tracking-widest uppercase mb-4"
          style={{ color: GLASS.textMuted, letterSpacing: '0.2em' }}
        >
          AI · Validated · Deterministic
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...SPRING_SOFT, delay: 0.55 }}
          style={{ color: GLASS.textSecondary, fontSize: 12, lineHeight: 1.7 }}
          className="mb-5"
        >
          Cities spend{' '}
          <strong style={{ color: '#f1f5f9' }}>$1T/year</strong> on infrastructure. 40% underperforms
          within 30 years. UrbanMind shows you why — before it happens.
        </motion.p>

        {/* Architecture trust badges with staggered cascade */}
        <motion.div
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.06, delayChildren: 0.65 } },
          }}
          initial="hidden"
          animate="visible"
          className="flex flex-col gap-1.5 mb-5"
        >
          <TrustBadge icon={<Layers size={10} />} label="Gap Engine" sub="Deterministic placement" />
          <TrustBadge icon={<Zap size={10} />} label="Claude AI Copilot" sub="Grounded explanation" />
          <TrustBadge icon={<Shield size={10} />} label="12-Rule Validator" sub="Every recommendation gated" />
        </motion.div>

        <MagneticButton onClick={onSandboxOpen} reduceMotion={reduceMotion}>
          <Plus size={13} />
          Build a New City
        </MagneticButton>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.95, duration: 0.4 }}
          className="mt-4 flex items-center gap-1.5"
        >
          <motion.span
            className="inline-block w-1.5 h-1.5 rounded-full"
            style={{ background: '#0ea5e9' }}
            animate={!reduceMotion ? { opacity: [0.4, 1, 0.4], scale: [0.9, 1.2, 0.9] } : undefined}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          />
          <span className="font-mono text-[9px]" style={{ color: GLASS.textMuted, letterSpacing: '0.15em' }}>
            {cityCount} CITIES · 75-YEAR HORIZON
          </span>
        </motion.div>
      </motion.div>
    </motion.div>
  )
}

// ──────────────────────────────────────────────────────────────────────────
// Trust badge — child of cascading parent
// ──────────────────────────────────────────────────────────────────────────

function TrustBadge({ icon, label, sub }: { icon: React.ReactNode; label: string; sub: string }) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, x: -10 },
        visible: { opacity: 1, x: 0, transition: SPRING_ENTER },
      }}
      whileHover={{ x: 2, borderColor: 'rgba(14,165,233,0.45)' }}
      transition={SPRING_SOFT}
      className="flex items-center gap-2 rounded-lg px-2.5 py-1.5"
      style={{
        background: 'rgba(14, 165, 233, 0.08)',
        border: '1px solid rgba(14, 165, 233, 0.18)',
      }}
    >
      <span style={{ color: '#0ea5e9', flexShrink: 0 }}>{icon}</span>
      <div>
        <div className="font-mono text-[9px] font-bold uppercase tracking-widest" style={{ color: '#0ea5e9' }}>
          {label}
        </div>
        <div className="font-mono text-[8px]" style={{ color: GLASS.textMuted }}>
          {sub}
        </div>
      </div>
    </motion.div>
  )
}

// ──────────────────────────────────────────────────────────────────────────
// Magnetic button — cursor pulls the button toward it
// ──────────────────────────────────────────────────────────────────────────

function MagneticButton({
  children,
  onClick,
  reduceMotion,
}: {
  children: React.ReactNode
  onClick: () => void
  reduceMotion: boolean
}) {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const x = useSpring(mouseX, { stiffness: 200, damping: 18, mass: 0.5 })
  const y = useSpring(mouseY, { stiffness: 200, damping: 18, mass: 0.5 })

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (reduceMotion || !buttonRef.current) return
    const rect = buttonRef.current.getBoundingClientRect()
    const relX = e.clientX - rect.left - rect.width / 2
    const relY = e.clientY - rect.top - rect.height / 2
    // Strength: 0.25 = subtle. Higher = more aggressive pull.
    mouseX.set(relX * 0.25)
    mouseY.set(relY * 0.25)
  }

  const handleMouseLeave = () => {
    mouseX.set(0)
    mouseY.set(0)
  }

  return (
    <motion.button
      ref={buttonRef}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      whileTap={{ scale: 0.96 }}
      style={{ x, y }}
      transition={SPRING_SNAP}
      className="relative w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-display font-bold text-sm tracking-widest uppercase"
      // CSS inline below
    >
      <span
        aria-hidden="true"
        style={{
          position: 'absolute', inset: 0, borderRadius: 8,
          background: 'rgba(255,255,255,0.07)',
          border: `1px solid ${GLASS.border}`,
          boxShadow: '0 1px 3px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)',
          backdropFilter: 'blur(8px)',
        }}
      />
      <span style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8, color: GLASS.textPrimary, letterSpacing: '0.08em' }}>
        {children}
      </span>
    </motion.button>
  )
}

// ──────────────────────────────────────────────────────────────────────────
// City Card — parallax tilt + idle drift
// ──────────────────────────────────────────────────────────────────────────

function CityCard({
  city,
  onSelect,
  index,
  compact = false,
  reduceMotion,
}: {
  city: CityProfile
  onSelect: (c: CityProfile) => void
  index: number
  compact?: boolean
  reduceMotion: boolean
}) {
  const cardRef = useRef<HTMLButtonElement>(null)
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  // Tilt range: ±6deg keeps it elegant (parallax-subtle rule)
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [6, -6]), { stiffness: 180, damping: 16 })
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-6, 6]), { stiffness: 180, damping: 16 })

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (reduceMotion || !cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    const px = (e.clientX - rect.left) / rect.width - 0.5
    const py = (e.clientY - rect.top) / rect.height - 0.5
    mouseX.set(px)
    mouseY.set(py)
  }

  const handleMouseLeave = () => {
    mouseX.set(0)
    mouseY.set(0)
  }

  const typeLabel = city.id === 'fremon' ? 'Generated Future City' : 'Real City'
  const populationLabel = city.population_current.toLocaleString()

  // Idle drift — each card oscillates slightly out of phase
  const idleDuration = 6 + (index % 3) * 0.7
  const idleDelay = (index % 5) * 0.4

  return (
    <motion.button
      ref={cardRef}
      variants={{
        hidden: { opacity: 0, y: 28, rotate: -2, scale: 0.96 },
        visible: { opacity: 1, y: 0, rotate: 0, scale: 1, transition: SPRING_ENTER },
      }}
      onClick={() => onSelect(city)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      whileHover={{
        scale: 1.02,
        boxShadow: '0 24px 48px rgba(0,0,0,0.55), 0 0 0 1px rgba(14,165,233,0.4)',
      }}
      whileTap={{ scale: 0.98 }}
      transition={SPRING_SOFT}
      style={{
        rotateX: reduceMotion ? 0 : rotateX,
        rotateY: reduceMotion ? 0 : rotateY,
        transformPerspective: 1000,
        transformStyle: 'preserve-3d',
        background: GLASS.card,
        border: `1px solid ${GLASS.border}`,
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
      className="group text-left rounded-xl overflow-hidden relative"
    >
      {/* Inner wrapper for idle drift (keeps tilt + drift independent) */}
      <motion.div
        animate={!reduceMotion ? { y: [0, -3.5, 0] } : undefined}
        transition={{
          duration: idleDuration,
          repeat: Infinity,
          repeatType: 'loop',
          ease: 'easeInOut',
          delay: idleDelay,
        }}
      >
        {/* Thumbnail */}
        <div
          className={`relative flex items-end p-5 ${compact ? 'h-24' : 'h-32'}`}
          style={{ background: cityColorDark(city.id), transform: 'translateZ(0)' }}
        >
          <div
            style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(to top, rgba(10,15,28,0.85) 0%, transparent 60%)',
            }}
          />
          {/* Subtle moving sheen */}
          {!reduceMotion && (
            <motion.div
              aria-hidden="true"
              style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(120deg, transparent 30%, rgba(56,189,248,0.10) 50%, transparent 70%)',
                pointerEvents: 'none',
              }}
              animate={{ x: ['-110%', '110%'] }}
              transition={{
                duration: 6 + idleDelay,
                repeat: Infinity,
                repeatDelay: 2 + (index % 4),
                ease: 'linear',
              }}
            />
          )}
          <h3
            className="relative font-display font-bold text-lg leading-tight"
            style={{ color: '#f1f5f9', textShadow: '0 1px 4px rgba(0,0,0,0.6)', transform: 'translateZ(28px)' }}
          >
            {city.name}
          </h3>
        </div>

        {/* Info */}
        <div className="p-5">
          <p className="font-mono text-[11px] mb-2" style={{ color: GLASS.textMuted }}>
            {typeLabel} · {populationLabel} residents
          </p>
          <p className="text-xs leading-relaxed line-clamp-2" style={{ color: GLASS.textSecondary, fontSize: 12, lineHeight: 1.6 }}>
            {city.key_planning_challenge}
          </p>
          <motion.div
            initial={{ opacity: 0.8 }}
            whileHover={{ x: 4, opacity: 1 }}
            transition={SPRING_SNAP}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[10px] font-bold font-mono tracking-widest uppercase"
            style={{
              color: '#0ea5e9',
              borderColor: 'rgba(14,165,233,0.35)',
              background: 'rgba(14,165,233,0.08)',
            }}
          >
            SIMULATE →
          </motion.div>
        </div>
      </motion.div>
    </motion.button>
  )
}

// ──────────────────────────────────────────────────────────────────────────
// Data Sources Marquee — infinite horizontal scroll
// ──────────────────────────────────────────────────────────────────────────

const DATA_SOURCES = [
  'EJScreen',
  '15-Minute City Framework',
  'OpenFreeMap',
  'MapLibre GL',
  'Anthropic Claude',
  'CartoDB',
  'PyTorch + Stable Baselines3',
  'PostGIS',
  'FastAPI · Redis · WebSockets',
]

function DataSourcesMarquee({ reduceMotion }: { reduceMotion: boolean }) {
  // Duplicate for seamless loop
  const items = useMemo(() => [...DATA_SOURCES, ...DATA_SOURCES], [])

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...SPRING_SOFT, delay: 1.1 }}
      className="absolute bottom-0 left-0 right-0"
      style={{
        zIndex: 5,
        background: 'linear-gradient(180deg, transparent 0%, rgba(8,13,26,0.85) 30%, rgba(8,13,26,0.95) 100%)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderTop: '1px solid rgba(14,165,233,0.18)',
        paddingTop: 14,
        paddingBottom: 14,
        overflow: 'hidden',
      }}
    >
      {/* Edge fade masks */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', top: 0, bottom: 0, left: 0, width: 80,
          background: 'linear-gradient(90deg, rgba(8,13,26,1) 0%, transparent 100%)',
          zIndex: 2, pointerEvents: 'none',
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', top: 0, bottom: 0, right: 0, width: 80,
          background: 'linear-gradient(270deg, rgba(8,13,26,1) 0%, transparent 100%)',
          zIndex: 2, pointerEvents: 'none',
        }}
      />

      <motion.div
        className="flex"
        style={{ width: 'max-content', gap: 32 }}
        animate={!reduceMotion ? { x: ['0%', '-50%'] } : undefined}
        transition={{ duration: 38, repeat: Infinity, ease: 'linear' }}
      >
        {items.map((label, i) => (
          <div key={i} className="flex items-center gap-3 shrink-0">
            <span
              className="inline-block w-1 h-1 rounded-full"
              style={{ background: '#0ea5e9', boxShadow: '0 0 6px rgba(14,165,233,0.7)' }}
            />
            <span
              className="font-mono text-[10px] uppercase tracking-widest"
              style={{ color: GLASS.textSecondary, letterSpacing: '0.22em' }}
            >
              {label}
            </span>
          </div>
        ))}
      </motion.div>
    </motion.div>
  )
}

// ──────────────────────────────────────────────────────────────────────────
// Sandbox overlay
// ──────────────────────────────────────────────────────────────────────────

function SandboxOverlay({ onClose, onGenerated }: { onClose: () => void; onGenerated: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-50 overflow-auto p-8"
      style={{ background: '#080d1a' }}
    >
      <motion.button
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ ...SPRING_ENTER, delay: 0.15 }}
        whileHover={{ scale: 1.06, borderColor: 'rgba(14,165,233,0.55)' }}
        whileTap={{ scale: 0.94 }}
        onClick={onClose}
        className="fixed top-5 right-5 flex items-center justify-center w-9 h-9 rounded-lg"
        style={{
          border: `1px solid ${GLASS.border}`,
          color: GLASS.textSecondary,
          background: GLASS.card,
          backdropFilter: 'blur(12px)',
        }}
        aria-label="Close sandbox builder"
      >
        <X size={16} />
      </motion.button>
      <SandboxBuilder onGenerated={() => { onClose(); onGenerated() }} />
    </motion.div>
  )
}

// ──────────────────────────────────────────────────────────────────────────
// Shared brand bits
// ──────────────────────────────────────────────────────────────────────────

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
      <path
        d="M4 40V22h7V10h9v30h5V16h8v24h5V4h11v36h4v4H1v-4h3z"
        fill="#0ea5e9"
        style={{ filter: 'drop-shadow(0 0 10px rgba(14,165,233,0.7))' }}
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
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: 'rgba(14,165,233,0.25)',
            border: '1px solid rgba(14,165,233,0.4)',
            boxShadow: '0 0 6px rgba(14,165,233,0.3)',
            ...pos,
          }}
        />
      ))}
    </>
  )
}

function cityColorDark(id: string): string {
  const map: Record<string, string> = {
    new_york:    'linear-gradient(135deg, #0f2027, #203a43)',
    los_angeles: 'linear-gradient(135deg, #1a0a00, #2d1b00)',
    tokyo:       'linear-gradient(135deg, #0d1117, #1a2744)',
    lagos:       'linear-gradient(135deg, #001a0a, #003d1f)',
    london:      'linear-gradient(135deg, #0f1923, #1c2e3d)',
    sao_paulo:   'linear-gradient(135deg, #1a001a, #2d003d)',
    singapore:   'linear-gradient(135deg, #001a12, #003d28)',
    dubai:       'linear-gradient(135deg, #1a0f00, #2d1f00)',
    mumbai:      'linear-gradient(135deg, #1a0800, #2d1500)',
    fremont:     'linear-gradient(135deg, #001533, #0a2547)',
    fremon:      'linear-gradient(135deg, #060d1a, #0f1f3d)',
    san_jose:    'linear-gradient(135deg, #0a001a, #1a0033)',
    sacramento:  'linear-gradient(135deg, #001a1a, #003333)',
    stockton:    'linear-gradient(135deg, #001a0d, #003320)',
    austin:      'linear-gradient(135deg, #1a0000, #330000)',
    phoenix:     'linear-gradient(135deg, #1a0800, #331500)',
  }
  return map[id] ?? 'linear-gradient(135deg, #0f172a, #1e293b)'
}
