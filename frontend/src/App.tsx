import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { MainLayout } from '@/components/Layout/MainLayout'
import { LandingScreen } from '@/components/UI/LandingScreen'
import { useCityStore } from '@/stores/cityStore'
import { useSimulationStore } from '@/stores/simulationStore'
import type { CityProfile, MetricsSnapshot } from '@/types/city.types'
import type { AgentAction } from '@/types/simulation.types'

const ZONE_DISPLAY: Record<string, string> = {
  RES_LOW_DETACHED: 'Low-Density Residential',
  RES_MED_APARTMENT: 'Med-Density Apartment',
  RES_HIGH_TOWER: 'High-Rise Tower',
  COM_SMALL_SHOP: 'Small Commercial',
  COM_OFFICE_PLAZA: 'Office Plaza',
  PARK_SMALL: 'Small Park',
  BUS_STATION: 'Bus Station',
  EDU_HIGH: 'High School',
  HEALTH_HOSPITAL: 'Hospital',
  SMART_TRAFFIC_LIGHT: 'Smart Traffic Light',
  ENV_TREE_CORRIDOR: 'Tree Corridor',
  INFRA_POWER_SUBSTATION: 'Power Substation',
}
const ZONE_TYPES = Object.keys(ZONE_DISPLAY)

// Fixed cell size ~100m × 133m (city-block scale), independent of bbox
const ZONE_W_DEG = 0.0014
const ZONE_H_DEG = 0.0011

// Per-city land polygons: [minLng, minLat, maxLng, maxLat] — land only, no water
const CITY_LAND_ZONES: Record<string, Array<[number, number, number, number]>> = {
  new_york: [
    [-74.020, 40.700, -73.910, 40.882], // Manhattan
    [-74.042, 40.565, -73.832, 40.740], // Brooklyn
    [-73.970, 40.630, -73.700, 40.790], // Queens (western)
    [-73.930, 40.785, -73.760, 40.915], // Bronx
    [-74.255, 40.495, -74.055, 40.655], // Staten Island
  ],
  los_angeles: [
    [-118.550, 33.950, -118.100, 34.350],
    [-118.670, 34.120, -118.450, 34.340],
    [-118.480, 33.800, -118.180, 33.975],
  ],
  tokyo: [
    [139.550, 35.550, 139.850, 35.850],
  ],
  lagos: [
    [3.200, 6.400, 3.600, 6.650],
  ],
  london: [
    [-0.400, 51.350, 0.250, 51.650],
  ],
  sao_paulo: [
    [-46.780, -23.720, -46.400, -23.420],
  ],
  singapore: [
    [103.620, 1.240, 104.020, 1.460],
  ],
  dubai: [
    [55.080, 24.820, 55.550, 25.320],
  ],
  mumbai: [
    [72.770, 18.920, 73.000, 19.260],
  ],
}

function makeOfflineZoneFeatures(
  _city: CityProfile,
  actions: AgentAction[]
): GeoJSON.Feature[] {
  const hW = ZONE_W_DEG / 2
  const hH = ZONE_H_DEG / 2
  return actions.map((action) => {
    const cx = action.lng ?? 0
    const cy = action.lat ?? 0
    const x0 = cx - hW, x1 = cx + hW
    const y0 = cy - hH, y1 = cy + hH
    return {
      type: 'Feature' as const,
      properties: {
        x: action.x,
        y: action.y,
        zone_type_id: action.zone_type_id,
        isKeyInfrastructure: false,
        isNewlyAdded: true,
        fillOpacity: 0.9,
        population_density: 15000,
      },
      geometry: {
        type: 'Polygon' as const,
        coordinates: [[[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]]],
      },
    }
  })
}

function offlineMetrics(city: CityProfile, year: number): MetricsSnapshot {
  const t = year / 50
  return {
    year,
    pop_total: Math.round(city.population_current * (1 + city.urban_growth_rate * t * 0.3)),
    pop_density_avg: Math.round(9000 + t * 4000),
    pop_growth_rate: Math.round((city.urban_growth_rate * (1 - t * 0.3)) * 100) / 100,
    mobility_commute: Math.round(42 - t * 8),
    mobility_congestion: Math.round(45 + t * 10),
    mobility_transit_coverage: Math.round(60 + t * 20),
    mobility_walkability: Math.round(58 + t * 12),
    econ_gdp_est: Math.round(city.population_current * city.gdp_per_capita * (1 + t * 0.25)),
    econ_housing_afford: Math.round(54 - t * 8),
    econ_jobs_created: Math.round(t * 85000),
    env_green_ratio: Math.round(18 + t * 5),
    env_co2_est: Math.round(600 + t * 120),
    env_impervious: Math.round(52 + t * 8),
    env_flood_exposure: Math.round(18 - t * 3),
    equity_infra_gini: Math.round(34 - t * 6),
    equity_hosp_coverage: Math.round(71 + t * 12),
    equity_school_access: Math.round(78 + t * 10),
    infra_power_load: Math.round(61 + t * 18),
    infra_water_capacity: Math.round(68 + t * 15),
    safety_response_time: Math.round((7.5 - t * 2) * 10) / 10,
  }
}

function offlineActions(year: number, city: CityProfile): AgentAction[] {
  const count = 4 + (year % 4)
  const landZones = CITY_LAND_ZONES[city.id] ?? [[city.bbox[0], city.bbox[1], city.bbox[2], city.bbox[3]] as [number, number, number, number]]
  return Array.from({ length: count }, (_, i) => {
    const seed = year * 97 + i * 53
    const zone = landZones[seed % landZones.length]
    const [minLng, minLat, maxLng, maxLat] = zone
    const lng = minLng + ((seed * 7919 + i * 3571) % 10000) / 10000 * (maxLng - minLng)
    const lat = minLat + ((seed * 6271 + i * 4919) % 10000) / 10000 * (maxLat - minLat)
    const zoneId = ZONE_TYPES[seed % ZONE_TYPES.length]
    return {
      x: 0,
      y: 0,
      lng,
      lat,
      zone_type_id: zoneId,
      zone_display_name: ZONE_DISPLAY[zoneId],
      sps_score: 0.45 + ((seed % 55) / 100),
    }
  })
}

export default function App() {
  const [showLanding, setShowLanding] = useState(true)
  const fetchCities = useCityStore((state) => state.fetchCities)
  const selectedCity = useCityStore((state) => state.selectedCity)
  const sessionId = useSimulationStore((state) => state.sessionId)
  const isRunning = useSimulationStore((state) => state.isRunning)
  const isPaused = useSimulationStore((state) => state.isPaused)
  const speed = useSimulationStore((state) => state.speed)
  const cityRef = useRef(selectedCity)
  cityRef.current = selectedCity

  useEffect(() => {
    fetchCities()
  }, [fetchCities])

  // Offline simulation loop — adds new zone features to the map each year
  useEffect(() => {
    if (sessionId !== 'offline' || !isRunning || isPaused) return
    const ms = Math.max(300, 1200 / speed)
    const id = setInterval(() => {
      const store = useSimulationStore.getState()
      const nextYear = store.currentYear + 1
      if (nextYear > 50) {
        store.pauseSimulation()
        return
      }
      const city = cityRef.current
      if (!city) return

      const actions = offlineActions(nextYear, city)
      const newFeatures = makeOfflineZoneFeatures(city, actions)

      // Accumulate zones: strip isNewlyAdded from old features, append new ones, cap at 300
      const prevFeatures = (store.currentFrame?.zones_geojson.features ?? []).map((f) => ({
        ...f,
        properties: { ...(f.properties ?? {}), isNewlyAdded: false },
      }))
      const capped = [...prevFeatures, ...newFeatures].slice(-300)

      store.receiveFrame({
        type: nextYear >= 50 ? 'SIM_COMPLETE' : 'SIM_FRAME',
        year: nextYear,
        zones_geojson: { type: 'FeatureCollection', features: capped },
        roads_geojson: store.currentFrame?.roads_geojson ?? { type: 'FeatureCollection', features: [] },
        metrics_snapshot: offlineMetrics(city, nextYear),
        agent_actions: actions,
      })
    }, ms)
    return () => clearInterval(id)
  }, [sessionId, isRunning, isPaused, speed])

  const onSimLanding = showLanding || !selectedCity

  return (
    <div style={{ background: 'var(--color-bg-app)', height: '100vh', overflow: 'hidden' }}>
      <AnimatePresence mode="wait">
        {onSimLanding ? (
          <motion.div
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.04, filter: 'blur(4px)' }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            style={{ position: 'absolute', inset: 0 }}
          >
            <LandingScreen onEnter={() => setShowLanding(false)} />
          </motion.div>
        ) : (
          <motion.div
            key="simulation"
            initial={{ opacity: 0, scale: 0.98, filter: 'blur(4px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            style={{ position: 'absolute', inset: 0 }}
          >
            <MainLayout />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
