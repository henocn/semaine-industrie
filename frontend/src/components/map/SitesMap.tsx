import { useEffect, useRef } from 'react'
import L from 'leaflet'
import type { MapPoint } from '../../api/labels'
import { createTogoMap, showArea, showTogo } from './togoMap'

type Props = {
  points: MapPoint[]
  selectedId: string | null
  onSelect: (id: string) => void
  tall?: boolean
  /* Cadre les sites (le sud du pays) au lieu du Togo entier. */
  focusPoints?: boolean
}

/* Marqueur circulaire brand. */
function makeIcon(active: boolean, hasVisits: boolean) {
  const fill = active ? '#f6c800' : hasVisits ? '#00a85a' : '#024d3e'
  return L.divIcon({
    className: '',
    html: `<span style="display:block;width:14px;height:14px;border-radius:999px;background:${fill};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35)"></span>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  })
}

/* Carte des sites, limitée au Togo. */
export function SitesMap({ points, selectedId, onSelect, tall, focusPoints }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const layerRef = useRef<L.LayerGroup | null>(null)
  const markersRef = useRef<Map<string, L.Marker>>(new Map())
  const selectedRef = useRef(selectedId)
  const onSelectRef = useRef(onSelect)
  selectedRef.current = selectedId
  onSelectRef.current = onSelect

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = createTogoMap(containerRef.current)
    layerRef.current = L.layerGroup().addTo(map)
    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
      layerRef.current = null
      markersRef.current.clear()
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const layer = layerRef.current
    if (!map || !layer) return

    layer.clearLayers()
    markersRef.current.clear()

    for (const p of points) {
      const lat = Number(p.lat)
      const lng = Number(p.lng)
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue

      const hasVisits = (p.visits?.groups ?? 0) > 0
      const marker = L.marker([lat, lng], {
        icon: makeIcon(p.id === selectedRef.current, hasVisits),
        title: p.name,
        alt: p.name,
      }).on('click', () => onSelectRef.current(p.id))

      marker.addTo(layer)
      markersRef.current.set(p.id, marker)
    }

    const placed = Array.from(markersRef.current.values(), (m) => m.getLatLng())
    requestAnimationFrame(() => {
      if (mapRef.current !== map) return
      if (focusPoints && placed.length) showArea(map, L.latLngBounds(placed).pad(0.25))
      else showTogo(map)
    })
  }, [points, focusPoints])

  useEffect(() => {
    const map = mapRef.current
    for (const [id, marker] of markersRef.current) {
      const p = points.find((x) => x.id === id)
      const hasVisits = (p?.visits?.groups ?? 0) > 0
      const active = id === selectedId
      marker.setIcon(makeIcon(active, hasVisits))
      marker.setZIndexOffset(active ? 1000 : 0)
      /* Le pays entier tient à l'écran : on ne recentre que si l'on a zoomé. */
      if (active && map && map.getZoom() > map.getMinZoom()) {
        map.panTo(marker.getLatLng(), { animate: true })
      }
    }
  }, [selectedId, points])

  return (
    <div
      className={
        tall
          ? 'relative h-full min-h-[360px] w-full overflow-hidden bg-white'
          : 'relative aspect-[5/12] overflow-hidden bg-white'
      }
    >
      <div ref={containerRef} className="absolute inset-0 z-0 h-full w-full" style={{ background: '#fff' }} />
      {points.length === 0 && (
        <p className="pointer-events-none absolute inset-0 z-10 grid place-items-center bg-white/70 px-4 text-center text-ink/50">
          Aucun site avec position pour l’instant
        </p>
      )}
    </div>
  )
}
