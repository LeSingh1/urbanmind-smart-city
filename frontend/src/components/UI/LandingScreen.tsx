import { useEffect, useRef, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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

// Flyover cities: rotate through these on the landing screen
const FLYOVER_CITIES = [
  { lat: 37.5485, lng: -121.9886, zoom: 14.5, bearing: 0,   pitch: 52, name: 'Fremont, CA' },
  { lat: 37.3382, lng: -121.8863, zoom: 13.5, bearing: 30,  pitch: 48, name: 'San Jose, CA' },
  { lat: 37.5485, lng: -121.9886, zoom: 15.0, bearing: 180, pitch: 55, name: 'Fremon District' },
]

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
      center: [FLYOVER_CITIES[0].lng, FLYOVER_CITIES[0].lat],
      zoom: FLYOVER_CITIES[0].zoom,
      pitch: FLYOVER_CITIES[0].pitch,
      bearing: FLYOVER_CITIES[0].bearing,
      antialias: true,
      interactive: false,
      attributionControl: false,
    })

    mapRef.current = map

    map.on('load', () => {
      setMapReady(true)
      // Start slow continuous rotation
      let bearing = FLYOVER_CITIES[0].bearing
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
      <div
        ref={mapContainerRef}
        style={{ position: 'absolute', inset: 0, zIndex: 0 }}
        aria-hidden="true"
      />

      {/* Gradient vignette to darken edges */}
      <div
        style={{
          position: 'absolute', inset: 0, zIndex: 1,
          background: 'radial-gradient(ellipse at center, transparent 20%, rgba(8,13,26,0.55) 100%)',
          pointerEvents: 'none',
        }}
        aria-hidden="true"
      />

      {/* Map ready fade-in */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: mapReady ? 1 : 0 }}
        transition={{ duration: 1.2 }}
        style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none' }}
        aria-hidden="true"
      />

      {/* Content */}
      <div className="relative z-10 h-full overflow-auto">
        <div className="max-w-6xl mx-auto px-8 py-14">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1 } } }}
            className="flex items-start gap-12 mb-14"
          >
            {/* Hero panel — glassmorphic dark */}
            <motion.div
              variants={{ hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } } }}
              className="relative rounded-2xl p-8 shrink-0 w-72"
              style={{
                background: GLASS.panel,
                border: `1px solid ${GLASS.border}`,
                backdropFilter: 'blur(18px)',
                WebkitBackdropFilter: 'blur(18px)',
                boxShadow: '0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(14,165,233,0.12), inset 0 1px 0 rgba(255,255,255,0.06)',
              }}
            >
              <ScrewCorners />

              <div className="mb-4"><CityIcon /></div>

              <h1
                className="font-display font-bold tracking-widest uppercase mb-1"
                style={{ fontSize: 32, color: '#f1f5f9', letterSpacing: '0.15em', lineHeight: 1.1 }}
              >
                UrbanMind
              </h1>
              <p className="font-mono text-[10px] tracking-widest uppercase mb-1" style={{ color: '#0ea5e9', letterSpacing: '0.25em' }}>
                15-Minute City Intelligence
              </p>
              <p className="font-mono text-[9px] tracking-widest uppercase mb-4" style={{ color: GLASS.textMuted, letterSpacing: '0.2em' }}>
                AI · Validated · Deterministic
              </p>

              <p style={{ color: GLASS.textSecondary, fontSize: 12, lineHeight: 1.7 }} className="mb-5">
                Cities spend <strong style={{ color: '#f1f5f9' }}>$1T/year</strong> on infrastructure. 40% underperforms within 30 years. UrbanMind shows you why — before it happens.
              </p>

              {/* Architecture trust badges */}
              <div className="flex flex-col gap-1.5 mb-5">
                <TrustBadge icon={<Layers size={10} />} label="Gap Engine" sub="Deterministic placement" />
                <TrustBadge icon={<Zap size={10} />} label="Claude AI Copilot" sub="Grounded explanation" />
                <TrustBadge icon={<Shield size={10} />} label="12-Rule Validator" sub="Every recommendation gated" />
              </div>

              <TactileButton variant="secondary" onClick={() => setSandboxOpen(true)} icon={<Plus size={13} />}>
                Build a New City
              </TactileButton>

              <div className="mt-4 flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#0ea5e9' }} />
                <span className="font-mono text-[9px]" style={{ color: GLASS.textMuted, letterSpacing: '0.15em' }}>
                  {cities.length} CITIES · 75-YEAR HORIZON
                </span>
              </div>
            </motion.div>

            {/* City grid — dark glass cards */}
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
                  className="rounded-xl border px-4 py-3 text-left text-sm font-semibold transition-all"
                  style={{
                    borderColor: GLASS.border,
                    color: GLASS.textSecondary,
                    background: GLASS.card,
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                  }}
                >
                  {showMoreCities ? 'Hide More Cities' : `More Cities (${moreCities.length})`}
                </button>
              )}
            </motion.div>
          </motion.div>

          {/* Bottom tagline */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.6 }}
            className="flex items-center justify-center gap-6"
          >
            <span className="font-mono text-[10px] tracking-widest uppercase" style={{ color: GLASS.textMuted }}>
              EJScreen-aligned gap methodology
            </span>
            <span style={{ color: GLASS.textMuted, fontSize: 10 }}>·</span>
            <span className="font-mono text-[10px] tracking-widest uppercase" style={{ color: GLASS.textMuted }}>
              15-Minute City framework
            </span>
            <span style={{ color: GLASS.textMuted, fontSize: 10 }}>·</span>
            <span className="font-mono text-[10px] tracking-widest uppercase" style={{ color: GLASS.textMuted }}>
              Open-source planning engine
            </span>
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {sandboxOpen && (
          <SandboxOverlay onClose={() => setSandboxOpen(false)} onGenerated={onEnter} />
        )}
      </AnimatePresence>
    </div>
  )
}

function TrustBadge({ icon, label, sub }: { icon: React.ReactNode; label: string; sub: string }) {
  return (
    <div
      className="flex items-center gap-2 rounded-lg px-2.5 py-1.5"
      style={{
        background: 'rgba(14, 165, 233, 0.08)',
        border: '1px solid rgba(14, 165, 233, 0.18)',
      }}
    >
      <span style={{ color: '#0ea5e9', flexShrink: 0 }}>{icon}</span>
      <div>
        <div className="font-mono text-[9px] font-bold uppercase tracking-widest" style={{ color: '#0ea5e9' }}>{label}</div>
        <div className="font-mono text-[8px]" style={{ color: GLASS.textMuted }}>{sub}</div>
      </div>
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
        background: isPrimary ? '#0ea5e9' : 'rgba(255,255,255,0.07)',
        color: isPrimary ? '#ffffff' : GLASS.textPrimary,
        border: isPrimary ? '1px solid rgba(255,255,255,0.2)' : `1px solid ${GLASS.border}`,
        boxShadow: isPrimary
          ? '0 4px 16px rgba(14,165,233,0.35)'
          : '0 1px 3px rgba(0,0,0,0.3)',
        letterSpacing: '0.08em',
        backdropFilter: 'blur(8px)',
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
      whileHover={{ y: -4, boxShadow: '0 20px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(14,165,233,0.35)' }}
      whileTap={{ scale: 0.98, y: 0 }}
      className="group text-left rounded-xl overflow-hidden transition-all relative"
      style={{
        background: GLASS.card,
        border: `1px solid ${GLASS.border}`,
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      {/* City thumbnail — dark gradient with accent */}
      <div
        className={`relative flex items-end p-5 ${compact ? 'h-24' : 'h-32'}`}
        style={{
          background: cityColorDark(city.id),
        }}
      >
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(10,15,28,0.8) 0%, transparent 60%)' }} />
        <h3
          className="relative font-display font-bold text-lg leading-tight"
          style={{ color: '#f1f5f9', textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}
        >
          {city.name}
        </h3>
      </div>

      {/* City info */}
      <div className="p-5">
        <p className="font-mono text-[11px] mb-2" style={{ color: GLASS.textMuted }}>
          {typeLabel} · {populationLabel} residents
        </p>
        <p className="text-xs leading-relaxed line-clamp-2" style={{ color: GLASS.textSecondary, fontSize: 12, lineHeight: 1.6 }}>
          {city.key_planning_challenge}
        </p>
        <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[10px] font-bold font-mono tracking-widest uppercase" style={{ color: '#0ea5e9', borderColor: 'rgba(14,165,233,0.35)', background: 'rgba(14,165,233,0.08)' }}>
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
      style={{ background: '#080d1a' }}
    >
      <button
        onClick={onClose}
        className="fixed top-5 right-5 flex items-center justify-center w-9 h-9 rounded-lg transition-all"
        style={{
          border: `1px solid ${GLASS.border}`,
          color: GLASS.textSecondary,
          background: GLASS.card,
          backdropFilter: 'blur(12px)',
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
      <path
        d="M4 40V22h7V10h9v30h5V16h8v24h5V4h11v36h4v4H1v-4h3z"
        fill="#0ea5e9"
        style={{ filter: 'drop-shadow(0 0 8px rgba(14,165,233,0.6))' }}
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
