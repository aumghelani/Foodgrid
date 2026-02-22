/**
 * build-mbta-stops.mjs
 *
 * Reads the MBTA GTFS stops.txt from the backend directory and writes a
 * compact JSON array to src/data/mbta_stops.json for use by MapView.
 *
 * Run before the Vite dev server or as a pre-build step:
 *   node scripts/build-mbta-stops.mjs
 *
 * Output shape:
 *   [ { stop_id, name, lat, lon, vehicle_type }, ... ]
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT      = path.resolve(__dirname, '..')
const STOPS_TXT = path.join(ROOT, 'backend', 'stops.txt')
const OUT_PATH  = path.join(ROOT, 'src', 'data', 'mbta_stops.json')

// Suffolk County / Boston metro bounding box
const LAT_MIN = 42.20, LAT_MAX = 42.45
const LON_MIN = -71.20, LON_MAX = -70.90

const VEHICLE_LABELS = { 0: 'light_rail', 1: 'subway', 2: 'commuter_rail', 3: 'bus', 4: 'ferry' }

if (!fs.existsSync(STOPS_TXT)) {
  console.error(`ERROR: ${STOPS_TXT} not found.`)
  process.exit(1)
}

const raw = fs.readFileSync(STOPS_TXT, 'utf8')
const lines = raw.trim().split('\n')
const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))

function col(row, name) {
  const idx = headers.indexOf(name)
  if (idx === -1) return ''
  const val = (row[idx] ?? '').trim().replace(/^"|"$/g, '')
  return val
}

// Only include rapid transit + light rail for map display (buses = too many)
const RAPID_TRANSIT_TYPES = new Set(['subway', 'light_rail'])

const stops = []

for (let i = 1; i < lines.length; i++) {
  // Simple CSV parse (no quoted commas in this GTFS file)
  const row = lines[i].split(',')
  const lat = parseFloat(col(row, 'stop_lat'))
  const lon = parseFloat(col(row, 'stop_lon'))
  if (isNaN(lat) || isNaN(lon)) continue
  if (lat < LAT_MIN || lat > LAT_MAX || lon < LON_MIN || lon > LON_MAX) continue

  // Skip parent station records (location_type = 1)
  const locType = col(row, 'location_type')
  if (locType !== '' && locType !== '0') continue

  const vt = parseInt(col(row, 'vehicle_type'), 10)
  const vehicleType = VEHICLE_LABELS[vt] ?? 'bus'

  // Only keep rapid transit stops for the map layer (reduces size from 555KB to ~15KB)
  if (!RAPID_TRANSIT_TYPES.has(vehicleType)) continue

  stops.push({
    stop_id:      col(row, 'stop_id'),
    name:         col(row, 'stop_name'),
    lat:          Math.round(lat * 1e6) / 1e6,
    lon:          Math.round(lon * 1e6) / 1e6,
    vehicle_type: vehicleType,
  })
}

fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true })
fs.writeFileSync(OUT_PATH, JSON.stringify(stops))

const sizeKb = Math.round(fs.statSync(OUT_PATH).size / 1024)
console.log(`Wrote ${stops.length} Boston-area MBTA stops to src/data/mbta_stops.json (${sizeKb} KB)`)
