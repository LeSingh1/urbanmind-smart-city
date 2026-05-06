import { useEffect, useMemo, useCallback, useRef, useState } from 'react'
import { MapContainer as LeafletMap, TileLayer, CircleMarker, Circle, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { motion, AnimatePresence } from 'framer-motion'
import { useCityStore } from '@/stores/cityStore'
import { useSimulationStore } from '@/stores/simulationStore'
import type { UserPlacedZone } from '@/stores/simulationStore'
import { useUIStore } from '@/stores/uiStore'
import { useNotification } from '@/hooks/useNotification'
import { useScenarioStore } from '@/stores/scenarioStore'
import { useAIStore } from '@/stores/aiStore'
import { getZoneColor, getZoneToken } from '@/utils/colorUtils'
import { ExplanationTooltip } from './ExplanationTooltip'
import { MiniMetricsPanel } from './MiniMetricsPanel'
import { SplitScreenView } from '@/components/Layout/SplitScreenView'
import { ZoneLegend } from './ZoneLegend'
import type { Landmark } from '@/types/city.types'

// Service coverage radii in metres for facility zone types
const SERVICE_RADII: Record<string, number> = {
  '--zone-health':      2000,
  '--zone-education':    800,
  '--zone-transit':      600,
  '--zone-government':  1200,
  '--zone-disaster':    1200,
  '--zone-utility':      400,
  '--zone-smart':        250,
  '--zone-commercial':   500,
}

function getServiceRadius(zoneTypeId: string): number | null {
  return SERVICE_RADII[getZoneToken(zoneTypeId)] ?? null
}

interface ServiceArea { lat: number; lng: number; radius: number; color: string }

// ─── Map click handler for zone placement ────────────────────────────────────
function MapClickHandler({
  active,
  zoneTypeId,
  onPlace,
}: {
  active: boolean
  zoneTypeId: string | null
  onPlace: (lat: number, lng: number) => void
}) {
  useMapEvents({
    click(e) {
      if (active && zoneTypeId) {
        onPlace(e.latlng.lat, e.latlng.lng)
      }
    },
  })
  return null
}

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
  onClick: (d: DotFeature, x: number, y: number) => void
  highlightedToken: string | null
}

function DotLayer({ dots, onHover, onClick, highlightedToken }: DotLayerProps) {
  return (
    <>
      {dots.map((dot) => {
        const token = getZoneToken(dot.properties?.zone_type_id ?? '')
        const dimmed = highlightedToken !== null && token !== highlightedToken
        return (
        <CircleMarker
          key={dot.id}
          center={[dot.lat, dot.lng]}
          radius={dimmed ? dot.radius * 0.6 : dot.radius}
          pathOptions={{
            color: dot.color,
            fillColor: dot.color,
            fillOpacity: dimmed ? 0.1 : 0.85,
            weight: dimmed ? 0.5 : 1.5,
            opacity: dimmed ? 0.15 : 0.9,
          }}
          eventHandlers={{
            mouseover(e) {
              if (dimmed) return
              const p = e.containerPoint
              onHover(dot, p.x, p.y)
              ;(e.target as L.CircleMarker).setStyle({ fillOpacity: 1, weight: 3 } as any)
            },
            mouseout(e) {
              onHover(null, 0, 0)
              ;(e.target as L.CircleMarker).setStyle({
                fillOpacity: dimmed ? 0.1 : 0.85,
                weight: dimmed ? 0.5 : 1.5,
              } as any)
            },
            click(e) {
              const p = e.containerPoint
              onHover(null, 0, 0)
              onClick(dot, p.x, p.y)
            },
          }}
        />
        )
      })}
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
  const [serviceArea, setServiceArea] = useState<ServiceArea | null>(null)

  const city = useCityStore((s) => s.selectedCity)
  const frame = useSimulationStore((s) => s.currentFrame)
  const activeLayers = useUIStore((s) => s.activeLayers)
  const isSplitScreen = useUIStore((s) => s.isSplitScreen)
  const detailedGrid = useUIStore((s) => s.detailedGrid)
  const isRunning = useSimulationStore((s) => s.isRunning)
  const isPaused = useSimulationStore((s) => s.isPaused)
  const openDrawer = useUIStore((s) => s.openDrawer)
  const highlightedZoneToken = useUIStore((s) => s.highlightedZoneToken)
  const isOverrideModeActive = useUIStore((s) => s.isOverrideModeActive)
  const selectedOverrideZone = useUIStore((s) => s.selectedOverrideZone)
  const userZones = useSimulationStore((s) => s.userZones)
  const addUserZone = useSimulationStore((s) => s.addUserZone)
  const scenario = useScenarioStore((s) => s.activeScenario)
  const fetchExplanation = useAIStore((s) => s.fetchExplanation)
  const notify = useNotification((s) => s.notify)

  const handlePlaceZone = useCallback(
    (lat: number, lng: number) => {
      if (!selectedOverrideZone) return
      const zone: UserPlacedZone = {
        id: `user-${Date.now()}`,
        lat,
        lng,
        zone_type_id: selectedOverrideZone,
      }
      addUserZone(zone)
      const label = selectedOverrideZone.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
      notify('success', `Placed ${label} at (${lat.toFixed(4)}, ${lng.toFixed(4)})`, 2500)
    },
    [selectedOverrideZone, addUserZone, notify]
  )

  const handleHover = useCallback(
    (dot: DotFeature | null, x: number, y: number) => {
      setHovered(dot ? { x, y, properties: dot.properties } : null)
    },
    []
  )

  const handleClick = useCallback(
    async (dot: DotFeature) => {
      const props = dot.properties ?? {}
      const zone = props.zone_type_id ?? 'RES_LOW_DETACHED'
      const displayName = props.zone_display_name ?? props.building_name ?? zone
      const placementReason = props.placement_reason ?? null
      const spsScore: number | undefined = props.sps_score

      // Show service coverage circle if this zone type has one
      const radius = getServiceRadius(zone)
      if (radius) {
        setServiceArea((prev) =>
          prev && Math.abs(prev.lat - dot.lat) < 0.00001 ? null // toggle off
            : { lat: dot.lat, lng: dot.lng, radius, color: getZoneColor(zone) }
        )
      } else {
        setServiceArea(null)
      }

      const explanationText = await fetchExplanation({
        type: 'zone_explanation',
        zone_type_id: zone,
        zone_display_name: displayName,
        city_name: city?.name ?? 'the city',
        surrounding_context: placementReason ?? 'Nearby zones, road access, service coverage, terrain conditions, and forecast growth pressure.',
        metrics_delta: frame?.metrics_snapshot ?? {},
        scenario_goal: scenario,
      })

      openDrawer({
        zone_type_id: zone,
        zone_display_name: displayName,
        x: props.x ?? 0,
        y: props.y ?? 0,
        year: frame?.year ?? 0,
        explanation_text: explanationText,
        metrics_delta: frame?.metrics_snapshot ?? {},
        surrounding_context: placementReason ?? 'Nearby zones, transit distance, terrain class, and scenario objective.',
        placement_reason: placementReason ?? undefined,
        sps_score: spsScore,
      })
    },
    [city, frame, scenario, fetchExplanation, openDrawer]
  )

  // Build dots from landmarks (initial state) or from simulation zones
  const dots = useMemo<DotFeature[]>(() => {
    const userDots: DotFeature[] = userZones.map((uz) => ({
      id: uz.id,
      lat: uz.lat,
      lng: uz.lng,
      color: getZoneColor(uz.zone_type_id),
      radius: 8,
      properties: {
        zone_type_id: uz.zone_type_id,
        zone_display_name: uz.zone_type_id.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()),
        isKeyInfrastructure: false,
        isUserPlaced: true,
        fill: getZoneColor(uz.zone_type_id),
      },
    }))
    // ── Simulation is running or paused: derive dots from zone GeoJSON centroids ──
    if ((isRunning || isPaused || detailedGrid) && frame) {
      const simDots = frame.zones_geojson.features.map((f: any, i: number) => {
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
          properties: { ...f.properties, zone_type_id: zone, fill: getZoneColor(zone) },
        }
      })
      return [...simDots, ...userDots]
    }

    // ── Default: one dot per city landmark ──
    const landmarks: Landmark[] = city?.landmarks ?? []
    return [...landmarks.map((lm, i) => ({
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
    })), ...userDots]
  }, [city, frame, isRunning, isPaused, detailedGrid, userZones])

  const showDots = activeLayers.has('Zones')
  const isLive = (isRunning || isPaused || detailedGrid) && !!frame

  const initialCenter: [number, number] = city
    ? [city.center_lat, city.center_lng]
    : [40.71, -74.01]
  const initialZoom = city?.default_zoom ?? 12

  // Derive max bounds from city bbox [west, south, east, north] with padding
  const maxBounds: L.LatLngBoundsExpression | undefined = city
    ? [
        [city.bbox[1] - 0.05, city.bbox[0] - 0.05],
        [city.bbox[3] + 0.05, city.bbox[2] + 0.05],
      ]
    : undefined

  return (
    <main
      style={{
        flex: 1,
        position: 'relative',
        minWidth: 0,
        height: '100%',
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
            maxBounds={maxBounds}
            maxBoundsViscosity={0.85}
            minZoom={10}
          >
            {/* Dark CartoDB basemap */}
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
              maxZoom={20}
              subdomains="abcd"
            />

            {city && <CityFlyController city={city} />}
            <MapClickHandler
              active={isOverrideModeActive}
              zoneTypeId={selectedOverrideZone}
              onPlace={handlePlaceZone}
            />
            {showDots && (
              <DotLayer
                dots={dots}
                onHover={handleHover}
                onClick={handleClick}
                highlightedToken={highlightedZoneToken}
              />
            )}
            {serviceArea && (
              <Circle
                center={[serviceArea.lat, serviceArea.lng]}
                radius={serviceArea.radius}
                pathOptions={{
                  color: serviceArea.color,
                  fillColor: serviceArea.color,
                  fillOpacity: 0.07,
                  weight: 1.5,
                  opacity: 0.5,
                  dashArray: '6 4',
                }}
              />
            )}
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

      {hovered && !isOverrideModeActive && <ExplanationTooltip hover={hovered} />}

      {/* Override-mode cursor banner */}
      {isOverrideModeActive && selectedOverrideZone && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          style={{
            position: 'absolute',
            top: 12,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 20,
            pointerEvents: 'none',
            background: 'var(--color-bg-sidebar)',
            border: `1px solid ${getZoneColor(selectedOverrideZone)}55`,
            borderRadius: 8,
            padding: '6px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            letterSpacing: '0.12em',
            color: getZoneColor(selectedOverrideZone),
          }}
        >
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: getZoneColor(selectedOverrideZone), flexShrink: 0 }} />
          PLACING: {selectedOverrideZone.replace(/_/g, ' ')}
        </motion.div>
      )}

      <MiniMetricsPanel />
      <ZoneLegend />
    </main>
  )
}
