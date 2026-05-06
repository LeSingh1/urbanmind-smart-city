import { TopBar } from './TopBar'
import { LeftSidebar } from './LeftSidebar'
import { RightPanel } from './RightPanel'
import { MapContainer } from '@/components/Map/MapContainer'

export function MainLayout() {
  return (
    <div
      className="flex flex-col w-full h-full overflow-hidden"
      style={{
        background: 'radial-gradient(circle at 22% 0%, rgba(0,212,255,0.12), transparent 32%), radial-gradient(circle at 86% 18%, rgba(124,58,237,0.12), transparent 28%), linear-gradient(135deg, #080D16 0%, #0D1117 48%, #070A12 100%)',
      }}
    >
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <LeftSidebar />
        <MapContainer />
        <RightPanel />
      </div>
    </div>
  )
}
