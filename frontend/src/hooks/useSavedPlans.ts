import { supabase } from '@/lib/supabase'

interface SavePlanArgs {
  sessionId: string
  cityId: string
  scenario: string
  drawnFeatures: GeoJSON.Feature[]
  name?: string
}

export function useSavedPlans() {
  const savePlan = async ({ sessionId, cityId, scenario, drawnFeatures, name }: SavePlanArgs) => {
    const { error } = await supabase.from('saved_plans').upsert({
      session_id: sessionId,
      city_id: cityId,
      scenario,
      drawn_features: drawnFeatures,
      name: name ?? `${cityId} · ${scenario}`,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'session_id' })

    if (error) console.error('[useSavedPlans] save failed:', error)
    return !error
  }

  const loadPlans = async (cityId: string) => {
    const { data, error } = await supabase
      .from('saved_plans')
      .select('*')
      .eq('city_id', cityId)
      .order('updated_at', { ascending: false })
      .limit(20)

    if (error) console.error('[useSavedPlans] load failed:', error)
    return data ?? []
  }

  return { savePlan, loadPlans }
}
