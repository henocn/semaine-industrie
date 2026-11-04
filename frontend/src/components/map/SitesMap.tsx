import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { MapPoint } from '../../api/labels'

type Props = {
  points: MapPoint[]
  selectedId: string | null
  onSelect: (id: string) => void
  tall?: boolean
}

/* Emprise du Togo : la carte ne peut pas en sortir. */
const TOGO_BOUNDS = L.latLngBounds([6.1124, -0.1437], [11.1395, 1.8025])
const MAX_BOUNDS = TOGO_BOUNDS.pad(0.02)
/* Marge verticale plus grande : les sites de la côte ne passent pas sous les crédits. */
const FIT_PADDING: [number, number] = [10, 26]
const WORLD: L.LatLngTuple[] = [[-85, -180], [85, -180], [85, 180], [-85, 180]]
/* Niveau de zoom auquel le pays entier remplit la carte. */
const BASE_ZOOM = 8

/* Taille de tuile entière pour que le Togo remplisse la carte au niveau de base.
   Un zoom fractionnaire laisserait des filets blancs entre les tuiles. */
function fittingTileSize(el: HTMLElement) {
  const reference = L.CRS.EPSG3857
  const northWest = reference.latLngToPoint(TOGO_BOUNDS.getNorthWest(), BASE_ZOOM)
  const southEast = reference.latLngToPoint(TOGO_BOUNDS.getSouthEast(), BASE_ZOOM)
  const ratio = Math.min(
    (el.clientWidth - 2 * FIT_PADDING[0]) / (southEast.x - northWest.x),
    (el.clientHeight - 2 * FIT_PADDING[1]) / (southEast.y - northWest.y),
  )
  return Math.max(Math.floor(256 * ratio), 64)
}

/* Projection habituelle, à l'échelle de cette taille de tuile. */
function scaledCrs(tileSize: number): L.CRS {
  return L.Util.extend({}, L.CRS.EPSG3857, {
    scale: (zoom: number) => tileSize * 2 ** zoom,
    zoom: (scale: number) => Math.log2(scale / tileSize),
  })
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

/* Interdit de dézoomer au-delà du pays entier, selon la taille de la carte. */
function lockToTogo(map: L.Map) {
  map.invalidateSize()
  map.setMinZoom(map.getBoundsZoom(TOGO_BOUNDS, false, L.point(FIT_PADDING)))
}

/* Affiche le Togo en entier. */
function showTogo(map: L.Map) {
  lockToTogo(map)
  map.fitBounds(TOGO_BOUNDS, { padding: FIT_PADDING, animate: false })
}

/* Cache tout ce qui est hors du Togo et trace sa frontière. */
async function drawBorder(map: L.Map, isAlive: () => boolean) {
  const res = await fetch('/data/togo.geojson')
  if (!res.ok) throw new Error('Frontière indisponible')
  const shape = (await res.json()) as { coordinates: [number, number][][] }
  if (!isAlive()) return
  const ring = shape.coordinates[0].map(([lng, lat]): L.LatLngTuple => [lat, lng])
  /* Rendu large : le masque couvre aussi ce qui apparaît pendant un déplacement. */
  const renderer = L.svg({ padding: 1 })
  L.polygon([WORLD, ring], {
    renderer,
    stroke: false,
    fillColor: '#ffffff',
    fillOpacity: 1,
    interactive: false,
  }).addTo(map)
  L.polyline(ring, { renderer, color: '#024d3e', weight: 2, interactive: false }).addTo(map)
}

/* Carte Leaflet limitée au Togo : le reste du monde reste blanc. */
export function SitesMap({ points, selectedId, onSelect, tall }: Props) {
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

    const tileSize = fittingTileSize(containerRef.current)
    const map = L.map(containerRef.current, {
      crs: scaledCrs(tileSize),
      scrollWheelZoom: true,
      zoomControl: false,
      maxBounds: MAX_BOUNDS,
      maxBoundsViscosity: 1,
    }).fitBounds(TOGO_BOUNDS, { padding: FIT_PADDING, animate: false })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 18,
      tileSize,
      bounds: MAX_BOUNDS,
    }).addTo(map)

    /* En haut à droite : le coin libre, le nord-ouest du pays occupe celui de gauche. */
    L.control.zoom({ position: 'topright' }).addTo(map)

    layerRef.current = L.layerGroup().addTo(map)
    mapRef.current = map
    lockToTogo(map)

    drawBorder(map, () => mapRef.current === map).catch(() => {
      /* Sans le tracé, la carte reste utilisable et bornée au Togo. */
    })

    const onResize = () => lockToTogo(map)
    window.addEventListener('resize', onResize)

    return () => {
      window.removeEventListener('resize', onResize)
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

    requestAnimationFrame(() => {
      if (mapRef.current === map) showTogo(map)
    })
  }, [points])

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
