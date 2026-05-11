import { useEffect, useRef, useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { useCityStore } from '@/stores/cityStore'
import { useSimulationStore } from '@/stores/simulationStore'
import type { CityProfile } from '@/types/city.types'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

interface Props {
  onEnter: () => void
}

// Flat tokens — no gradients, no glow.
const C = {
  bg:         '#0b1018',
  bgOverlay:  'rgba(11, 16, 24, 0.62)',
  panel:      'rgba(17, 24, 36, 0.86)',
  card:       'rgba(20, 27, 40, 0.86)',
  border:     'rgba(255, 255, 255, 0.08)',
  borderHover:'rgba(255, 255, 255, 0.16)',
  accent:     '#7dd3fc',
  textPrimary:'#e2e8f0',
  textBody:   '#94a3b8',
  textMuted:  '#64748b',
}

// One spring rhythm.
const SPRING = { type: 'spring' as const, stiffness: 240, damping: 28, mass: 0.9 }
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
          { id: 'background', type: 'background', paint: { 'background-color': '#0b1018' } },
          { id: 'raster-base', type: 'raster', source: 'carto-dark', paint: { 'raster-opacity': 0.78 } },
          {
            id: 'buildings-3d',
            type: 'fill-extrusion',
            source: 'ofm-buildings',
            'source-layer': 'building',
            minzoom: 13,
            paint: {
              // Flat tonal scale — no gradient-style interpolation drama.
              'fill-extrusion-color': '#2b3648',
              'fill-extrusion-height': ['coalesce', ['get', 'height'], ['get', 'render_height'], 5],
              'fill-extrusion-base': ['coalesce', ['get', 'min_height'], 0],
              'fill-extrusion-opacity': 0.82,
            },
          } as maplibregl.LayerSpecification,
        ],
      },
      center: FLYOVER_CENTER,
      zoom: 14.5,
      pitch: 50,
      bearing: 0,
      interactive: false,
      attributionControl: false,
    })

    mapRef.current = map

    map.on('load', () => {
      setMapReady(true)
      let bearing = 0
      const rotate = () => {
        bearing = (bearing + 0.035) % 360
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
  const [showMoreCities, setShowMoreCities] = useState(false)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const { mapReady } = useLandingMap(mapContainerRef)
  const reduceMotion = useReducedMotion()
  const cities = useCityStore((state) => state.cities)
  const selectCity = useCityStore((state) => state.selectCity)
  // Optimized badge: show on a city card if that city's plan is already applied.
  const appliedPlanCityId = useSimulationStore((s) =>
    s.planning.hasAppliedAIPlan ? s.planning.cityId : null,
  )
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
    <div className="relative h-screen overflow-hidden" style={{ background: C.bg }}>
      {/* Live 3D map background */}
      <motion.div
        ref={mapContainerRef}
        initial={{ opacity: 0 }}
        animate={{ opacity: mapReady ? 1 : 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        style={{ position: 'absolute', inset: 0, zIndex: 0 }}
        aria-hidden="true"
      />

      {/* Flat readability overlay — no gradient. */}
      <div
        style={{ position: 'absolute', inset: 0, zIndex: 1, background: C.bgOverlay, pointerEvents: 'none' }}
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
              visible: { transition: { staggerChildren: 0.08, delayChildren: 0.12 } },
            }}
            className="flex items-start gap-12 mb-14"
          >
            <HeroPanel cityCount={cities.length} />

            <motion.div
              variants={{
                hidden: {},
                visible: { transition: { staggerChildren: 0.06, delayChildren: 0.28 } },
              }}
              className="flex-1 grid gap-6"
              style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))' }}
            >
              {mainCities.map((city) => (
                <CityCard
                  key={city.id}
                  city={city}
                  onSelect={chooseCity}
                  reduceMotion={!!reduceMotion}
                  isOptimized={appliedPlanCityId === city.id}
                />
              ))}
              {showMoreCities && moreCities.map((city) => (
                <CityCard
                  key={city.id}
                  city={city}
                  onSelect={chooseCity}
                  compact
                  reduceMotion={!!reduceMotion}
                  isOptimized={appliedPlanCityId === city.id}
                />
              ))}
              {moreCities.length > 0 && (
                <motion.button
                  variants={{
                    hidden: { opacity: 0, y: 14 },
                    visible: { opacity: 1, y: 0, transition: SPRING },
                  }}
                  onClick={() => setShowMoreCities((v) => !v)}
                  whileHover={{ borderColor: C.borderHover }}
                  whileTap={{ scale: 0.98 }}
                  transition={SPRING}
                  className="rounded-xl border px-4 py-3 text-left text-sm font-medium"
                  style={{
                    borderColor: C.border,
                    color: C.textBody,
                    background: C.card,
                  }}
                >
                  {showMoreCities ? 'Hide more' : `More cities (${moreCities.length})`}
                </motion.button>
              )}
            </motion.div>
          </motion.div>

          {/* Static credit row — no marquee, no animation. */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.4 }}
            className="flex items-center gap-3 flex-wrap"
            style={{ color: C.textMuted }}
          >
            <span className="font-mono text-[10px] uppercase tracking-widest">EJScreen-aligned</span>
            <span className="font-mono text-[10px]">·</span>
            <span className="font-mono text-[10px] uppercase tracking-widest">15-Minute City framework</span>
            <span className="font-mono text-[10px]">·</span>
            <span className="font-mono text-[10px] uppercase tracking-widest">MapLibre · OpenFreeMap</span>
          </motion.div>
        </div>
      </div>

    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────
// Hero panel — flat glass, no glow, no pulse, no decorations.
// ──────────────────────────────────────────────────────────────────────────

function HeroPanel({
  cityCount,
}: {
  cityCount: number
}) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: SPRING },
      }}
      className="relative shrink-0 w-72 rounded-2xl"
      style={{
        background: C.panel,
        border: `1px solid ${C.border}`,
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }}
    >
      <div className="p-8">
        <div className="mb-5"><CityIcon /></div>

        <h1
          className="font-display font-semibold mb-1"
          style={{ fontSize: 30, color: C.textPrimary, letterSpacing: '-0.01em', lineHeight: 1.05 }}
        >
          UrbanMind
        </h1>
        <p
          className="font-mono text-[10px] uppercase mb-1"
          style={{ color: C.accent, letterSpacing: '0.18em' }}
        >
          15-Minute City Intelligence
        </p>
        <p
          className="font-mono text-[9px] uppercase mb-5"
          style={{ color: C.textMuted, letterSpacing: '0.18em' }}
        >
          AI · Validated · Deterministic
        </p>

        <p style={{ color: C.textBody, fontSize: 13, lineHeight: 1.6 }} className="mb-6">
          Cities spend <span style={{ color: C.textPrimary }}>$1T/year</span> on infrastructure.
          40% underperforms within 30 years. UrbanMind shows you why — before it happens.
        </p>

        {/* Trust strip — flat list, no badges, no boxes, no tint. */}
        <ul className="mb-6 space-y-1.5" style={{ color: C.textBody }}>
          <li className="font-mono text-[10px] flex items-center gap-2">
            <Bullet /> <span style={{ color: C.textPrimary }}>Gap Engine</span>
            <span style={{ color: C.textMuted }}>— deterministic placement</span>
          </li>
          <li className="font-mono text-[10px] flex items-center gap-2">
            <Bullet /> <span style={{ color: C.textPrimary }}>Claude AI Copilot</span>
            <span style={{ color: C.textMuted }}>— grounded explanation</span>
          </li>
          <li className="font-mono text-[10px] flex items-center gap-2">
            <Bullet /> <span style={{ color: C.textPrimary }}>12-rule Validator</span>
            <span style={{ color: C.textMuted }}>— every recommendation gated</span>
          </li>
        </ul>

        <div className="mt-1 font-mono text-[9px]" style={{ color: C.textMuted, letterSpacing: '0.12em' }}>
          {cityCount} CITIES · 75-YEAR HORIZON
        </div>
      </div>
    </motion.div>
  )
}

function Bullet() {
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'inline-block',
        width: 4,
        height: 4,
        borderRadius: '50%',
        background: C.accent,
        flexShrink: 0,
      }}
    />
  )
}

// ──────────────────────────────────────────────────────────────────────────
// City card — flat, single hover lift, no parallax, no idle motion.
// ──────────────────────────────────────────────────────────────────────────

function CityCard({
  city,
  onSelect,
  compact = false,
  reduceMotion: _reduceMotion,
  isOptimized = false,
}: {
  city: CityProfile
  onSelect: (c: CityProfile) => void
  compact?: boolean
  reduceMotion: boolean
  isOptimized?: boolean
}) {
  const typeLabel = city.id === 'fremon' ? 'Generated city' : 'Real city'
  const populationLabel = city.population_current.toLocaleString()
  return (
    <motion.button
      variants={{
        hidden: { opacity: 0, y: 16 },
        visible: { opacity: 1, y: 0, transition: SPRING },
      }}
      onClick={() => onSelect(city)}
      whileHover={{ y: -2, borderColor: C.borderHover }}
      whileTap={{ scale: 0.99 }}
      transition={SPRING}
      className="group text-left rounded-xl overflow-hidden relative"
      style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      {/* Flat thumbnail — solid color per city, no gradient overlays. */}
      <div
        className={`relative flex items-end p-5 ${compact ? 'h-20' : 'h-28'}`}
        style={{ background: cityColorFlat(city.id) }}
      >
        {isOptimized && (
          <span
            className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-widest"
            style={{
              color: C.bg,
              background: '#34d399',
              letterSpacing: '0.14em',
            }}
            aria-label="Plan applied — city is optimized"
          >
            <span style={{ width: 4, height: 4, borderRadius: '50%', background: C.bg, display: 'inline-block' }} />
            Optimized
          </span>
        )}
        <h3
          className="font-display text-base font-semibold"
          style={{ color: C.textPrimary, letterSpacing: '-0.01em' }}
        >
          {city.name}
        </h3>
      </div>

      <div className="p-5">
        <p className="font-mono text-[10px] mb-2" style={{ color: C.textMuted }}>
          {typeLabel} · {populationLabel}
        </p>
        <p className="text-xs leading-relaxed line-clamp-2" style={{ color: C.textBody, lineHeight: 1.5 }}>
          {city.key_planning_challenge}
        </p>
        <div
          className="mt-3 inline-flex items-center gap-1 font-mono text-[10px] uppercase"
          style={{ color: isOptimized ? '#34d399' : C.accent, letterSpacing: '0.16em' }}
        >
          {isOptimized ? 'View report →' : 'Simulate →'}
        </div>
      </div>
    </motion.button>
  )
}

// ──────────────────────────────────────────────────────────────────────────
// Brand bits
// ──────────────────────────────────────────────────────────────────────────

export function Logo({ large = false }: { large?: boolean }) {
  return (
    <div className="inline-flex items-center gap-3">
      <span
        className="font-display font-semibold"
        style={{
          fontSize: large ? 28 : 15,
          color: 'var(--color-accent-cyan)',
          letterSpacing: '-0.01em',
        }}
      >
        UrbanMind
      </span>
      {large && (
        <span className="font-mono text-xs" style={{ color: 'var(--color-text-muted)', letterSpacing: '0.16em' }}>
          AI
        </span>
      )}
    </div>
  )
}

function CityIcon() {
  return (
    <svg width={36} height={28} viewBox="0 0 56 44" aria-hidden="true">
      <path
        d="M4 40V22h7V10h9v30h5V16h8v24h5V4h11v36h4v4H1v-4h3z"
        fill={C.accent}
      />
    </svg>
  )
}

// Flat single colors — no gradients.
function cityColorFlat(id: string): string {
  const map: Record<string, string> = {
    new_york:    '#1a2330',
    los_angeles: '#241a14',
    tokyo:       '#16202e',
    lagos:       '#142318',
    london:      '#1c242e',
    sao_paulo:   '#1f1726',
    singapore:   '#142420',
    dubai:       '#241e14',
    mumbai:      '#241914',
    fremont:     '#15212e',
    fremon:      '#171f2a',
    san_jose:    '#191726',
    sacramento:  '#162222',
    stockton:    '#162018',
    austin:      '#231414',
    phoenix:     '#241814',
  }
  return map[id] ?? '#1a2330'
}
