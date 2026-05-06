import { useEffect, useRef, useCallback } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useCityStore } from '@/stores/cityStore'
import { useSimulationStore } from '@/stores/simulationStore'
import { useUIStore } from '@/stores/uiStore'
import { useAIStore } from '@/stores/aiStore'
import { useScenarioStore } from '@/stores/scenarioStore'
import { getZoneColor } from '@/utils/colorUtils'
import type { Landmark } from '@/types/city.types'

// MapLibre style: light CartoDB raster base + free vector buildings from OpenFreeMap
const buildStyle = (): maplibregl.StyleSpecification => ({
  version: 8,
  glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
  sources: {
    'carto-light': {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}@2x.png',
        'https://b.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}@2x.png',
        'https://c.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}@2x.png',
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
    { id: 'background', type: 'background', paint: { 'background-color': '#e0e5ec' } },
    { id: 'raster-base', type: 'raster', source: 'carto-light', paint: { 'raster-opacity': 0.92 } },
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
          0,   '#d1d9e6',
          20,  '#c4ccdb',
          60,  '#b5bece',
          150, '#a3b1c6',
        ],
        'fill-extrusion-height': ['coalesce', ['get', 'height'], ['get', 'render_height'], 5],
        'fill-extrusion-base': ['coalesce', ['get', 'min_height'], 0],
        'fill-extrusion-opacity': 0.9,
      },
    } as maplibregl.LayerSpecification,
  ],
})

function buildGeoJSON(
  city: ReturnType<typeof useCityStore.getState>['selectedCity'],
  frame: ReturnType<typeof useSimulationStore.getState>['currentFrame'],
  isActive: boolean,
  userZones: ReturnType<typeof useSimulationStore.getState>['userZones'],
): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = []

  if (isActive && frame) {
    frame.zones_geojson.features.forEach((f: any, i: number) => {
      const coords: number[][] = f.geometry.coordinates[0]
      const lng = coords.reduce((s: number, c: number[]) => s + c[0], 0) / coords.length
      const lat = coords.reduce((s: number, c: number[]) => s + c[1], 0) / coords.length
      const zone = f.properties?.zone_type_id ?? 'RES_LOW_DETACHED'
      features.push({
        type: 'Feature',
        id: i,
        geometry: { type: 'Point', coordinates: [lng, lat] },
        properties: { ...f.properties, zone_type_id: zone, color: getZoneColor(zone) },
      })
    })
  } else {
    ;(city?.landmarks ?? []).forEach((lm: Landmark, i: number) => {
      features.push({
        type: 'Feature',
        id: i,
        geometry: { type: 'Point', coordinates: [lm.lng, lm.lat] },
        properties: {
          zone_type_id: lm.zone_type_id,
          building_name: lm.name,
          category: lm.category,
          color: getZoneColor(lm.zone_type_id),
        },
      })
    })
  }

  userZones.forEach((uz, i) => {
    features.push({
      type: 'Feature',
      id: 10000 + i,
      geometry: { type: 'Point', coordinates: [uz.lng, uz.lat] },
      properties: {
        zone_type_id: uz.zone_type_id,
        building_name: uz.zone_type_id.replace(/_/g, ' '),
        color: getZoneColor(uz.zone_type_id),
        isUserPlaced: true,
      },
    })
  })

  return { type: 'FeatureCollection', features }
}

export function Map3DView() {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const popupRef = useRef<maplibregl.Popup | null>(null)
  const readyRef = useRef(false)

  const city = useCityStore((s) => s.selectedCity)
  const frame = useSimulationStore((s) => s.currentFrame)
  const isRunning = useSimulationStore((s) => s.isRunning)
  const isPaused = useSimulationStore((s) => s.isPaused)
  const userZones = useSimulationStore((s) => s.userZones)
  const openDrawer = useUIStore((s) => s.openDrawer)
  const updateDrawer = useUIStore((s) => s.updateDrawer)
  const fetchExplanation = useAIStore((s) => s.fetchExplanation)
  const scenario = useScenarioStore((s) => s.activeScenario)

  const isActive = (isRunning || isPaused) && !!frame

  // Push latest dots into the map source
  const syncDots = useCallback(() => {
    const map = mapRef.current
    if (!map || !readyRef.current) return
    const geojson = buildGeoJSON(city, frame, isActive, userZones)
    const src = map.getSource('zones') as maplibregl.GeoJSONSource | undefined
    if (src) src.setData(geojson)
  }, [city, frame, isActive, userZones])

  // Initialize MapLibre map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const center: [number, number] = city
      ? [city.center_lng, city.center_lat]
      : [-74.01, 40.71]

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: buildStyle(),
      center,
      zoom: city?.default_zoom ?? 12,
      pitch: 50,
      bearing: -20,
    })
    mapRef.current = map
    popupRef.current = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      className: 'urbanmind-popup',
      offset: 10,
    })

    map.on('load', () => {
      // Zone dots source + layers
      map.addSource('zones', {
        type: 'geojson',
        data: buildGeoJSON(city, frame, isActive, userZones),
      })
      map.addLayer({
        id: 'zones-halo',
        type: 'circle',
        source: 'zones',
        paint: {
          'circle-radius': 14,
          'circle-color': ['get', 'color'],
          'circle-opacity': 0.12,
          'circle-blur': 0.6,
        },
      })
      map.addLayer({
        id: 'zones-dot',
        type: 'circle',
        source: 'zones',
        paint: {
          'circle-radius': 8,
          'circle-color': ['get', 'color'],
          'circle-opacity': 0.9,
          'circle-stroke-width': 1.5,
          'circle-stroke-color': 'rgba(255,255,255,0.25)',
        },
      })

      // Hover popup
      map.on('mouseenter', 'zones-dot', (e) => {
        map.getCanvas().style.cursor = 'pointer'
        if (!e.features?.length) return
        const props = e.features[0].properties as any
        const coords = (e.features[0].geometry as GeoJSON.Point).coordinates as [number, number]
        const name = props.building_name ?? props.zone_type_id?.replace(/_/g, ' ') ?? 'Zone'
        popupRef.current!
          .setLngLat(coords)
          .setHTML(
            `<div style="font-family:monospace;font-size:11px;padding:6px 10px;background:#e0e5ec;border:1px solid #babecc;border-radius:8px;color:#2d3436;white-space:nowrap;box-shadow:4px 4px 8px #babecc,-4px -4px 8px #ffffff">
              <strong style="color:#ff4757">${name}</strong><br/>
              <span style="color:#636e72">${props.category ?? props.zone_type_id ?? ''}</span>
            </div>`
          )
          .addTo(map)
      })
      map.on('mouseleave', 'zones-dot', () => {
        map.getCanvas().style.cursor = ''
        popupRef.current!.remove()
      })

      // Click → open drawer
      map.on('click', 'zones-dot', (e) => {
        if (!e.features?.length) return
        const props = e.features[0].properties as any
        const zone = props.zone_type_id ?? 'RES_LOW_DETACHED'
        const displayName = props.building_name ?? zone.replace(/_/g, ' ')

        openDrawer({
          zone_type_id: zone,
          zone_display_name: displayName,
          x: 0,
          y: 0,
          year: frame?.year ?? 0,
          explanation_text: '…loading explanation',
          metrics_delta: frame?.metrics_snapshot ?? {},
          surrounding_context: props.placement_reason ?? 'Nearby zones, transit, and scenario constraints.',
          placement_reason: props.placement_reason ?? undefined,
          sps_score: props.sps_score,
        })

        fetchExplanation({
          type: 'zone_explanation',
          zone_type_id: zone,
          zone_display_name: displayName,
          city_name: city?.name ?? 'the city',
          surrounding_context: props.placement_reason ?? 'Nearby zones, transit, and forecast growth pressure.',
          metrics_delta: frame?.metrics_snapshot ?? {},
          scenario_goal: scenario,
        }).then((text) => updateDrawer({ explanation_text: text }))
      })

      readyRef.current = true
      syncDots()
    })

    // City bounds
    if (city) {
      map.setMaxBounds([
        [city.bbox[0] - 0.05, city.bbox[1] - 0.05],
        [city.bbox[2] + 0.05, city.bbox[3] + 0.05],
      ])
    }

    return () => {
      readyRef.current = false
      map.remove()
      mapRef.current = null
    }
  }, []) // mount once

  // Fly to new city
  useEffect(() => {
    const map = mapRef.current
    if (!map || !city) return
    map.flyTo({
      center: [city.center_lng, city.center_lat],
      zoom: city.default_zoom,
      pitch: 50,
      bearing: -20,
      duration: 2000,
      essential: true,
    })
    map.setMaxBounds([
      [city.bbox[0] - 0.05, city.bbox[1] - 0.05],
      [city.bbox[2] + 0.05, city.bbox[3] + 0.05],
    ])
  }, [city?.id])

  // Sync dots on data change
  useEffect(() => { syncDots() }, [syncDots])

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      {/* Pitch/bearing controls */}
      <div style={{
        position: 'absolute', top: 12, right: 12, display: 'flex', flexDirection: 'column', gap: 4,
        zIndex: 10,
      }}>
        {[
          { label: '▲', title: 'Tilt up', onClick: () => mapRef.current?.setPitch(Math.min(70, (mapRef.current.getPitch() ?? 50) + 10)) },
          { label: '▼', title: 'Tilt down', onClick: () => mapRef.current?.setPitch(Math.max(0, (mapRef.current.getPitch() ?? 50) - 10)) },
          { label: '↺', title: 'Reset bearing', onClick: () => mapRef.current?.resetNorth({ duration: 600 }) },
          { label: '+', title: 'Zoom in', onClick: () => mapRef.current?.zoomIn() },
          { label: '−', title: 'Zoom out', onClick: () => mapRef.current?.zoomOut() },
        ].map((btn) => (
          <button
            key={btn.label}
            title={btn.title}
            onClick={btn.onClick}
            style={{
              width: 32, height: 32, borderRadius: 6,
              border: '1px solid var(--color-border-subtle)',
              background: 'var(--color-bg-panel)',
              color: 'var(--color-text-secondary)',
              boxShadow: 'var(--shadow-sm)',
              fontSize: 14, cursor: 'pointer', display: 'grid', placeItems: 'center',
              transition: 'all 150ms ease',
            }}
          >
            {btn.label}
          </button>
        ))}
      </div>
    </div>
  )
}
