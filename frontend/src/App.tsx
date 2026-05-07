import { useEffect, useRef, useState } from 'react'
import { subscribeNotify } from '@/lib/notify'
import { AnimatePresence, motion } from 'framer-motion'
import { MainLayout } from '@/components/Layout/MainLayout'
import { LandingScreen } from '@/components/UI/LandingScreen'
import { useCityStore } from '@/stores/cityStore'
import { useSimulationStore } from '@/stores/simulationStore'
import type { CityProfile, MetricsSnapshot } from '@/types/city.types'
import type { AgentAction } from '@/types/simulation.types'

const PLACEMENT_REASONS: Record<string, string> = {
  RES_LOW_DETACHED: 'Population growth pressure and low land-cost index in this sector favour low-density residential expansion.',
  RES_MED_APARTMENT: 'Transit proximity and affordability gap in surrounding districts drive medium-density infill demand.',
  RES_HIGH_TOWER: 'Employment hub proximity and elevated land-value index justify high-rise residential consolidation.',
  COM_SMALL_SHOP: 'Underserved retail catchment identified within a 400 m service radius of this node.',
  COM_OFFICE_PLAZA: 'Economic growth forecast and knowledge-sector employment concentration support commercial plaza development.',
  PARK_SMALL: 'Green-coverage deficit flagged in this quadrant; equity index benefits from public open space.',
  BUS_STATION: 'Transit gap analysis shows a 600 m+ unserved corridor; bus station improves network connectivity score.',
  EDU_HIGH: 'Student-age population density exceeds threshold; nearest school capacity is at 94% utilisation.',
  HEALTH_HOSPITAL: 'Healthcare access index below 0.4 in this district; placement reduces average emergency response time.',
  SMART_TRAFFIC_LIGHT: 'Congestion hotspot detected at this intersection; smart signal cuts average delay by an estimated 12%.',
  ENV_TREE_CORRIDOR: 'Urban heat island effect and impervious surface ratio above threshold; green corridor mitigates risk.',
  INFRA_POWER_SUBSTATION: 'Grid load forecast exceeds 85% capacity in this sector; substation prevents brownout risk.',
}

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
const SIM_START_YEAR = 2026
const SIM_END_YEAR = 2076
const NEED_SEQUENCE = [
  'HEALTH_HOSPITAL',
  'EDU_HIGH',
  'BUS_STATION',
  'PARK_SMALL',
  'INFRA_POWER_SUBSTATION',
  'RES_MED_APARTMENT',
  'COM_SMALL_SHOP',
  'ENV_TREE_CORRIDOR',
  'RES_HIGH_TOWER',
  'COM_OFFICE_PLAZA',
  'RES_LOW_DETACHED',
  'SMART_TRAFFIC_LIGHT',
]
const SPACING_BY_NEED: Record<string, number> = {
  HEALTH_HOSPITAL: 0.035,
  EDU_HIGH: 0.025,
  BUS_STATION: 0.018,
  PARK_SMALL: 0.018,
  INFRA_POWER_SUBSTATION: 0.025,
}

// Fixed cell size ~100m × 133m (city-block scale), independent of bbox
const ZONE_W_DEG = 0.0014
const ZONE_H_DEG = 0.0011

// Per-city land bounding boxes [minLat, maxLat, minLng, maxLng] — clamps jittered dots to avoid water
const CITY_BOUNDS: Record<string, [number, number, number, number]> = {
  new_york:   [40.4774, 40.9176, -74.2591, -73.7004],
  los_angeles:[33.7037, 34.3373, -118.6682, -117.6462],
  tokyo:      [35.5219, 35.8985, 139.5426, 139.9200],
  lagos:      [6.3930,  6.7023,   3.2714,   3.6500],
  london:     [51.2868, 51.6919, -0.5103,   0.3340],
  sao_paulo:  [-23.7749,-23.3568,-46.8252, -46.3648],
  // Tight bounds for water-heavy cities
  singapore:  [1.2200,  1.4700,  103.6100, 104.0850],
  dubai:      [24.9200, 25.3600,  55.0200,  55.5700],
  mumbai:     [18.8900, 19.2700,  72.7800,  72.9900],
  // Bay Area cities
  fremont:    [37.4500, 37.6300, -122.0900, -121.8600],
  fremon:     [37.4500, 37.6300, -122.0900, -121.8600],
  san_jose:   [37.1900, 37.4700, -122.0500, -121.6800],
  sacramento: [38.4400, 38.6900, -121.6200, -121.3300],
  stockton:   [37.8400, 38.0800, -121.4200, -121.1600],
  // Sun Belt
  austin:     [30.1000, 30.5200, -97.9400, -97.5600],
  phoenix:    [33.2800, 33.7500, -112.3200, -111.8200],
}

// Per-city neighborhood anchors [lat, lng] — verified land centres; dots are jittered around each
const CITY_ANCHORS: Record<string, Array<[number, number]>> = {
  new_york: [
    // Manhattan
    [40.7074, -74.0104], [40.7175, -74.0078], [40.7233, -74.0030],
    [40.7335, -74.0027], [40.7412, -74.0007], [40.7465, -74.0014],
    [40.7549, -73.9840], [40.7598, -73.9927], [40.7484, -73.9778],
    [40.7387, -73.9840], [40.7265, -73.9815], [40.7154, -73.9843],
    [40.7870, -73.9754], [40.7736, -73.9566], [40.7994, -73.9519],
    [40.8116, -73.9465], [40.8248, -73.9387], [40.8448, -73.9393],
    [40.8560, -73.9290], [40.8678, -73.9211],
    // Brooklyn
    [40.6959, -73.9961], [40.7081, -73.9571], [40.7228, -73.9442],
    [40.6712, -73.9776], [40.6872, -73.9418], [40.6698, -73.9442],
    [40.6501, -73.9497], [40.6359, -74.0274], [40.6510, -73.9744],
    [40.6384, -73.9742], [40.6780, -73.9720],
    // Queens
    [40.7721, -73.9301], [40.7447, -73.9453], [40.7557, -73.8831],
    [40.7675, -73.8330], [40.7196, -73.8499], [40.7031, -73.8323],
    [40.7282, -73.9020], [40.7489, -73.9215],
    // Bronx
    [40.8151, -73.8937], [40.8484, -73.9042], [40.8877, -73.9082],
    [40.8303, -73.8688], [40.8571, -73.8821],
    // Staten Island
    [40.6437, -74.0740], [40.5901, -74.1501], [40.6284, -74.1023],
  ],
  los_angeles: [
    [34.0522, -118.2437], [34.0928, -118.3287], [34.0195, -118.4912],
    [34.0211, -118.3965], [34.1478, -118.1445], [34.0639, -118.4430],
    [34.0736, -118.4004], [34.0505, -118.2578], [33.9850, -118.4723],
    [34.1811, -118.3090], [34.1425, -118.2551], [34.0689, -118.1553],
    [34.0250, -118.1716], [33.9542, -118.2012], [34.0453, -118.2616],
    [34.0234, -118.4069], [34.1688, -118.3759],
  ],
  tokyo: [
    [35.6762, 139.6503], [35.6581, 139.7018], [35.6659, 139.7318],
    [35.7090, 139.7319], [35.7281, 139.7186], [35.7447, 139.7488],
    [35.7112, 139.8031], [35.6762, 139.7707], [35.7202, 139.8633],
    [35.6895, 139.6917], [35.6636, 139.6553], [35.7044, 139.6509],
    [35.7340, 139.6478], [35.7511, 139.6714], [35.7648, 139.6948],
    [35.7809, 139.7430], [35.6938, 139.7034],
  ],
  lagos: [
    [6.4550, 3.3841], [6.4281, 3.4219], [6.4698, 3.5852],
    [6.5244, 3.3792], [6.5355, 3.3521], [6.5650, 3.3482],
    [6.5854, 3.3515], [6.6018, 3.3515], [6.6353, 3.3082],
  ],
  london: [
    [51.5074, -0.1278], [51.5010, -0.1418], [51.5165, -0.0756],
    [51.4816, -0.1955], [51.5588, -0.1035], [51.4613, -0.0729],
    [51.4836,  0.0098], [51.5305, -0.2905], [51.5123, -0.1345],
    [51.5648, -0.0557], [51.5549, -0.2798], [51.4048, -0.0954],
    [51.4613, -0.1156], [51.5290, -0.1255], [51.4879, -0.0438],
  ],
  sao_paulo: [
    [-23.5505, -46.6333], [-23.5629, -46.6544], [-23.5454, -46.6917],
    [-23.5900, -46.6640], [-23.5179, -46.6140], [-23.5380, -46.7231],
    [-23.6320, -46.5870], [-23.5070, -46.5700], [-23.5484, -46.5948],
    [-23.5268, -46.6573], [-23.5900, -46.7242],
  ],
  singapore: [
    [1.3521, 103.8198], [1.3048, 103.8318], [1.3590, 103.8887],
    [1.3753, 103.9494], [1.3236, 103.9273], [1.3496, 103.7191],
    [1.4197, 103.8330], [1.3868, 103.7471], [1.3000, 103.7940],
    [1.3502, 103.8489],
  ],
  dubai: [
    [25.2048, 55.2708], [25.1972, 55.2744], [25.2285, 55.3273],
    [25.2157, 55.2900], [25.1124, 55.1390], [25.0657, 55.1713],
    [25.1891, 55.3600], [25.2631, 55.3133], [25.0950, 55.2485],
    [25.1835, 55.2544], [25.2372, 55.3762],
  ],
  mumbai: [
    [18.9388, 72.8354], [18.9667, 72.8237], [19.0176, 72.8562],
    [19.1136, 72.8697], [19.2183, 72.9781], [19.1740, 72.9559],
    [19.0895, 72.8656], [18.9548, 72.8338], [19.0544, 72.8319],
    [19.1580, 72.9891],
  ],
  // Fremont, CA & generated twin
  fremont: [
    [37.5485, -121.9886], [37.5574, -121.9766], [37.5030, -121.9390],
    [37.5331, -121.9294], [37.5760, -121.9650], [37.5200, -122.0100],
    [37.5680, -122.0300], [37.5400, -121.9500], [37.5100, -121.9700],
    [37.5820, -121.9800], [37.5450, -122.0050], [37.5300, -121.9100],
    [37.5650, -121.9400], [37.5150, -121.9550], [37.5520, -121.9950],
  ],
  fremon: [
    [37.5860, -121.9900], [37.5480, -121.9360], [37.5000, -121.9900],
    [37.5520, -121.9900], [37.5480, -122.0380], [37.5650, -121.9560],
    [37.5120, -121.9450], [37.5710, -122.0100], [37.5300, -121.9650],
    [37.5600, -121.9200], [37.5400, -122.0150], [37.5200, -121.9800],
  ],
  // San Jose, CA
  san_jose: [
    [37.3382, -121.8863], [37.3480, -121.9060], [37.3720, -121.9200],
    [37.3600, -121.8700], [37.3200, -121.8500], [37.3100, -121.8900],
    [37.3850, -121.8600], [37.3000, -121.9100], [37.3550, -121.9400],
    [37.3750, -121.9500], [37.3400, -121.8300], [37.3650, -121.8100],
  ],
  // Sacramento, CA
  sacramento: [
    [38.5816, -121.4944], [38.5600, -121.4700], [38.5450, -121.5200],
    [38.6000, -121.4600], [38.6200, -121.5000], [38.5700, -121.5400],
    [38.5300, -121.4400], [38.5900, -121.4300], [38.5150, -121.5000],
    [38.6350, -121.4800], [38.5500, -121.5700], [38.5800, -121.3900],
  ],
  // Stockton, CA
  stockton: [
    [37.9577, -121.2908], [37.9400, -121.3100], [37.9700, -121.2600],
    [37.9200, -121.2700], [37.9800, -121.3300], [37.9100, -121.2500],
    [37.9600, -121.3500], [37.9350, -121.2400], [38.0000, -121.3000],
  ],
  // Austin, TX
  austin: [
    [30.2672, -97.7431], [30.2850, -97.7500], [30.2500, -97.7600],
    [30.3100, -97.7300], [30.2300, -97.7200], [30.2700, -97.7800],
    [30.3400, -97.7600], [30.2200, -97.7900], [30.2900, -97.8100],
    [30.3200, -97.7000], [30.2400, -97.7000], [30.2600, -97.6800],
  ],
  // Phoenix, AZ
  phoenix: [
    [33.4484, -112.0740], [33.4700, -112.0500], [33.4300, -112.1000],
    [33.5000, -112.0800], [33.4100, -112.0600], [33.4600, -112.1200],
    [33.5200, -112.0400], [33.3900, -112.0300], [33.4800, -111.9800],
    [33.4200, -111.9600], [33.5400, -111.9500], [33.3700, -112.1100],
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
        zone_display_name: action.zone_display_name,
        isKeyInfrastructure: false,
        isNewlyAdded: true,
        fillOpacity: 0.9,
        population_density: 15000,
        sps_score: action.sps_score,
        placement_reason: action.placement_reason,
      },
      geometry: {
        type: 'Polygon' as const,
        coordinates: [[[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]]],
      },
    }
  })
}

function offlineMetrics(city: CityProfile, year: number): MetricsSnapshot {
  const t = Math.max(0, Math.min(1, (year - SIM_START_YEAR) / (SIM_END_YEAR - SIM_START_YEAR)))
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

// Jitter in degrees — spreads dots ~500 m around each anchor for natural city coverage
const JITTER_LNG = 0.006
const JITTER_LAT = 0.005
const WATER_SENSITIVE_CITIES = new Set(['new_york', 'singapore', 'mumbai', 'dubai', 'lagos', 'london', 'tokyo'])
const WATER_EXCLUSION_BOXES: Record<string, Array<[number, number, number, number]>> = {
  new_york: [
    [40.7000, 40.9000, -74.0350, -74.0120], // Hudson River edge
    [40.6900, 40.7950, -73.9940, -73.9340], // East River channel
    [40.5600, 40.7000, -74.0700, -73.9600], // Upper Bay / harbour
    [40.5900, 40.6700, -73.9000, -73.7450], // Jamaica Bay
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
}

function offlineActions(year: number, city: CityProfile): AgentAction[] {
  const anchors = CITY_ANCHORS[city.id] ?? [[city.center_lat, city.center_lng] as [number, number]]
  const count = Math.max(1, Math.min(10, anchors.length, 8 + (year % 6)))
  const offset = (year * 31) % anchors.length
  const bounds = CITY_BOUNDS[city.id]
  const jitterScale = WATER_SENSITIVE_CITIES.has(city.id) ? 0.38 : 1
  const placed: Array<{ lat: number; lng: number; zoneId: string }> = []
  return Array.from({ length: count }, (_, i) => {
    const anchorIdx = (offset + i * Math.ceil(anchors.length / count)) % anchors.length
    const [anchorLat, anchorLng] = anchors[anchorIdx]
    const seed = year * 97 + i * 53
    const lngJitter = (((seed * 7919 + i * 3571) % 10000) / 10000 - 0.5) * 2 * JITTER_LNG * jitterScale
    const latJitter = (((seed * 6271 + i * 4919) % 10000) / 10000 - 0.5) * 2 * JITTER_LAT * jitterScale
    // Clamp to city land bounds to prevent placements in water
    const rawLng = anchorLng + lngJitter
    const rawLat = anchorLat + latJitter
    const adjusted = safeLandPlacement(city.id, rawLat, rawLng, anchorLat, anchorLng, bounds)
    const lat = adjusted.lat
    const lng = adjusted.lng
    const zoneId = chooseNeededZone(year, i, lat, lng, placed)
    placed.push({ lat, lng, zoneId })
    return {
      x: 0,
      y: 0,
      lng,
      lat,
      zone_type_id: zoneId,
      zone_display_name: ZONE_DISPLAY[zoneId],
      sps_score: 0.45 + ((seed % 55) / 100),
      placement_reason: PLACEMENT_REASONS[zoneId] ?? 'Zone placement optimises service coverage and land-use efficiency in this sector.',
    }
  })
}

function safeLandPlacement(
  cityId: string,
  rawLat: number,
  rawLng: number,
  anchorLat: number,
  anchorLng: number,
  bounds?: [number, number, number, number]
) {
  const clamp = (lat: number, lng: number) => ({
    lat: bounds ? Math.max(bounds[0], Math.min(bounds[1], lat)) : lat,
    lng: bounds ? Math.max(bounds[2], Math.min(bounds[3], lng)) : lng,
  })
  const candidate = clamp(rawLat, rawLng)
  if (!isExcludedWater(cityId, candidate.lat, candidate.lng)) return candidate

  const nudges = [
    [0, 0],
    [0.004, 0.004],
    [-0.004, 0.004],
    [0.004, -0.004],
    [-0.004, -0.004],
    [0.007, 0],
    [0, 0.007],
    [-0.007, 0],
    [0, -0.007],
  ]

  for (const [latOffset, lngOffset] of nudges) {
    const next = clamp(anchorLat + latOffset, anchorLng + lngOffset)
    if (!isExcludedWater(cityId, next.lat, next.lng)) return next
  }
  return clamp(anchorLat, anchorLng)
}

function isExcludedWater(cityId: string, lat: number, lng: number) {
  return (WATER_EXCLUSION_BOXES[cityId] ?? []).some(([minLat, maxLat, minLng, maxLng]) =>
    lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng
  )
}

function chooseNeededZone(year: number, index: number, lat: number, lng: number, placed: Array<{ lat: number; lng: number; zoneId: string }>) {
  const start = (year + index * 3) % NEED_SEQUENCE.length
  for (let j = 0; j < NEED_SEQUENCE.length; j += 1) {
    const zoneId = NEED_SEQUENCE[(start + j) % NEED_SEQUENCE.length]
    const minDistance = SPACING_BY_NEED[zoneId] ?? 0.012
    const tooClose = placed.some((item) => item.zoneId === zoneId && Math.hypot(lat - item.lat, lng - item.lng) < minDistance)
    if (!tooClose) return zoneId
  }
  return ZONE_TYPES[(year + index) % ZONE_TYPES.length]
}

export default function App() {
  const [showLanding, setShowLanding] = useState(true)
  const [banner, setBanner] = useState<{ message: string; variant?: 'info' | 'error' } | null>(null)
  const fetchCities = useCityStore((state) => state.fetchCities)
  const cities = useCityStore((state) => state.cities)
  const selectedCity = useCityStore((state) => state.selectedCity)
  const selectCity = useCityStore((state) => state.selectCity)
  const sessionId = useSimulationStore((state) => state.sessionId)
  const isRunning = useSimulationStore((state) => state.isRunning)
  const isPaused = useSimulationStore((state) => state.isPaused)
  const speed = useSimulationStore((state) => state.speed)
  const cityRef = useRef(selectedCity)
  cityRef.current = selectedCity

  useEffect(() => {
    fetchCities()
  }, [fetchCities])

  useEffect(() => {
    return subscribeNotify((detail) => {
      setBanner(detail)
      window.setTimeout(() => setBanner(null), 5200)
    })
  }, [])


  // Offline simulation loop — adds new zone features to the map each year
  useEffect(() => {
    if (sessionId !== 'offline' || !isRunning || isPaused) return
    const ms = Math.max(300, 1200 / speed)
    const id = setInterval(() => {
      const store = useSimulationStore.getState()
      const nextYear = store.currentYear < SIM_START_YEAR ? SIM_START_YEAR : store.currentYear + 1
      if (nextYear > SIM_END_YEAR) {
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
        type: nextYear >= SIM_END_YEAR ? 'SIM_COMPLETE' : 'SIM_FRAME',
        year: nextYear,
        zones_geojson: { type: 'FeatureCollection', features: capped },
        roads_geojson: { type: 'FeatureCollection', features: [] },
        metrics_snapshot: offlineMetrics(city, nextYear),
        agent_actions: actions,
      })
    }, ms)
    return () => clearInterval(id)
  }, [sessionId, isRunning, isPaused, speed])

  const onSimLanding = showLanding || !selectedCity
  const goHome = () => {
    setShowLanding(true)
    selectCity(null)
  }

  return (
    <div style={{ background: 'var(--color-bg-app)', height: '100vh', overflow: 'hidden' }}>
      <AnimatePresence mode="wait">
        {onSimLanding ? (
          <motion.div
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            style={{ position: 'absolute', inset: 0 }}
          >
            <LandingScreen onEnter={() => setShowLanding(false)} />
          </motion.div>
        ) : (
          <motion.div
            key="simulation"
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            style={{ position: 'absolute', inset: 0 }}
          >
            <MainLayout onHome={goHome} />
          </motion.div>
        )}
      </AnimatePresence>
      {banner && (
        <div
          className="fixed bottom-16 left-1/2 z-[100] max-w-lg -translate-x-1/2 rounded-xl px-4 py-3 text-sm shadow-lg"
          role="status"
          style={{
            background: banner.variant === 'error' ? 'rgba(120,22,22,0.95)' : 'rgba(28,42,62,0.95)',
            color: '#f4f8ff',
            border: '1px solid rgba(255,255,255,0.14)',
          }}
        >
          {banner.message}
        </div>
      )}
    </div>
  )
}
