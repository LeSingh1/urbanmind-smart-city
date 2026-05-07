import { create } from 'zustand'
import { STATIC_CITIES } from '@/data/staticCities'
import type { CityProfile } from '@/types/city.types'

const API_BASE = import.meta.env.VITE_API_URL ?? '/api'
const FEATURED_CITY_IDS = ['fremon', 'fremont', 'san_jose']
const FEATURED_CITY_RANK = new Map(FEATURED_CITY_IDS.map((id, index) => [id, index]))
const HIDDEN_CITY_IDS = new Set(['sacramento', 'austin', 'phoenix', 'mumbai'])

interface CityStore {
  cities: CityProfile[]
  selectedCity: CityProfile | null
  isLoading: boolean
  fetchCities: () => Promise<void>
  setCities: (cities: CityProfile[]) => void
  addCity: (city: CityProfile) => void
  selectCity: (city: CityProfile | null) => void
}

export const useCityStore = create<CityStore>((set) => ({
  cities: sortFeaturedCities(STATIC_CITIES),
  selectedCity: null,
  isLoading: false,

  fetchCities: async () => {
    set({ isLoading: true })
    try {
      const response = await fetch(`${API_BASE}/cities`)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const cities = await response.json()
      const normalized = sortFeaturedCities(cities.map(normalizeCity))
      set((state) => ({
        cities: normalized,
        selectedCity: state.selectedCity,
        isLoading: false,
      }))
    } catch {
      set((state) => ({
        cities: sortFeaturedCities(STATIC_CITIES),
        selectedCity: state.selectedCity,
        isLoading: false,
      }))
    }
  },

  setCities: (cities) => set({ cities: sortFeaturedCities(cities.map(normalizeCity)) }),
  addCity: (city) => set((state) => {
    const normalized = normalizeCity(city)
    return {
      cities: sortFeaturedCities([normalized, ...state.cities.filter((item) => item.id !== normalized.id)]),
      selectedCity: normalized,
    }
  }),
  selectCity: (city) => set({ selectedCity: city }),
}))

function sortFeaturedCities(cities: CityProfile[]): CityProfile[] {
  return cities.filter((city) => !HIDDEN_CITY_IDS.has(city.id)).sort((a, b) => {
    const rankA = FEATURED_CITY_RANK.get(a.id) ?? Number.POSITIVE_INFINITY
    const rankB = FEATURED_CITY_RANK.get(b.id) ?? Number.POSITIVE_INFINITY
    if (rankA !== rankB) return rankA - rankB
    return 0
  })
}

function normalizeCity(raw: any): CityProfile {
  const fallback = STATIC_CITIES.find((city) => city.id === raw.id) ?? STATIC_CITIES[0]
  return {
    ...fallback,
    ...raw,
    center_lat: raw.center_lat ?? raw.coordinates?.lat ?? fallback.center_lat,
    center_lng: raw.center_lng ?? raw.coordinates?.lng ?? fallback.center_lng,
    population_current: raw.population_current ?? raw.population ?? fallback.population_current,
    gdp_per_capita: raw.gdp_per_capita ?? fallback.gdp_per_capita,
    urban_growth_rate: raw.urban_growth_rate ?? fallback.urban_growth_rate,
    key_planning_challenge: raw.key_planning_challenge ?? raw.description ?? fallback.key_planning_challenge,
    bbox: raw.bbox ?? [
      raw.bounding_box?.west ?? fallback.bbox[0],
      raw.bounding_box?.south ?? fallback.bbox[1],
      raw.bounding_box?.east ?? fallback.bbox[2],
      raw.bounding_box?.north ?? fallback.bbox[3],
    ],
  }
}
