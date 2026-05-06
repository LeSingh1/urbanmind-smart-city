import { TopBar } from './TopBar'
import { LeftSidebar } from './LeftSidebar'
import { RightPanel } from './RightPanel'
import { BottomBar } from './BottomBar'
import { MapContainer } from '@/components/Map/MapContainer'

export function MainLayout({ onHome }: { onHome: () => void }) {
  return (
    <div
      className="flex flex-col w-full overflow-hidden"
      style={{ height: '100vh', paddingBottom: 72, background: 'var(--color-bg-app)' }}
    >
      <TopBar onHome={onHome} />
      <div className="flex flex-1 overflow-hidden">
        <LeftSidebar />
        <MapContainer />
        <RightPanel />
      </div>
      <BottomBar />
    </div>
  )
}
