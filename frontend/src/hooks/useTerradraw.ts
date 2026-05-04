import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import {
  TerraDraw,
  TerraDrawMapLibreGLAdapter,
  TerraDrawPolygonMode,
  TerraDrawLineStringMode,
  TerraDrawSelectMode,
  TerraDrawPointMode,
} from 'terra-draw'

export type DrawMode = 'polygon' | 'linestring' | 'point' | 'select' | 'static'

interface Options {
  onFeatureComplete?: (feature: GeoJSON.Feature) => void
  mode: DrawMode
}

export function useTerradraw(map: maplibregl.Map | null, { onFeatureComplete, mode }: Options) {
  const drawRef = useRef<TerraDraw | null>(null)

  useEffect(() => {
    if (!map) return

    const adapter = new TerraDrawMapLibreGLAdapter({ map })

    drawRef.current = new TerraDraw({
      adapter,
      modes: [
        new TerraDrawPolygonMode(),
        new TerraDrawLineStringMode(),
        new TerraDrawPointMode(),
        new TerraDrawSelectMode({
          flags: {
            polygon: { feature: { draggable: true, rotateable: false, scaleable: false, coordinates: { midpoints: true, draggable: true, deletable: true } } },
            linestring: { feature: { draggable: true } },
          },
        }),
      ],
    })

    drawRef.current.start()

    drawRef.current.on('finish', (id) => {
      if (!onFeatureComplete || !drawRef.current) return
      const snapshot = drawRef.current.getSnapshot()
      const feature = snapshot.find((f) => f.id === id)
      if (feature) onFeatureComplete(feature as GeoJSON.Feature)
    })

    return () => {
      drawRef.current?.stop()
      drawRef.current = null
    }
  }, [map])

  // Switch mode when the prop changes
  useEffect(() => {
    if (!drawRef.current) return
    drawRef.current.setMode(mode)
  }, [mode])

  return drawRef
}
