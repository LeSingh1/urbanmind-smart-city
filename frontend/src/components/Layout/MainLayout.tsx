import { TopBar } from './TopBar'
import { LeftSidebar } from './LeftSidebar'
import { RightPanel } from './RightPanel'
import { MapContainer } from '@/components/Map/MapContainer'

export function MainLayout() {
  return (
    <div className="flex flex-col w-full h-full overflow-hidden" style={{ background: 'var(--color-bg-app)' }}>
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <LeftSidebar />
        <MapContainer />
        <RightPanel />
      </div>
    </div>
  )
}
