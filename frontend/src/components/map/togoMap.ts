import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

/* Emprise du Togo : la carte ne peut pas en sortir. */
const TOGO_BOUNDS = L.latLngBounds([6.1124, -0.1437], [11.1395, 1.8025])
const MAX_BOUNDS = TOGO_BOUNDS.pad(0.02)
/* Marge verticale plus grande : les sites de la côte ne passent pas sous les crédits. */
const FIT_PADDING: [number, number] = [10, 26]
const WORLD: L.LatLngTuple[] = [[-85, -180], [85, -180], [85, 180], [-85, 180]]
/* Niveau de zoom auquel le pays entier remplit la carte. */
const BASE_ZOOM = 8
const DEFAULT_TILE_SIZE = 190

let ringPromise: Promise<L.LatLngTuple[]> | null = null

/* Charge une seule fois le tracé de la frontière. */
function loadRing() {
  if (!ringPromise) {
    ringPromise = fetch('/data/togo.geojson')
      .then((res) => {
        if (!res.ok) throw new Error('Frontière indisponible')
        return res.json() as Promise<{ coordinates: [number, number][][] }>
      })
      .then((shape) => shape.coordinates[0].map(([lng, lat]): L.LatLngTuple => [lat, lng]))
      .catch((err) => {
        ringPromise = null
        throw err
      })
  }
  return ringPromise
}

/* Taille de tuile entière pour que le Togo remplisse la carte au niveau de base.
   Un zoom fractionnaire laisserait des filets blancs entre les tuiles. */
function fittingTileSize(el: HTMLElement) {
  if (!el.clientWidth || !el.clientHeight) return DEFAULT_TILE_SIZE
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

/* Interdit de dézoomer au-delà du pays entier, selon la taille de la carte. */
function lockToTogo(map: L.Map) {
  map.invalidateSize()
  map.setMinZoom(map.getBoundsZoom(TOGO_BOUNDS, false, L.point(FIT_PADDING)))
}

/* Affiche le Togo en entier. */
export function showTogo(map: L.Map) {
  lockToTogo(map)
  map.fitBounds(TOGO_BOUNDS, { padding: FIT_PADDING, animate: false })
}

/* Cache tout ce qui est hors du Togo et trace sa frontière. */
function drawBorder(map: L.Map, ring: L.LatLngTuple[]) {
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

/* Crée une carte limitée au Togo : le reste du monde reste blanc. */
export function createTogoMap(el: HTMLElement) {
  const tileSize = fittingTileSize(el)
  const map = L.map(el, {
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
  lockToTogo(map)

  let alive = true
  const onResize = () => lockToTogo(map)
  window.addEventListener('resize', onResize)
  map.on('unload', () => {
    alive = false
    window.removeEventListener('resize', onResize)
  })

  loadRing()
    .then((ring) => {
      if (alive) drawBorder(map, ring)
    })
    .catch(() => {
      /* Sans le tracé, la carte reste utilisable et bornée au Togo. */
    })

  return map
}
