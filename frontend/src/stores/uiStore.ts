import { create } from 'zustand'
import type { ZoneExplanation } from '@/types/simulation.types'

type Tab = 'overview' | 'mobility' | 'economy' | 'environment'

interface UIStore {
  activeLayers: Set<string>
  activeTab: Tab
  isDashboardOpen: boolean
  isDrawerOpen: boolean
  drawerContent: ZoneExplanation | null
  isSplitScreen: boolean
  isOverrideModeActive: boolean
  selectedOverrideZone: string | null
  detailedGrid: boolean
  activeMapLayer: string
  highlightedZoneToken: string | null
  is3DMode: boolean
  toggleLayer: (layerId: string) => void
  setActiveTab: (tab: Tab) => void
  openDashboard: () => void
  closeDashboard: () => void
  openDrawer: (content: ZoneExplanation) => void
  updateDrawer: (patch: Partial<ZoneExplanation>) => void
  closeDrawer: () => void
  setOverrideZone: (zoneId: string | null) => void
  setSplitScreen: (enabled: boolean) => void
  setDetailedGrid: (enabled: boolean) => void
  setActiveMapLayer: (layer: string) => void
  setHighlightedZoneToken: (token: string | null) => void
  toggle3D: () => void
}

export const useUIStore = create<UIStore>((set) => ({
  activeLayers: new Set([
    // Engine context dots — visible by default at app load
    'Existing Clinics',
    'Existing Schools',
    'Existing Parks',
    'Existing Transit',
    'Existing Emergency',
    // Legacy categories (kept on for backwards compatibility with non-Fremon flows)
    'Existing hospitals',
    'Existing schools',
    'Existing parks',
    'Existing transit',
    'Existing police stations',
    'Existing fire stations',
    'Underserved zones',
    'AI Recommendations',
    'Proposed infrastructure',
    'Coverage Rings',
  ]),
  activeTab: 'overview',
  isDashboardOpen: false,
  isDrawerOpen: false,
  drawerContent: null,
  isSplitScreen: false,
  isOverrideModeActive: false,
  selectedOverrideZone: null,
  detailedGrid: false,
  activeMapLayer: 'zones',
  highlightedZoneToken: null,
  is3DMode: false,

  toggleLayer: (layerId) =>
    set((state) => {
      const next = new Set(state.activeLayers)
      if (next.has(layerId)) next.delete(layerId)
      else next.add(layerId)
      return { activeLayers: next }
    }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  openDashboard: () => set({ isDashboardOpen: true }),
  closeDashboard: () => set({ isDashboardOpen: false }),
  openDrawer: (content) => set({ isDrawerOpen: true, drawerContent: content }),
  updateDrawer: (patch) => set((state) => ({
    drawerContent: state.drawerContent ? { ...state.drawerContent, ...patch } : state.drawerContent,
  })),
  closeDrawer: () => set({ isDrawerOpen: false }),
  setOverrideZone: (zoneId) => set({ selectedOverrideZone: zoneId, isOverrideModeActive: Boolean(zoneId) }),
  setSplitScreen: (enabled) => set({ isSplitScreen: enabled }),
  setDetailedGrid: (enabled) => set({ detailedGrid: enabled }),
  setActiveMapLayer: (layer) => set({ activeMapLayer: layer }),
  setHighlightedZoneToken: (token) => set({ highlightedZoneToken: token }),
  toggle3D: () => set((state) => ({ is3DMode: !state.is3DMode })),
}))
