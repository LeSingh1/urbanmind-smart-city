import { useEffect, useMemo, useCallback, useRef, useState } from 'react'
import { MapContainer as LeafletMap, TileLayer, CircleMarker, Circle, Marker, Popup, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { motion, AnimatePresence } from 'framer-motion'
import { Building2, Bus, Cross, Flame, GraduationCap, Home, Layers, Shield, TreePine, Zap } from 'lucide-react'
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
import { Map3DView } from './Map3DView'
import type { Landmark } from '@/types/city.types'
import type { GrowthPressureZone, InfrastructureCategory, InfrastructureItem, UnderservedZone } from '@/types/city.types'

// Service coverage radii in metres per zone token
const SERVICE_RADII: Record<string, number> = {
  '--zone-health':      2000,
  '--zone-education':    800,
  '--zone-transit':      600,
  '--zone-government':  1200,
  '--zone-disaster':    1500,
  '--zone-utility':      800,
  '--zone-smart':        400,
  '--zone-commercial':   500,
  '--zone-industrial':   300,
  '--zone-waste':        600,
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

function DistrictFlyController({ center }: { center: [number, number] | null }) {
  const map = useMap()
  useEffect(() => {
    if (!center) return
    map.flyTo(center, 13, { duration: 1.1 })
  }, [center, map])
  return null
}

function CleanPlanningGridLayer() {
  const map = useMap()
  useEffect(() => {
    const GridLayer = (L.GridLayer as any).extend({
      createTile(coords: { x: number; y: number; z: number }, done?: (error: Error | null, tile: HTMLCanvasElement) => void) {
        const tile = document.createElement('canvas')
        const size = 256
        tile.width = size
        tile.height = size
        const ctx = tile.getContext('2d')
        if (!ctx) {
          done?.(null, tile)
          return tile
        }

        ctx.fillStyle = 'rgba(224,229,236,0.18)'
        ctx.fillRect(0, 0, size, size)

        const major = 64
        const minor = 16
        ctx.lineWidth = 1
        for (let x = 0; x <= size; x += minor) {
          const isMajor = x % major === 0
          ctx.strokeStyle = isMajor ? 'rgba(99,110,114,0.11)' : 'rgba(186,190,204,0.1)'
          ctx.beginPath()
          ctx.moveTo(x + 0.5, 0)
          ctx.lineTo(x + 0.5, size)
          ctx.stroke()
        }
        for (let y = 0; y <= size; y += minor) {
          const isMajor = y % major === 0
          ctx.strokeStyle = isMajor ? 'rgba(99,110,114,0.11)' : 'rgba(186,190,204,0.1)'
          ctx.beginPath()
          ctx.moveTo(0, y + 0.5)
          ctx.lineTo(size, y + 0.5)
          ctx.stroke()
        }

        done?.(null, tile)
        return tile
      },
    })

    const layer = new GridLayer({ tileSize: 256, zIndex: 1, opacity: 1 })
    layer.addTo(map)
    return () => {
      layer.removeFrom(map)
    }
  }, [map])
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
              L.DomEvent.stopPropagation(e)
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

const LAYER_GROUPS = [
  { title: 'Existing real world infrastructure', items: ['Existing hospitals', 'Existing schools', 'Existing parks', 'Existing transit', 'Existing police stations', 'Existing fire stations'] },
  { title: 'Proposed future scenario infrastructure', items: ['Proposed infrastructure'] },
  { title: 'AI recommended infrastructure', items: ['AI Recommendations'] },
  { title: 'Scenario overlays', items: ['Underserved zones', 'Growth Pressure', 'Coverage Rings'] },
]

const CATEGORY_LAYER: Partial<Record<InfrastructureCategory, string>> = {
  hospital: 'Existing hospitals',
  clinic: 'Existing hospitals',
  school: 'Existing schools',
  park: 'Existing parks',
  transit_stop: 'Existing transit',
  transit_line: 'Existing transit',
  police_station: 'Existing police stations',
  fire_station: 'Existing fire stations',
}

const CATEGORY_COLOR: Record<InfrastructureCategory, string> = {
  hospital: '#E74C3C',
  clinic: '#E74C3C',
  school: '#2E86C1',
  park: '#27AE60',
  transit_stop: '#8E44AD',
  transit_line: '#8E44AD',
  fire_station: '#E74C3C',
  police_station: '#5D4E75',
  housing_zone: '#E67E22',
  commercial_zone: '#1A6FA3',
  industrial_zone: '#64748B',
  road: '#64748B',
  bike_lane: '#64748B',
  utility: '#6C5CE7',
  water: '#ff4757',
  power: '#F59E0B',
  mixed_use: '#E67E22',
  community_center: '#0097A7',
}

const CATEGORY_ICON: Record<InfrastructureCategory, string> = {
  hospital: '&#10010;',
  clinic: '&#10010;',
  school: 'S',
  park: 'P',
  transit_stop: 'T',
  transit_line: 'R',
  fire_station: '&#9650;',
  police_station: '&#9670;',
  housing_zone: '&#8962;',
  commercial_zone: '&#9632;',
  industrial_zone: '&#9635;',
  road: '',
  bike_lane: '',
  utility: '&#9889;',
  water: '&#9679;',
  power: '&#9889;',
  mixed_use: '&#8962;',
  community_center: 'C',
}

const TOOL_ZONE_TO_CATEGORY: Record<string, InfrastructureCategory> = {
  HEALTH_HOSPITAL: 'hospital',
  HEALTH_CLINIC: 'clinic',
  EDU_ELEMENTARY: 'school',
  EDU_HIGH: 'school',
  PARK_SMALL: 'park',
  BUS_STATION: 'transit_stop',
  TRAIN_STATION: 'transit_stop',
  DIS_FIRE_STATION: 'fire_station',
  GOV_POLICE_STATION: 'police_station',
  RES_MED_APARTMENT: 'housing_zone',
  RES_MIXED_USE: 'mixed_use',
  RES_AFFORDABLE: 'housing_zone',
  COM_OFFICE_PLAZA: 'commercial_zone',
  COM_SMALL_SHOP: 'commercial_zone',
  IND_WAREHOUSE: 'industrial_zone',
  ENV_TREE_CORRIDOR: 'park',
  POWER_SUBSTATION: 'utility',
}

function LayerControlPanel({ activeLayers, toggleLayer }: { activeLayers: Set<string>; toggleLayer: (layerId: string) => void }) {
  return (
    <div style={{ position: 'absolute', top: 164, right: 16, zIndex: 18, width: 252, background: 'var(--color-bg-sidebar)', border: '1px solid var(--color-border-subtle)', borderRadius: 8, boxShadow: '0 8px 28px rgba(0,0,0,0.45)', overflow: 'hidden' }}>
      <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--color-border-subtle)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Layers size={13} style={{ color: 'var(--color-accent-cyan)' }} />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-text-secondary)' }}>Planning Layers</span>
      </div>
      <div style={{ padding: 10, display: 'grid', gap: 10 }}>
        {LAYER_GROUPS.map((group) => (
          <div key={group.title}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 5 }}>{group.title}</div>
            <div style={{ display: 'grid', gap: 4 }}>
              {group.items.map((item) => (
                <label key={item} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 10, color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
                  <input type="checkbox" checked={activeLayers.has(item)} onChange={() => toggleLayer(item)} style={{ accentColor: 'var(--color-accent-cyan)' }} />
                  {item}
                </label>
              ))}
            </div>
          </div>
        ))}
        <div style={{ borderTop: '1px solid var(--color-border-subtle)', paddingTop: 8, display: 'grid', gap: 5 }}>
          <div style={{ fontSize: 9, color: 'var(--color-text-muted)', lineHeight: 1.45 }}>Data sources: clean planning grid, simulated growth model, UrbanMind scoring engine</div>
          <div style={{ fontSize: 9, color: 'var(--color-text-muted)', lineHeight: 1.45 }}>UrbanMind is a decision support simulator, not a final planning authority.</div>
        </div>
      </div>
    </div>
  )
}

function PlanningLegend() {
  const items: Array<[InfrastructureCategory, React.ReactNode, string]> = [
    ['clinic', <Cross size={10} />, 'Hospital / clinic'],
    ['school', <GraduationCap size={10} />, 'School'],
    ['park', <TreePine size={10} />, 'Park'],
    ['transit_stop', <Bus size={10} />, 'Transit'],
    ['police_station', <Shield size={10} />, 'Police'],
    ['fire_station', <Flame size={10} />, 'Fire'],
    ['housing_zone', <Home size={10} />, 'Housing'],
    ['commercial_zone', <Building2 size={10} />, 'Commercial'],
    ['industrial_zone', <Building2 size={10} />, 'Industrial'],
    ['utility', <Zap size={10} />, 'Utility'],
  ]
  return (
    <div style={{ position: 'absolute', bottom: 16, right: 16, zIndex: 12, background: 'var(--color-bg-sidebar)', border: '1px solid var(--color-border-subtle)', borderRadius: 8, padding: 10, width: 180 }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 7 }}>Infrastructure Legend</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
        {items.map(([category, icon, label]) => (
          <div key={category} style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--color-text-secondary)', fontSize: 9 }}>
            <span style={{ width: 16, height: 16, borderRadius: 5, display: 'grid', placeItems: 'center', color: CATEGORY_COLOR[category], border: `1px solid ${CATEGORY_COLOR[category]}80` }}>{icon}</span>
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
          </div>
        ))}
      </div>
      <div style={{ borderTop: '1px solid var(--color-border-subtle)', marginTop: 8, paddingTop: 7, display: 'grid', gap: 4 }}>
        {[
          ['Existing', '#636e72'],
          ['Proposed', '#00D4FF'],
          ['AI Recommended', '#00D4FF'],
          ['Underserved Zone', '#FF5A3D'],
        ].map(([label, color]) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 9, color: 'var(--color-text-muted)' }}>
            <span style={{ width: 12, height: 12, borderRadius: 4, border: `1px solid ${color}`, background: label === 'Underserved Zone' ? 'rgba(255,90,61,0.12)' : `${color}22` }} />
            {label}
          </div>
        ))}
      </div>
    </div>
  )
}

function infraIcon(item: InfrastructureItem) {
  const isProposed = item.status === 'proposed'
  const isAi = item.status === 'ai_recommended'
  const color = isAi ? '#00D4FF' : CATEGORY_COLOR[item.category]
  const border = isProposed ? `2px solid ${color}` : `1px solid ${color}`
  const shadow = isAi
    ? '0 0 0 4px rgba(0,212,255,0.16),0 0 22px rgba(0,212,255,0.52)'
    : '4px 4px 8px #babecc,-4px -4px 8px #ffffff'
  return L.divIcon({
    className: 'urbanmind-infra-icon',
    html: `<div style="width:32px;height:32px;border-radius:10px;background:#f4f7fb;border:${border};box-shadow:${shadow};display:grid;place-items:center;color:${color};font:800 15px Inter,system-ui;">${isAi ? '&#9678;' : CATEGORY_ICON[item.category]}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  })
}

function suggestionIcon(rank: number) {
  return L.divIcon({
    className: 'urbanmind-suggestion-icon',
    html: `<div style="width:34px;height:34px;border-radius:50%;background:#e0e5ec;border:2px solid #ff4757;box-shadow:4px 4px 8px #babecc,-4px -4px 8px #ffffff;display:grid;place-items:center;color:#ff4757;font:800 13px Inter,system-ui;">${rank}</div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  })
}

function coverageRadiusForCategory(category: InfrastructureCategory) {
  const radii: Partial<Record<InfrastructureCategory, number>> = {
    hospital: 2600,
    clinic: 1800,
    school: 1100,
    park: 900,
  transit_stop: 650,
  housing_zone: 850,
  fire_station: 1900,
  police_station: 1700,
  community_center: 900,
  }
  return radii[category] ?? null
}

function isValidCityPlacement(city: { bbox: number[] }, lat: number, lng: number) {
  const [west, south, east, north] = city.bbox
  return lng >= west && lng <= east && lat >= south && lat <= north
}

const WATER_EXCLUSION_BOXES: Record<string, Array<[number, number, number, number]>> = {
  fremon: [
    [37.4500, 37.6200, -122.0900, -122.0380],
    [37.4500, 37.6200, -121.9150, -121.8600],
    [37.5850, 37.6200, -122.0380, -121.9150],
  ],
  fremont: [
    [37.4500, 37.6200, -122.0900, -122.0380],
    [37.4500, 37.6200, -121.9150, -121.8600],
    [37.5850, 37.6200, -122.0380, -121.9150],
  ],
  new_york: [
    [40.7000, 40.9000, -74.0350, -74.0120],
    [40.6900, 40.7950, -73.9940, -73.9340],
    [40.5600, 40.7000, -74.0700, -73.9600],
    [40.5900, 40.6700, -73.9000, -73.7450],
  ],
  singapore: [
    [1.2300, 1.3000, 103.6100, 103.7400],
    [1.2200, 1.3000, 103.8400, 104.0850],
  ],
  mumbai: [
    [18.8900, 19.0600, 72.7800, 72.8150],
    [19.0000, 19.2300, 72.9300, 72.9900],
  ],
  dubai: [
    [24.9200, 25.1700, 55.0200, 55.1100],
  ],
  lagos: [
    [6.3900, 6.4700, 3.3900, 3.4700],
  ],
}

function isInvalidPlacementZone(city: { id: string; landmarks?: Landmark[] }, lat: number, lng: number) {
  const inWaterBox = (WATER_EXCLUSION_BOXES[city.id] ?? []).some(([minLat, maxLat, minLng, maxLng]) =>
    lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng
  )
  if (inWaterBox) return true

  return (city.landmarks ?? []).some((landmark) => {
    const isWater = landmark.zone_type_id.includes('WATER') || landmark.category.toLowerCase().includes('water')
    if (!isWater) return false
    const halfLat = (landmark.h_deg ?? 0.01) / 2
    const halfLng = (landmark.w_deg ?? 0.01) / 2
    return lat >= landmark.lat - halfLat && lat <= landmark.lat + halfLat && lng >= landmark.lng - halfLng && lng <= landmark.lng + halfLng
  })
}

function placementFit(category: InfrastructureCategory, lat: number, lng: number, zones: UnderservedZone[]) {
  const relevantGap: Partial<Record<InfrastructureCategory, string[]>> = {
    clinic: ['hospital_access', 'emergency_access'],
    hospital: ['hospital_access', 'emergency_access'],
    school: ['school_access'],
    park: ['park_access', 'green_space'],
    transit_stop: ['transit_access'],
    transit_line: ['transit_access'],
    housing_zone: ['housing_access'],
    mixed_use: ['housing_access', 'transit_access'],
    community_center: ['equity', 'housing_access'],
  }
  const gapTypes = relevantGap[category] ?? []
  const candidates = zones
    .filter((zone) => !zone.isImproved && gapTypes.includes(zone.gapType))
    .map((zone) => {
      const distanceMeters = approxMeters(lat, lng, zone.center[0], zone.center[1])
      return { zone, distanceMeters }
    })
    .sort((a, b) => a.distanceMeters - b.distanceMeters)
  const best = candidates[0]
  if (!zones.length || !gapTypes.length) return { status: 'good' as const, zone: null, message: 'Placement is inside the selected city planning area.' }
  if (!best) return { status: 'warning' as const, zone: zones[0] ?? null, message: `This ${category.replace(/_/g, ' ')} does not match an active gap type. It can be placed, but it may not improve the analysis much.` }
  const targetRadius = Math.max(650, best.zone.radiusMeters * 1.05)
  if (best.distanceMeters <= targetRadius) return { status: 'good' as const, zone: best.zone, message: `This ${category.replace(/_/g, ' ')} fills ${best.zone.name} and is within the target service radius.` }
  return { status: 'warning' as const, zone: best.zone, message: `This ${category.replace(/_/g, ' ')} is ${Math.round(best.distanceMeters).toLocaleString()}m from ${best.zone.name}. Move it closer for stronger impact.` }
}

function approxMeters(latA: number, lngA: number, latB: number, lngB: number) {
  const latMeters = (latA - latB) * 111_000
  const lngMeters = (lngA - lngB) * 111_000 * Math.cos((latA * Math.PI) / 180)
  return Math.hypot(latMeters, lngMeters)
}

function describePlacement(category: InfrastructureCategory, lat: number, lng: number, zones: UnderservedZone[]) {
  const relevantGap: Partial<Record<InfrastructureCategory, string[]>> = {
    clinic: ['hospital_access', 'emergency_access'],
    hospital: ['hospital_access', 'emergency_access'],
    school: ['school_access'],
    park: ['park_access', 'green_space'],
    transit_stop: ['transit_access'],
    transit_line: ['transit_access'],
    housing_zone: ['housing_access'],
    mixed_use: ['housing_access', 'transit_access'],
  }
  const gapTypes = relevantGap[category] ?? []
  const ranked = zones
    .filter((zone) => gapTypes.includes(zone.gapType))
    .map((zone) => ({
      zone,
      distance: Math.hypot(lat - zone.center[0], lng - zone.center[1]),
    }))
    .sort((a, b) => a.distance - b.distance)
  const nearest = ranked[0]?.zone ?? zones[0]
  const locationName = nearest?.name ?? 'selected district'
  const impactScore = category === 'clinic' || category === 'hospital' ? 78
    : category === 'school' ? 76
    : category === 'park' ? 70
    : category === 'transit_stop' || category === 'transit_line' ? 73
    : 62
  const reason = nearest
    ? `Placed near ${locationName} because this district shows ${nearest.gapType.replace(/_/g, ' ')} pressure under the selected growth scenario.`
    : `Placed inside the selected city planning area to improve ${category.replace(/_/g, ' ')} access.`
  return { locationName, impactScore, reason }
}

function isLayerVisible(item: InfrastructureItem, activeLayers: Set<string>, showAIRecommendations: boolean) {
  if (item.category === 'road') return false
  if (item.status === 'proposed') return activeLayers.has('Proposed infrastructure')
  if (item.status === 'ai_recommended') return showAIRecommendations && activeLayers.has('AI Recommendations')
  const layer = CATEGORY_LAYER[item.category]
  return layer ? activeLayers.has(layer) : true
}

interface DisplayPoint {
  id: string
  lat: number
  lng: number
}

function spreadDisplayPositions(points: DisplayPoint[], city?: { bbox: number[] } | null) {
  const positions = new Map<string, [number, number]>()
  const used = new Set<string>()
  const [west, south, east, north] = city?.bbox ?? [0, 0, 0, 0]
  const citySpan = city?.bbox ? Math.max(Math.abs(east - west), Math.abs(north - south)) : 0.18
  const clusterThreshold = Math.min(0.035, Math.max(0.014, citySpan * 0.1))
  const offsetStep = Math.min(0.022, Math.max(0.009, clusterThreshold * 0.72))

  points.forEach((item) => {
    if (used.has(item.id)) return
    const cluster = points.filter((other) => {
      if (used.has(other.id)) return false
      return Math.hypot(item.lat - other.lat, item.lng - other.lng) < clusterThreshold
    })

    if (cluster.length <= 1) {
      positions.set(item.id, [item.lat, item.lng])
      used.add(item.id)
      return
    }

    const center = cluster.reduce(
      (acc, clusterItem) => ({ lat: acc.lat + clusterItem.lat, lng: acc.lng + clusterItem.lng }),
      { lat: 0, lng: 0 },
    )
    center.lat /= cluster.length
    center.lng /= cluster.length

    cluster.forEach((clusterItem, index) => {
      const angle = (Math.PI * 2 * index) / cluster.length
      const ring = offsetStep * (1 + Math.floor(index / 8) * 0.55)
      let displayLat = center.lat + Math.sin(angle) * ring
      let displayLng = center.lng + Math.cos(angle) * ring
      if (city?.bbox) {
        displayLng = Math.max(west + 0.006, Math.min(east - 0.006, displayLng))
        displayLat = Math.max(south + 0.006, Math.min(north - 0.006, displayLat))
      }
      positions.set(clusterItem.id, [displayLat, displayLng])
      used.add(clusterItem.id)
    })
  })

  return positions
}

function spreadMarkerDisplayPositions(items: InfrastructureItem[], city?: { bbox: number[] } | null) {
  const positions = new Map<string, [number, number]>()
  items
    .filter((item) => item.geometryType === 'Point')
    .forEach((item) => {
      const [lng, lat] = item.coordinates as GeoJSON.Position
      positions.set(item.id, [lat, lng])
    })
  return positions
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
        animate={{ opacity: [0.4, 0.8, 0.4] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          letterSpacing: '0.25em',
          textTransform: 'uppercase',
          color: 'var(--color-text-muted)',
          textAlign: 'center',
          background: 'var(--color-bg-panel)',
          padding: '8px 18px',
          borderRadius: 8,
          boxShadow: 'var(--shadow-sm)',
          border: '1px solid var(--color-border-subtle)',
        }}
      >
        Select a city to begin
      </motion.div>
    </motion.div>
  )
}

// ─── Dot count badge ─────────────────────────────────────────────────────────
// ─── Main component ──────────────────────────────────────────────────────────
export function MapContainer() {
  const [hovered, setHovered] = useState<{ x: number; y: number; properties: any } | null>(null)
  const [serviceArea, setServiceArea] = useState<ServiceArea | null>(null)
  const [mapLoading, setMapLoading] = useState(false)
  const [mapError, setMapError] = useState(false)
  const [layersPanelOpen, setLayersPanelOpen] = useState(false)

  const city = useCityStore((s) => s.selectedCity)
  const frame = useSimulationStore((s) => s.currentFrame)
  const activeLayers = useUIStore((s) => s.activeLayers)
  const toggleLayer = useUIStore((s) => s.toggleLayer)
  const isSplitScreen = useUIStore((s) => s.isSplitScreen)
  const detailedGrid = useUIStore((s) => s.detailedGrid)
  const isRunning = useSimulationStore((s) => s.isRunning)
  const isPaused = useSimulationStore((s) => s.isPaused)
  const openDrawer = useUIStore((s) => s.openDrawer)
  const updateDrawer = useUIStore((s) => s.updateDrawer)
  const highlightedZoneToken = useUIStore((s) => s.highlightedZoneToken)
  const isOverrideModeActive = useUIStore((s) => s.isOverrideModeActive)
  const selectedOverrideZone = useUIStore((s) => s.selectedOverrideZone)
  const is3DMode = useUIStore((s) => s.is3DMode)
  const userZones = useSimulationStore((s) => s.userZones)
  const addUserZone = useSimulationStore((s) => s.addUserZone)
  const planning = useSimulationStore((s) => s.planning)
  const addInfrastructure = useSimulationStore((s) => s.addInfrastructure)
  const selectInfrastructure = useSimulationStore((s) => s.selectInfrastructure)
  const applyRecommendedPlan = useSimulationStore((s) => s.applyRecommendedPlan)
  const scenario = useScenarioStore((s) => s.activeScenario)
  const fetchExplanation = useAIStore((s) => s.fetchExplanation)
  const notify = useNotification((s) => s.notify)

  const handlePlaceZone = useCallback(
    (lat: number, lng: number) => {
      if (!selectedOverrideZone) return
      if (!city || !isValidCityPlacement(city, lat, lng) || isInvalidPlacementZone(city, lat, lng)) {
        useSimulationStore.setState((state) => ({
          planning: {
            ...state.planning,
            placementFeedback: {
              type: 'invalid',
              title: 'Invalid Placement',
              message: 'This location is outside the planning area or too close to water.',
            },
          },
        }))
        notify('warning', 'This location is outside the planning area.', 2800)
        return
      }
      const category = TOOL_ZONE_TO_CATEGORY[selectedOverrideZone] ?? 'housing_zone'
      const [west, south, east, north] = city.bbox
      const citySpan = Math.max(Math.abs(east - west), Math.abs(north - south))
      const duplicateThreshold = Math.min(0.012, Math.max(0.006, citySpan * 0.018))
      const duplicate = planning.infrastructure.some((item) => {
        if (item.geometryType !== 'Point' || item.category !== category) return false
        const [otherLng, otherLat] = item.coordinates as GeoJSON.Position
        return Math.hypot(lat - otherLat, lng - otherLng) < duplicateThreshold
      })
      if (duplicate) {
        useSimulationStore.setState((state) => ({
          planning: {
            ...state.planning,
            placementFeedback: {
              type: 'invalid',
              title: 'Invalid Placement',
              message: 'This location is outside the planning area or too close to water.',
            },
          },
        }))
        notify('warning', 'Move farther from duplicate infrastructure.', 2800)
        return
      }
      const fit = placementFit(category, lat, lng, planning.underservedZones)
      const zone: UserPlacedZone = {
        id: `user-${Date.now()}`,
        lat,
        lng,
        zone_type_id: selectedOverrideZone,
      }
      addUserZone(zone)
      const label = selectedOverrideZone.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
      const infrastructureId = `user-${Date.now()}`
      const placement = describePlacement(category, lat, lng, planning.underservedZones)
      addInfrastructure({
        id: infrastructureId,
        name: `Proposed ${label}`,
        category,
        status: 'proposed',
        source: 'user_added',
        coordinates: [lng, lat],
        geometryType: 'Point',
        geometry: { type: 'Point', coordinates: [lng, lat] },
        reason: placement.reason,
        costEstimate: category === 'hospital' ? 120_000_000 : category === 'school' ? 36_000_000 : category === 'park' ? 8_000_000 : 12_000_000,
        impactScore: placement.impactScore,
        confidence: 0.72,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      useSimulationStore.setState((state) => ({
        planning: {
          ...state.planning,
          placementFeedback: {
            type: fit.status === 'good' ? 'good' : 'warning',
            title: fit.status === 'good' ? 'Good Placement' : 'Placement Warning',
            message: fit.message,
          },
        },
      }))
      notify(fit.status === 'good' ? 'success' : 'warning', `Proposed ${label} added near ${placement.locationName}.`, 2800)
    },
    [selectedOverrideZone, city, planning.infrastructure, planning.underservedZones, addUserZone, addInfrastructure, notify]
  )

  const placeSuggestedInfrastructure = useCallback((suggestionId: string) => {
    const suggestion = planning.placementSuggestions.find((item) => item.id === suggestionId)
    if (!suggestion) return
    const [lng, lat] = suggestion.coordinates
    addInfrastructure({
      id: `user-${suggestion.id}-${Date.now()}`,
      name: `Proposed ${suggestion.category.replace(/_/g, ' ')} at ${suggestion.title}`,
      category: suggestion.category,
      status: 'proposed',
      source: 'user_added',
      coordinates: [lng, lat],
      geometryType: 'Point',
      geometry: { type: 'Point', coordinates: [lng, lat] },
      reason: suggestion.reason,
      costEstimate: suggestion.costEstimate,
      impactScore: 82,
      confidence: suggestion.confidence,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    notify('success', `Placed suggested ${suggestion.category.replace(/_/g, ' ')}. UrbanMind scored this as a high-confidence location.`, 2800)
  }, [addInfrastructure, notify, planning.placementSuggestions])

  const handleHover = useCallback(
    (dot: DotFeature | null, x: number, y: number) => {
      setHovered(dot ? { x, y, properties: dot.properties } : null)
    },
    []
  )

  const handleClick = useCallback(
    (dot: DotFeature) => {
      const props = dot.properties ?? {}
      const zone = props.zone_type_id ?? 'RES_LOW_DETACHED'
      const displayName = props.zone_display_name ?? props.building_name ?? zone
      const placementReason = props.placement_reason ?? null
      const spsScore: number | undefined = props.sps_score

      // Show service coverage circle
      const radius = getServiceRadius(zone)
      if (radius) {
        setServiceArea((prev) =>
          prev && Math.abs(prev.lat - dot.lat) < 0.00001
            ? null
            : { lat: dot.lat, lng: dot.lng, radius, color: getZoneColor(zone) }
        )
      } else {
        setServiceArea(null)
      }

      // Open drawer immediately with placeholder, then fill in AI text
      openDrawer({
        zone_type_id: zone,
        zone_display_name: displayName,
        x: props.x ?? 0,
        y: props.y ?? 0,
        year: frame?.year ?? 0,
        explanation_text: '…',
        metrics_delta: frame?.metrics_snapshot ?? {},
        surrounding_context: placementReason ?? 'Nearby zones, transit distance, terrain class, and scenario objective.',
        placement_reason: placementReason ?? undefined,
        sps_score: spsScore,
      })

      fetchExplanation({
        type: 'zone_explanation',
        zone_type_id: zone,
        zone_display_name: displayName,
        city_name: city?.name ?? 'the city',
        surrounding_context: placementReason ?? 'Nearby service coverage, transit access, terrain conditions, and forecast growth pressure.',
        metrics_delta: frame?.metrics_snapshot ?? {},
        scenario_goal: scenario,
      }).then((text) => updateDrawer({ explanation_text: text }))
    },
    [city, frame, scenario, fetchExplanation, openDrawer, updateDrawer]
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

  const showDots = false
  const dotDisplayPositions = useMemo(
    () => spreadDisplayPositions(dots.map((dot) => ({ id: dot.id, lat: dot.lat, lng: dot.lng })), city),
    [city, dots]
  )
  const displayDots = useMemo(
    () => dots.map((dot) => {
      const position = dotDisplayPositions.get(dot.id)
      return position ? { ...dot, lat: position[0], lng: position[1] } : dot
    }),
    [dotDisplayPositions, dots]
  )
  const showPlanning = Boolean(city)
  const visibleInfrastructure = useMemo(() => {
    if (!showPlanning) return []
    const aiPreview = planning.hasAnalyzed && !planning.hasAppliedAIPlan ? planning.aiRecommendations : []
    return [...planning.infrastructure, ...aiPreview].filter((item) =>
      item.geometryType === 'Point' && isLayerVisible(item, activeLayers, planning.hasAnalyzed)
    )
  }, [activeLayers, planning.aiRecommendations, planning.hasAnalyzed, planning.hasAppliedAIPlan, planning.infrastructure, showPlanning])

  const displayPositions = useMemo(
    () => spreadMarkerDisplayPositions(visibleInfrastructure, city),
    [city, visibleInfrastructure]
  )

  const getDisplayPosition = useCallback((item: InfrastructureItem): [number, number] => {
    const [lng, lat] = item.coordinates as GeoJSON.Position
    return displayPositions.get(item.id) ?? [lat, lng]
  }, [displayPositions])

  const selectedDistrictCenter = useMemo(() => {
    const district = planning.districtProfiles.find((item) => item.id === planning.selectedDistrictId)
    return district?.center ?? null
  }, [planning.districtProfiles, planning.selectedDistrictId])

  const activeSuggestionCategory = selectedOverrideZone ? TOOL_ZONE_TO_CATEGORY[selectedOverrideZone] : null
  const visibleSuggestions = useMemo(() => {
    if (!isOverrideModeActive || !activeSuggestionCategory || !planning.hasAnalyzed) return []
    if (!['clinic', 'school'].includes(activeSuggestionCategory)) return []
    return planning.placementSuggestions.filter((suggestion) => suggestion.category === activeSuggestionCategory).slice(0, 3)
  }, [activeSuggestionCategory, isOverrideModeActive, planning.hasAnalyzed, planning.placementSuggestions])

  const suggestionDisplayPositions = useMemo(
    () => spreadDisplayPositions(
      visibleSuggestions.map((suggestion) => ({
        id: suggestion.id,
        lat: suggestion.coordinates[1],
        lng: suggestion.coordinates[0],
      })),
      city,
    ),
    [city, visibleSuggestions],
  )

  const coverageInfrastructure = useMemo(
    () => activeLayers.has('Coverage Rings')
      ? visibleInfrastructure.filter((item) => item.geometryType === 'Point' && coverageRadiusForCategory(item.category))
      : [],
    [activeLayers, visibleInfrastructure]
  )

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
        height: 'calc(100% - 8px)',
        margin: 4,
        overflow: 'hidden',
        background: 'var(--color-bg-app)',
        borderRadius: 10,
        border: '1px solid rgba(186,190,204,0.72)',
        boxShadow: 'inset 1px 1px 0 rgba(255,255,255,0.8), 8px 8px 18px rgba(186,190,204,0.75), -8px -8px 18px rgba(255,255,255,0.72)',
      }}
    >
      <div style={{ position: 'absolute', top: 14, left: 16, zIndex: 16, pointerEvents: 'none' }}>
        <div className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--color-text-secondary)' }}>Live Planning Canvas</div>
        <div className="mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>Service gaps, growth pressure, and proposed infrastructure</div>
      </div>
      {/* Layers toggle */}
      {showPlanning && (
        <motion.button
          onClick={() => setLayersPanelOpen((v) => !v)}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.94 }}
          title="Toggle planning layers"
          style={{
          position: 'absolute',
          top: 72,
          right: 16,
            zIndex: 20,
            width: 38,
            height: 38,
            borderRadius: 8,
            border: layersPanelOpen
              ? '1px solid var(--color-border-active)'
              : '1px solid var(--color-border-subtle)',
            background: 'var(--color-bg-panel)',
            color: layersPanelOpen ? 'var(--color-accent-cyan)' : 'var(--color-text-muted)',
            display: 'grid',
            placeItems: 'center',
            cursor: 'pointer',
            transition: 'all 200ms ease',
            boxShadow: layersPanelOpen ? 'var(--shadow-pressed)' : 'var(--shadow-sm)',
          }}
        >
          <Layers size={16} />
        </motion.button>
      )}
      {isSplitScreen ? (
        <SplitScreenView />
      ) : is3DMode ? (
        <Map3DView />
      ) : (
        // Absolute wrapper ensures the map fills the entire <main>
        // isolation: isolate prevents Leaflet's high z-index panes from leaking outside
        <div style={{ position: 'absolute', inset: 0, isolation: 'isolate', borderRadius: 10, overflow: 'hidden' }}>
          <LeafletMap
            key={city?.id ?? 'default'}          // remount when city changes
            center={initialCenter}
            zoom={initialZoom}
            style={{ width: '100%', height: '100%' }}
            zoomControl={false}
            attributionControl={false}
            maxBounds={maxBounds}
            maxBoundsViscosity={0.85}
            minZoom={9}
            preferCanvas
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"
              attribution=""
              maxZoom={20}
              subdomains="abcd"
              opacity={0.74}
              className="urbanmind-soft-basemap"
              eventHandlers={{
                load: () => setMapLoading(false),
                tileerror: () => { setMapLoading(false); setMapError(true) },
                loading: () => setMapLoading(true),
              }}
            />
            <CleanPlanningGridLayer />
            {city && <CityFlyController city={city} />}
            <DistrictFlyController center={selectedDistrictCenter} />
            <MapClickHandler
              active={isOverrideModeActive}
              zoneTypeId={selectedOverrideZone}
              onPlace={handlePlaceZone}
            />
            {showDots && (
              <DotLayer
                dots={displayDots}
                onHover={handleHover}
                onClick={handleClick}
                highlightedToken={highlightedZoneToken}
              />
            )}
            {showPlanning && activeLayers.has('Underserved zones') && planning.hasAnalyzed && planning.underservedZones.map((zone: UnderservedZone) => (
              <Circle
                key={zone.id}
                center={zone.center}
                radius={zone.isImproved ? zone.radiusMeters * 0.55 : zone.radiusMeters}
                pathOptions={{
                  color: zone.isImproved ? 'var(--color-accent-green)' : '#FF5A3D',
                  fillColor: zone.isImproved ? 'var(--color-accent-green)' : '#FF5A3D',
                  fillOpacity: zone.isImproved ? 0.08 : 0.18 + zone.severity * 0.12,
                  weight: zone.isImproved ? 1 : 2,
                  opacity: zone.isImproved ? 0.45 : 0.8,
                  dashArray: zone.isImproved ? '5 5' : undefined,
                }}
              >
                <Popup>
                  <strong>{zone.name}</strong><br />
                  Gap type: {zone.gapType.replace(/_/g, ' ')}<br />
                  Severity: {Math.round(zone.severity * 100)}%<br />
                  Before score: {zone.beforeScore}<br />
                  {zone.isImproved || zone.improved ? `After score: ${zone.afterScore ?? zone.beforeScore}` : zone.reason}<br />
                  {zone.isImproved || zone.improved ? 'Improved by proposed infrastructure in the AI plan.' : null}
                </Popup>
              </Circle>
            ))}
            {showPlanning && planning.equityLens && planning.districtProfiles.map((district) => (
              <CircleMarker
                key={`equity-${district.id}`}
                center={district.center}
                radius={Math.max(8, district.severity * 14)}
                pathOptions={{
                  color: district.severity > 0.8 ? '#FF5A3D' : '#6C5CE7',
                  fillColor: district.severity > 0.8 ? '#FF5A3D' : '#6C5CE7',
                  fillOpacity: 0.2,
                  weight: 1,
                  opacity: 0.8,
                }}
              >
                <Popup>
                  <strong>{district.name}</strong><br />
                  Population served/affected: {district.populationAffected.toLocaleString()}<br />
                  Recommended fix: {district.recommendedFix}<br />
                  Score: {district.beforeScore} → {district.afterScore}
                </Popup>
              </CircleMarker>
            ))}
            {showPlanning && activeLayers.has('Growth Pressure') && planning.hasAnalyzed && planning.growthPressureZones.map((zone: GrowthPressureZone) => (
              <Circle
                key={zone.id}
                center={zone.center}
                radius={zone.radiusMeters}
                pathOptions={{
                  color: zone.pressure === 'high' ? '#6C5CE7' : '#ff4757',
                  fillColor: zone.pressure === 'high' ? '#6C5CE7' : '#ff4757',
                  fillOpacity: 0.1,
                  weight: 1.2,
                  opacity: 0.55,
                  dashArray: '7 5',
                }}
              >
                <Popup>
                  <strong>{zone.name}</strong><br />
                  Growth pressure: {zone.pressure}<br />
                  Projected growth: {zone.projectedGrowthPercent}%<br />
                  {zone.reason}
                </Popup>
              </Circle>
            ))}
            {showPlanning && planning.hasAnalyzed && coverageInfrastructure.map((item) => {
              const [lat, lng] = getDisplayPosition(item)
              const radius = coverageRadiusForCategory(item.category)
              if (!radius) return null
              return (
                <Circle
                  key={`coverage-${item.id}`}
                  center={[lat, lng]}
                  radius={item.status === 'proposed' ? radius * 1.08 : radius}
                  pathOptions={{
                    color: CATEGORY_COLOR[item.category],
                    fillColor: CATEGORY_COLOR[item.category],
                    fillOpacity: item.status === 'proposed' ? 0.075 : 0.035,
                    weight: item.status === 'proposed' ? 1.8 : 1,
                    opacity: item.status === 'proposed' ? 0.58 : 0.28,
                    dashArray: item.status === 'proposed' ? '7 5' : '4 6',
                  }}
                />
              )
            })}
            {visibleInfrastructure.map((item) => {
              const [lat, lng] = getDisplayPosition(item)
              return (
                <Marker
                  key={item.id}
                  position={[lat, lng]}
                  icon={infraIcon(item)}
                  eventHandlers={{ click: () => selectInfrastructure(item.id) }}
                >
                  <Popup>
                    <strong>{item.name}</strong><br />
                    Category: {item.category.replace(/_/g, ' ')}<br />
                    Status: {item.status.replace(/_/g, ' ')}<br />
                    Source: {item.source.replace(/_/g, ' ')}<br />
                    {item.reason}<br />
                    {item.costEstimate ? `Cost estimate: $${(item.costEstimate / 1_000_000).toFixed(1)}M` : 'Nearest gap relevance: supports baseline coverage.'}<br />
                    Impact score: {item.impactScore}<br />
                    Confidence: {Math.round(item.confidence * 100)}%
                    {item.status === 'ai_recommended' && !planning.hasAppliedAIPlan && (
                      <button
                        onClick={() => planning.cityId === 'fremon' ? applyRecommendedPlan() : useSimulationStore.getState().applyAIPlan(scenario)}
                        style={{ display: 'block', marginTop: 8, border: '1px solid var(--color-border-active)', borderRadius: 6, padding: '5px 8px', color: 'var(--color-accent-cyan)', background: 'var(--color-bg-hover)' }}
                      >
                        Apply Recommendation
                      </button>
                    )}
                  </Popup>
                </Marker>
              )
            })}
            {visibleSuggestions.map((suggestion) => {
              const [lat, lng] = suggestionDisplayPositions.get(suggestion.id) ?? [suggestion.coordinates[1], suggestion.coordinates[0]]
              return (
                <Marker key={suggestion.id} position={[lat, lng]} icon={suggestionIcon(suggestion.rank)}>
                  <Popup>
                    <strong>Suggested Location #{suggestion.rank}</strong><br />
                    {suggestion.title}<br />
                    Expected impact: {suggestion.expectedImpact}<br />
                    Cost: ${(suggestion.costEstimate / 1_000_000).toFixed(0)}M<br />
                    Confidence: {Math.round(suggestion.confidence * 100)}%<br />
                    {suggestion.reason}
                    <button
                      onClick={() => placeSuggestedInfrastructure(suggestion.id)}
                      style={{ display: 'block', marginTop: 8, border: '1px solid rgba(0,184,148,0.4)', borderRadius: 6, padding: '5px 8px', color: 'var(--color-accent-green)', background: 'rgba(0,184,148,0.08)' }}
                    >
                      Place Here
                    </button>
                  </Popup>
                </Marker>
              )
            })}
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

      {hovered && !isOverrideModeActive && <ExplanationTooltip hover={hovered} />}

      <AnimatePresence>
        {(mapLoading || mapError) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'absolute', inset: 0, zIndex: 6, pointerEvents: mapError ? 'auto' : 'none', display: 'grid', placeItems: 'center', background: mapError ? 'var(--color-bg-app)' : 'transparent' }}
          >
            <div style={{ width: 280, border: '1px solid var(--color-border-subtle)', borderRadius: 8, background: 'var(--color-bg-sidebar)', padding: 16, textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: mapError ? 'var(--color-accent-warning)' : 'var(--color-accent-cyan)' }}>
                {mapError ? 'Demo map fallback active' : 'Loading map context'}
              </div>
              <p style={{ marginTop: 8, fontSize: 11, lineHeight: 1.5, color: 'var(--color-text-muted)' }}>
                  {mapError ? 'The clean planning canvas is still usable.' : 'Loading city planning layers...'}
              </p>
              {mapError && (
                <button onClick={() => { setMapError(false); setMapLoading(true) }} style={{ marginTop: 10, border: '1px solid var(--color-border-subtle)', borderRadius: 6, padding: '6px 10px', color: 'var(--color-accent-cyan)', background: 'var(--color-bg-hover)', fontSize: 11 }}>
                  Retry tiles
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {showPlanning && layersPanelOpen && <LayerControlPanel activeLayers={activeLayers} toggleLayer={toggleLayer} />}
      {showPlanning && <PlanningLegend />}

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
    </main>
  )
}
