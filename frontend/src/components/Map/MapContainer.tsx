import { useEffect, useMemo, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import { useCityStore } from '@/stores/cityStore'
import { useSimulationStore } from '@/stores/simulationStore'
import { useUIStore } from '@/stores/uiStore'
import { getZoneColor, lightenHex } from '@/utils/colorUtils'
import { ExplanationTooltip } from './ExplanationTooltip'
import { MiniMetricsPanel } from './MiniMetricsPanel'
import { SplitScreenView } from '@/components/Layout/SplitScreenView'
import type { Landmark } from '@/types/city.types'

const empty: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] }
const OPENFREEMAP_STYLE = import.meta.env.VITE_MAP_STYLE_URL || 'https://tiles.openfreemap.org/styles/dark'

// Landmark tile size ~100m × 133m (city-block scale)
const KEY_TILE_DEG_W = 0.0015
const KEY_TILE_DEG_H = 0.0012

function landmarkBox(lm: Landmark): [number, number, number, number] {
  const hw = (lm.w_deg ?? KEY_TILE_DEG_W) / 2
  const hh = (lm.h_deg ?? (lm.w_deg ?? KEY_TILE_DEG_W) * 0.75) / 2
  return [lm.lng - hw, lm.lat - hh, lm.lng + hw, lm.lat + hh]
}

export function MapContainer() {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const flashTimerRef = useRef<number | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [hovered, setHovered] = useState<{ x: number; y: number; lngLat: maplibregl.LngLat; properties: any } | null>(null)
  const city = useCityStore((state) => state.selectedCity)
  const frame = useSimulationStore((state) => state.currentFrame)
  const activeLayers = useUIStore((state) => state.activeLayers)
  const selectedOverrideZone = useUIStore((state) => state.selectedOverrideZone)
  const isSplitScreen = useUIStore((state) => state.isSplitScreen)
  const detailedGrid = useUIStore((state) => state.detailedGrid)

  const fallbackFrame = useMemo(() => city ? makeInitialCityFrame(city) : null, [city])
  const visibleFrame = frame ?? fallbackFrame

  // When detailedGrid is off, only show landmarks; when on show everything
  const filteredFrame = useMemo(() => {
    if (!visibleFrame) return null
    if (detailedGrid) return visibleFrame
    return {
      ...visibleFrame,
      zones_geojson: {
        ...visibleFrame.zones_geojson,
        features: visibleFrame.zones_geojson.features.filter(
          (f: GeoJSON.Feature) => (f.properties as any)?.isKeyInfrastructure === true
        ),
      },
    }
  }, [visibleFrame, detailedGrid])

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const [west, south, east, north] = city?.bbox ?? [-180, -85, 180, 85]
    const pad = 0.04
    mapRef.current = new maplibregl.Map({
      container: containerRef.current,
      style: OPENFREEMAP_STYLE,
      center: city ? [city.center_lng, city.center_lat] : [-74.01, 40.71],
      zoom: city?.default_zoom ?? 10,
      pitch: 0,
      bearing: 0,
      maxBounds: [[west - pad, south - pad], [east + pad, north + pad]],
    })
    mapRef.current.on('load', () => {
      addSourcesAndLayers(mapRef.current!)
      setLoaded(true)
    })
    return () => {
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [])

  // Fly to city when it changes
  useEffect(() => {
    if (!mapRef.current || !loaded || !city) return
    const [west, south, east, north] = city.bbox
    const pad = 0.04
    mapRef.current.setMaxBounds([[west - pad, south - pad], [east + pad, north + pad]])
    mapRef.current.flyTo({
      center: [city.center_lng, city.center_lat],
      zoom: city.default_zoom,
      pitch: activeLayers.has('3D Buildings') ? 30 : 0,
      duration: 2000,
    })
    setSource('boundary-source', boundaryGeojson(city))
  }, [city, loaded])

  // Update map data when frame changes
  useEffect(() => {
    if (!mapRef.current || !loaded || !filteredFrame) return
    const painted = withZonePaint(filteredFrame.zones_geojson)
    setSource('zones-source', painted)
    setSource('roads-source', filteredFrame.roads_geojson)
    setSource('buildings-source', painted)
    setSource('heatmap-source', zoneCentroids(filteredFrame.zones_geojson))

    // Flash newly added zones in the highlight layer
    const newFeatures = filteredFrame.zones_geojson.features.filter(
      (f: GeoJSON.Feature) => (f.properties as any)?.isNewlyAdded === true
    )
    if (newFeatures.length > 0) {
      const flashCollection: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: newFeatures.map((f) => ({
          ...f,
          properties: {
            ...(f.properties ?? {}),
            fill: getZoneColor((f.properties as any)?.zone_type_id ?? 'RES_LOW_DETACHED'),
          },
        })),
      }
      setSource('new-zones-source', flashCollection)
      // Make it visible at full opacity
      mapRef.current.setPaintProperty('new-zones-glow', 'fill-opacity', 0.85)
      mapRef.current.setPaintProperty('new-zones-outline', 'line-opacity', 1)

      // Clear flash after 2.5s
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current)
      flashTimerRef.current = window.setTimeout(() => {
        setSource('new-zones-source', empty)
      }, 2500)
    }
  }, [loaded, filteredFrame])

  // Layer visibility toggles
  useEffect(() => {
    if (!mapRef.current || !loaded) return
    const m = mapRef.current
    setVisibility(m, ['zones-fill', 'zones-outline'], activeLayers.has('Zones'))
    setVisibility(m, ['roads-line'], activeLayers.has('Roads'))
    setVisibility(m, ['building-extrusion'], activeLayers.has('3D Buildings'))
    setVisibility(m, ['population-heatmap'], activeLayers.has('Population Heatmap'))
    m.easeTo({ pitch: activeLayers.has('3D Buildings') ? 30 : 0, duration: 450 })
  }, [activeLayers, loaded])

  // Hover events
  useEffect(() => {
    if (!mapRef.current || !loaded) return
    const m = mapRef.current
    const move = (event: maplibregl.MapMouseEvent) => {
      const features = m.queryRenderedFeatures(event.point, { layers: ['zones-fill'] })
      if (features[0]) {
        m.getCanvas().style.cursor = selectedOverrideZone ? 'crosshair' : 'pointer'
        setHovered({ x: event.point.x, y: event.point.y, lngLat: event.lngLat, properties: features[0].properties })
      } else {
        m.getCanvas().style.cursor = selectedOverrideZone ? 'crosshair' : ''
        setHovered(null)
      }
    }
    const leave = () => setHovered(null)
    m.on('mousemove', move)
    m.on('mouseleave', leave)
    return () => {
      m.off('mousemove', move)
      m.off('mouseleave', leave)
    }
  }, [loaded, selectedOverrideZone])

  return (
    <main
      style={{ flex: 1, position: 'relative', minWidth: 0, overflow: 'hidden', background: 'var(--color-bg-app)' }}
    >
      {isSplitScreen ? (
        <SplitScreenView />
      ) : (
        <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      )}
      {hovered && <ExplanationTooltip hover={hovered} />}
      <MiniMetricsPanel />
    </main>
  )

  function setSource(id: string, data: GeoJSON.FeatureCollection) {
    const source = mapRef.current?.getSource(id) as maplibregl.GeoJSONSource | undefined
    source?.setData(data)
  }
}

function addSourcesAndLayers(map: maplibregl.Map) {
  // City boundary (line only — no fill to avoid covering ocean/land)
  map.addSource('boundary-source', { type: 'geojson', data: empty })
  map.addLayer({
    id: 'boundary-line',
    type: 'line',
    source: 'boundary-source',
    paint: {
      'line-color': '#00D4FF',
      'line-width': 1.5,
      'line-dasharray': [4, 4],
      'line-opacity': 0.45,
    },
  })

  // Zone fill layer
  map.addSource('zones-source', { type: 'geojson', data: empty })
  map.addLayer({
    id: 'zones-fill',
    type: 'fill',
    source: 'zones-source',
    paint: {
      'fill-color': ['coalesce', ['get', 'fill'], '#27AE60'],
      'fill-opacity': ['coalesce', ['get', 'fillOpacity'], 0.46],
      'fill-opacity-transition': { duration: 500, delay: 0 },
    },
  })
  map.addLayer({
    id: 'zones-outline',
    type: 'line',
    source: 'zones-source',
    paint: {
      'line-color': ['case',
        ['==', ['get', 'isKeyInfrastructure'], true], 'rgba(0,212,255,0.8)',
        'rgba(0,212,255,0.2)',
      ],
      'line-width': ['case', ['==', ['get', 'isKeyInfrastructure'], true], 1.5, 0.5],
    },
  })

  // Roads
  map.addSource('roads-source', { type: 'geojson', data: empty })
  map.addLayer({
    id: 'roads-line',
    type: 'line',
    source: 'roads-source',
    paint: {
      'line-width': ['match', ['get', 'road_type'], 'HIGHWAY', 5, 'ARTERIAL', 3.5, 'COLLECTOR', 2, 1.2],
      'line-color': ['interpolate', ['linear'], ['coalesce', ['get', 'congestion_pct'], 0],
        0, '#00FF9C',
        50, '#FFB800',
        75, '#FF6B35',
        100, '#FF3366',
      ],
      'line-opacity': 0.85,
      'line-opacity-transition': { duration: 800, delay: 0 },
    },
  })

  // 3D building extrusion
  map.addSource('buildings-source', { type: 'geojson', data: empty })
  map.addLayer({
    id: 'building-extrusion',
    type: 'fill-extrusion',
    source: 'buildings-source',
    minzoom: 12,
    paint: {
      'fill-extrusion-color': ['coalesce', ['get', 'extrudeFill'], '#1A3A5C'],
      'fill-extrusion-height': ['min', 400, ['*', ['coalesce', ['get', 'population_density'], 5000], 0.004]],
      'fill-extrusion-base': 0,
      'fill-extrusion-opacity': 0.8,
      'fill-extrusion-opacity-transition': { duration: 800, delay: 0 },
    },
  })

  // Population heatmap
  map.addSource('heatmap-source', { type: 'geojson', data: empty })
  map.addLayer({
    id: 'population-heatmap',
    type: 'heatmap',
    source: 'heatmap-source',
    layout: { visibility: 'none' },
    paint: {
      'heatmap-weight': ['interpolate', ['linear'], ['coalesce', ['get', 'population_density'], 0], 0, 0, 80000, 1],
      'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 10, 15, 12, 30, 14, 50],
      'heatmap-color': ['interpolate', ['linear'], ['heatmap-density'],
        0, 'rgba(0,212,255,0)',
        0.3, 'rgba(0,212,255,0.3)',
        0.6, 'rgba(124,58,237,0.6)',
        1, 'rgba(255,51,102,1)',
      ],
    },
  })

  // NEW ZONES FLASH — bright highlighted overlay for newly placed zones
  map.addSource('new-zones-source', { type: 'geojson', data: empty })
  map.addLayer({
    id: 'new-zones-glow',
    type: 'fill',
    source: 'new-zones-source',
    paint: {
      'fill-color': ['coalesce', ['get', 'fill'], '#00FF9C'],
      'fill-opacity': 0,
      'fill-opacity-transition': { duration: 400, delay: 0 },
    },
  })
  map.addLayer({
    id: 'new-zones-outline',
    type: 'line',
    source: 'new-zones-source',
    paint: {
      'line-color': ['coalesce', ['get', 'fill'], '#00FF9C'],
      'line-width': 2.5,
      'line-opacity': 0,
      'line-opacity-transition': { duration: 400, delay: 0 },
    },
  })
}

function setVisibility(map: maplibregl.Map, ids: string[], visible: boolean) {
  ids.forEach((id) => {
    if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none')
  })
}

function withZonePaint(collection: GeoJSON.FeatureCollection): GeoJSON.FeatureCollection {
  return {
    ...collection,
    features: collection.features.map((feature) => {
      const props: any = feature.properties ?? {}
      const zone = props.zone_type_id ?? props.zone_type ?? 'RES_LOW_DETACHED'
      const fill = getZoneColor(zone)
      const isKey = props.isKeyInfrastructure === true
      const isNew = props.isNewlyAdded === true
      const opacity = isNew ? 0.88 : isKey ? 0.82 : 0.38
      return {
        ...feature,
        properties: {
          ...props,
          zone_type_id: zone,
          fill,
          fillOpacity: props.fillOpacity ?? opacity,
          extrudeFill: lightenHex(fill),
          population_density: props.population_density ?? 12000,
        },
      }
    }),
  }
}

function boundaryGeojson(city: any): GeoJSON.FeatureCollection {
  const [west, south, east, north] = city.bbox
  return {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: [[[west, south], [east, south], [east, north], [west, north], [west, south]]],
      },
    }],
  }
}

function zoneCentroids(collection: GeoJSON.FeatureCollection): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: collection.features.map((feature) => {
      const coords = (feature.geometry as any).coordinates?.[0] ?? []
      const lng = coords.reduce((sum: number, c: number[]) => sum + c[0], 0) / Math.max(1, coords.length)
      const lat = coords.reduce((sum: number, c: number[]) => sum + c[1], 0) / Math.max(1, coords.length)
      return { type: 'Feature', properties: feature.properties, geometry: { type: 'Point', coordinates: [lng, lat] } }
    }),
  }
}

function makeInitialCityFrame(city: any) {
  const landmarks: Landmark[] = city.landmarks ?? []

  // Real landmark polygons only — no synthetic background grid
  const keyFeatures: GeoJSON.Feature[] = landmarks.map((lm, i) => {
    const [w, s, e, n] = landmarkBox(lm)
    return {
      type: 'Feature',
      properties: {
        x: i,
        y: 0,
        zone_type_id: lm.zone_type_id,
        building_name: lm.name,
        category: lm.category,
        data_source: lm.data_source,
        isKeyInfrastructure: true,
        fillOpacity: 0.82,
        population_density: populationForZone(lm.zone_type_id, city),
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[[w, s], [e, s], [e, n], [w, n], [w, s]]],
      },
    }
  })

  return {
    type: 'SIM_INIT' as const,
    year: 0,
    zones_geojson: { type: 'FeatureCollection' as const, features: keyFeatures },
    roads_geojson: { type: 'FeatureCollection' as const, features: [] },
    metrics_snapshot: {
      year: 0,
      pop_total: city.population_current,
      pop_density_avg: 9000,
      pop_growth_rate: city.urban_growth_rate,
      mobility_commute: 42,
      mobility_congestion: 45,
      mobility_transit_coverage: 60,
      mobility_walkability: 58,
      econ_gdp_est: city.population_current * city.gdp_per_capita,
      econ_housing_afford: 54,
      econ_jobs_created: 0,
      env_green_ratio: 18,
      env_co2_est: 600,
      env_impervious: 52,
      env_flood_exposure: 18,
      equity_infra_gini: 34,
      equity_hosp_coverage: 71,
      equity_school_access: 78,
      infra_power_load: 61,
      infra_water_capacity: 68,
      safety_response_time: 7.5,
    },
    agent_actions: [],
  }
}

function populationForZone(zoneTypeId: string, city: any): number {
  const base = city.population_current ?? 5000000
  if (zoneTypeId.startsWith('HEALTH_')) return Math.round(base * 0.0003)
  if (zoneTypeId.startsWith('EDU_')) return Math.round(base * 0.0002)
  if (zoneTypeId.includes('STATION') || zoneTypeId.includes('AIRPORT')) return Math.round(base * 0.0001)
  if (zoneTypeId.startsWith('COM_')) return Math.round(base * 0.00015)
  if (zoneTypeId.startsWith('PARK_') || zoneTypeId.includes('FOREST') || zoneTypeId.includes('ENV_')) return 0
  if (zoneTypeId.startsWith('RES_')) return Math.round(base * 0.00025)
  return Math.round(base * 0.0001)
}

