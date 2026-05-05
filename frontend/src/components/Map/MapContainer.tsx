import { useEffect, useMemo, useCallback, useRef, useState } from 'react'
import { MapContainer as LeafletMap, TileLayer, CircleMarker, useMap } from 'react-leaflet'
import L from 'leaflet'
import { motion, AnimatePresence } from 'framer-motion'
import { useCityStore } from '@/stores/cityStore'
import { useSimulationStore } from '@/stores/simulationStore'
import { useUIStore } from '@/stores/uiStore'
import { getZoneColor } from '@/utils/colorUtils'
import { ExplanationTooltip } from './ExplanationTooltip'
import { MiniMetricsPanel } from './MiniMetricsPanel'
import { SplitScreenView } from '@/components/Layout/SplitScreenView'
import { ZoneLegend } from './ZoneLegend'
import type { Landmark } from '@/types/city.types'

// ─── Fly-to controller (must live inside <LeafletMap>) ───────────────────────
function CityFlyController({ city }: { city: any }) {
  const map = useMap()
  const prevId = useRef<string | null>(null)
  useEffect(() => {
    if (!city || prevId.current === city.id) return
    prevId.current = city.id
    map.flyTo([city.center_lat, city.center_lng], city.default_zoom, { duration: 1.8 })
  }, [city, map])
  return null
}

// ─── Dot markers rendered inside the map ────────────────────────────────────
interface DotFeature {
  id: string
  lat: number
  lng: number
  color: string
  radius: number
  properties: any
}

interface DotLayerProps {
  dots: DotFeature[]
  onHover: (d: DotFeature | null, x: number, y: number) => void
}

function DotLayer({ dots, onHover }: DotLayerProps) {
  return (
    <>
      {dots.map((dot) => (
        <CircleMarker
          key={dot.id}
          center={[dot.lat, dot.lng]}
          radius={dot.radius}
          pathOptions={{
            color: dot.color,
            fillColor: dot.color,
            fillOpacity: 0.85,
            weight: 1.5,
            opacity: 0.9,
          }}
          eventHandlers={{
            mouseover(e) {
              const p = e.containerPoint
              onHover(dot, p.x, p.y)
              ;(e.target as L.CircleMarker).setStyle({
                fillOpacity: 1,
                weight: 3,
                radius: dot.radius + 3,
              } as any)
            },
            mouseout(e) {
              onHover(null, 0, 0)
              ;(e.target as L.CircleMarker).setStyle({
                fillOpacity: 0.85,
                weight: 1.5,
                radius: dot.radius,
              } as any)
            },
          }}
        />
      ))}
    </>
  )
}

// ─── Animated overlay for "no city selected" state ──────────────────────────
function EmptyMapOverlay() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 5,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
    >
      <motion.div
        animate={{ opacity: [0.3, 0.7, 0.3] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          letterSpacing: '0.25em',
          textTransform: 'uppercase',
          color: 'rgba(0,212,255,0.5)',
          textAlign: 'center',
        }}
      >
        Select a city to begin
      </motion.div>
    </motion.div>
  )
}

// ─── Dot count badge ─────────────────────────────────────────────────────────
function DotCountBadge({ count, isLive }: { count: number; isLive: boolean }) {
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          key={count}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }}
          transition={{ duration: 0.25 }}
          style={{
            position: 'absolute',
            top: 12,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 15,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 10px',
            borderRadius: 999,
            background: 'rgba(11,17,28,0.82)',
            border: '1px solid rgba(0,212,255,0.2)',
            backdropFilter: 'blur(10px)',
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            letterSpacing: '0.15em',
            color: 'rgba(0,212,255,0.7)',
            pointerEvents: 'none',
          }}
        >
          {isLive && (
            <motion.span
              style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--color-accent-cyan)', display: 'inline-block' }}
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.2, repeat: Infinity }}
            />
          )}
          {count} {isLive ? 'ZONES' : 'LANDMARKS'}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────
export function MapContainer() {
  const [hovered, setHovered] = useState<{ x: number; y: number; properties: any } | null>(null)

  const city = useCityStore((s) => s.selectedCity)
  const frame = useSimulationStore((s) => s.currentFrame)
  const activeLayers = useUIStore((s) => s.activeLayers)
  const isSplitScreen = useUIStore((s) => s.isSplitScreen)
  const detailedGrid = useUIStore((s) => s.detailedGrid)
  const isRunning = useSimulationStore((s) => s.isRunning)

  const handleHover = useCallback(
    (dot: DotFeature | null, x: number, y: number) => {
      setHovered(dot ? { x, y, properties: dot.properties } : null)
    },
    []
  )

  // Build dots from landmarks (initial state) or from simulation zones
  const dots = useMemo<DotFeature[]>(() => {
    // ── Simulation is running: derive dots from zone GeoJSON centroids ──
    if ((isRunning || detailedGrid) && frame) {
      return frame.zones_geojson.features.map((f: any, i: number) => {
        const coords: number[][] = f.geometry.coordinates[0]
        const lng = coords.reduce((s: number, c: number[]) => s + c[0], 0) / coords.length
        const lat = coords.reduce((s: number, c: number[]) => s + c[1], 0) / coords.length
        const zone = f.properties?.zone_type_id ?? 'RES_LOW_DETACHED'
        const isKey = f.properties?.isKeyInfrastructure === true
        return {
          id: `sim-${i}`,
          lat,
          lng,
          color: getZoneColor(zone),
          radius: isKey ? 9 : 5,
          properties: {
            ...f.properties,
            zone_type_id: zone,
            fill: getZoneColor(zone),
          },
        }
      })
    }

    // ── Default: one dot per city landmark ──
    const landmarks: Landmark[] = city?.landmarks ?? []
    return landmarks.map((lm, i) => ({
      id: `lm-${i}`,
      lat: lm.lat,
      lng: lm.lng,
      color: getZoneColor(lm.zone_type_id),
      radius: 9,
      properties: {
        zone_type_id: lm.zone_type_id,
        building_name: lm.name,
        category: lm.category,
        data_source: lm.data_source,
        isKeyInfrastructure: true,
        fill: getZoneColor(lm.zone_type_id),
      },
    }))
  }, [city, frame, isRunning, detailedGrid])

  const showDots = activeLayers.has('Zones')
  const isLive = (isRunning || detailedGrid) && !!frame

  const initialCenter: [number, number] = city
    ? [city.center_lat, city.center_lng]
    : [40.71, -74.01]
  const initialZoom = city?.default_zoom ?? 12

  return (
    <main
      style={{
        flex: 1,
        position: 'relative',
        minWidth: 0,
        height: '100%',       // ← critical: lets LeafletMap see a defined height
        overflow: 'hidden',
        background: '#0d1117',
      }}
    >
      {isSplitScreen ? (
        <SplitScreenView />
      ) : (
        // Absolute wrapper ensures the map fills the entire <main>
        <div style={{ position: 'absolute', inset: 0 }}>
          <LeafletMap
            key={city?.id ?? 'default'}          // remount when city changes
            center={initialCenter}
            zoom={initialZoom}
            style={{ width: '100%', height: '100%' }}
            zoomControl={false}
          >
            {/* Dark CartoDB basemap */}
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
              maxZoom={20}
              subdomains="abcd"
            />

            {city && <CityFlyController city={city} />}
            {showDots && <DotLayer dots={dots} onHover={handleHover} />}
          </LeafletMap>
        </div>
      )}

      {/* Overlays rendered on top of the map ─────────────────────────── */}
      <AnimatePresence>
        {!city && <EmptyMapOverlay />}
      </AnimatePresence>

      {showDots && (
        <DotCountBadge count={dots.length} isLive={isLive} />
      )}

      {hovered && <ExplanationTooltip hover={hovered} />}
      <MiniMetricsPanel />
      <ZoneLegend />
    </main>
  )
}
