import { useEffect } from 'react'
import { TopBar } from './TopBar'
import { LeftSidebar } from './LeftSidebar'
import { RightPanel } from './RightPanel'
import { BottomBar } from './BottomBar'
import { PlanningReportModal } from '@/components/UI/PlanningReportModal'
import { EngineDebugPanel } from '@/components/UI/EngineDebugPanel'
import { MapContainer } from '@/components/Map/MapContainer'
import { useCityStore } from '@/stores/cityStore'
import { useSimulationStore } from '@/stores/simulationStore'

export function MainLayout({ onHome }: { onHome: () => void }) {
  const selectedCity = useCityStore((state) => state.selectedCity)
  const hydratePlanningForCity = useSimulationStore((state) => state.hydratePlanningForCity)
  const planningCityId = useSimulationStore((state) => state.planning.cityId)
  const currentFrame = useSimulationStore((state) => state.currentFrame)

  useEffect(() => {
    if (!selectedCity) return
    if (selectedCity.id !== planningCityId || !currentFrame) {
      hydratePlanningForCity(selectedCity.id)
    }
  }, [selectedCity, selectedCity?.id, planningCityId, currentFrame, hydratePlanningForCity])

  return (
    <div
      className="flex flex-col w-full overflow-hidden"
      style={{ height: '100vh', paddingBottom: 58, background: 'var(--color-bg-app)' }}
    >
      <TopBar onHome={onHome} />
      <div className="flex flex-1 overflow-hidden">
        <LeftSidebar />
        <MapContainer />
        <RightPanel />
      </div>
      <BottomBar />
      <PlanningReportModal />
      <EngineDebugPanel />
    </div>
  )
}
