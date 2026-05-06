import { TopBar } from './TopBar'
import { LeftSidebar } from './LeftSidebar'
import { RightPanel } from './RightPanel'
import { BottomBar } from './BottomBar'
import { MapContainer } from '@/components/Map/MapContainer'
import { AIPanel } from '@/components/AI/AIPanel'

export function MainLayout() {
  return (
    <div
      className="flex flex-col w-full overflow-hidden"
      style={{ height: '100vh', paddingBottom: 72, background: 'var(--color-bg-app)' }}
    >
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <LeftSidebar />
        <MapContainer />
        <RightPanel />
      </div>
      <div style={{ position: 'fixed', left: -10000, top: 0, width: 360 }}>
        <AIPanel />
      </div>
      <BottomBar />
    </div>
  )
}
