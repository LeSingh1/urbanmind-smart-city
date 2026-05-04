import type { MetricsSnapshot } from '@/types/city.types'

export interface MetricConfig {
  key: keyof MetricsSnapshot
  label: string
  unit: string
  min: number
  max: number
  higherIsBetter: boolean
  category: 'mobility' | 'economy' | 'environment' | 'social' | 'infrastructure'
  format: (v: number) => string
}

export const METRIC_CONFIGS: MetricConfig[] = [
  { key: 'pop_total', label: 'Population', unit: '', min: 0, max: 30000000, higherIsBetter: true, category: 'social', format: (v) => v >= 1e6 ? `${(v/1e6).toFixed(1)}M` : v >= 1e3 ? `${(v/1e3).toFixed(0)}K` : `${v}` },
  { key: 'pop_density_avg', label: 'Pop. Density', unit: '/km²', min: 0, max: 50000, higherIsBetter: false, category: 'social', format: (v) => `${v.toFixed(0)}/km²` },
  { key: 'pop_growth_rate', label: 'Growth Rate', unit: '%', min: 0, max: 10, higherIsBetter: true, category: 'social', format: (v) => `${v.toFixed(2)}%` },
  { key: 'mobility_commute', label: 'Avg Commute', unit: 'min', min: 0, max: 120, higherIsBetter: false, category: 'mobility', format: (v) => `${v.toFixed(0)}min` },
  { key: 'mobility_congestion', label: 'Congestion', unit: '%', min: 0, max: 100, higherIsBetter: false, category: 'mobility', format: (v) => `${v.toFixed(0)}%` },
  { key: 'mobility_transit_coverage', label: 'Transit Coverage', unit: '%', min: 0, max: 100, higherIsBetter: true, category: 'mobility', format: (v) => `${v.toFixed(0)}%` },
  { key: 'mobility_walkability', label: 'Walkability', unit: '/100', min: 0, max: 100, higherIsBetter: true, category: 'mobility', format: (v) => `${v.toFixed(0)}/100` },
  { key: 'econ_housing_afford', label: 'Housing Afford.', unit: '/100', min: 0, max: 100, higherIsBetter: true, category: 'economy', format: (v) => `${v.toFixed(0)}/100` },
  { key: 'econ_jobs_created', label: 'Jobs Created', unit: '', min: 0, max: 500000, higherIsBetter: true, category: 'economy', format: (v) => v >= 1e3 ? `${(v/1e3).toFixed(0)}K` : `${v}` },
  { key: 'env_green_ratio', label: 'Green Space', unit: '%', min: 0, max: 40, higherIsBetter: true, category: 'environment', format: (v) => `${v.toFixed(1)}%` },
  { key: 'env_co2_est', label: 'CO₂ Estimate', unit: 'kt', min: 0, max: 2000, higherIsBetter: false, category: 'environment', format: (v) => `${v.toFixed(0)}kt` },
  { key: 'env_flood_exposure', label: 'Flood Exposure', unit: '%', min: 0, max: 100, higherIsBetter: false, category: 'environment', format: (v) => `${v.toFixed(0)}%` },
  { key: 'equity_hosp_coverage', label: 'Healthcare Access', unit: '%', min: 0, max: 100, higherIsBetter: true, category: 'social', format: (v) => `${v.toFixed(0)}%` },
  { key: 'equity_school_access', label: 'School Access', unit: '%', min: 0, max: 100, higherIsBetter: true, category: 'social', format: (v) => `${v.toFixed(0)}%` },
  { key: 'infra_power_load', label: 'Power Load', unit: '%', min: 0, max: 100, higherIsBetter: false, category: 'infrastructure', format: (v) => `${v.toFixed(0)}%` },
  { key: 'infra_water_capacity', label: 'Water Capacity', unit: '%', min: 0, max: 100, higherIsBetter: true, category: 'infrastructure', format: (v) => `${v.toFixed(0)}%` },
  { key: 'safety_response_time', label: 'Response Time', unit: 'min', min: 0, max: 30, higherIsBetter: false, category: 'infrastructure', format: (v) => `${v.toFixed(1)}min` },
]

export function getMetricDelta(current: MetricsSnapshot, previous: MetricsSnapshot, key: keyof MetricsSnapshot): number {
  return (current[key] as number) - (previous[key] as number)
}

export function formatMetricDelta(delta: number, higherIsBetter: boolean): { text: string; positive: boolean } {
  const positive = higherIsBetter ? delta > 0 : delta < 0
  const sign = delta > 0 ? '+' : ''
  return { text: `${sign}${delta.toFixed(1)}`, positive }
}
