import { haversineMeters, type Coord } from '@/lib/geo';

export type SafetyPoiKind = 'bus_stop' | 'crossing';

export interface SafetyPoi {
  id: number;
  latitude: number;
  longitude: number;
  kind: SafetyPoiKind;
  name?: string;
  hasSignal?: boolean;
}

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const BBOX_PADDING_DEG = 0.003;
const NEAR_PATH_METERS = 60;

function boundingBox(path: Coord[]) {
  const lats = path.map((p) => p.latitude);
  const lngs = path.map((p) => p.longitude);
  return {
    south: Math.min(...lats) - BBOX_PADDING_DEG,
    west: Math.min(...lngs) - BBOX_PADDING_DEG,
    north: Math.max(...lats) + BBOX_PADDING_DEG,
    east: Math.max(...lngs) + BBOX_PADDING_DEG,
  };
}

// Buses stops + crosswalks (with traffic-signal info) from OpenStreetMap via the free,
// keyless Overpass API - see PRD 4.3. data.go.kr's equivalent standard datasets turned out
// to be unusable (coordinates stripped from the restroom/rail APIs, no working parking API,
// the crosswalk dataset only has 시도/시군구-level data with no coordinates at all), so OSM
// is the actual data source for both categories, not just crosswalks.
export async function fetchSafetyConvenienceInfo(path: Coord[]): Promise<SafetyPoi[]> {
  if (path.length === 0) return [];

  const { south, west, north, east } = boundingBox(path);
  const bbox = `${south},${west},${north},${east}`;
  const query = `[out:json][timeout:25];(node["highway"="bus_stop"](${bbox});node["highway"="crossing"](${bbox}););out body;`;

  const response = await fetch(OVERPASS_URL, {
    method: 'POST',
    // Overpass's server blocks requests carrying Android's default OkHttp User-Agent
    // (returns 406) - a distinct one is required.
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'RunningCourseBuilderApp/1.0 (+https://github.com/billchon/runningplan)',
    },
    body: `data=${encodeURIComponent(query)}`,
  });
  if (!response.ok) {
    throw new Error(`안전·편의정보 조회 실패 (${response.status})`);
  }

  const data = await response.json();
  const elements: any[] = data.elements ?? [];

  const pois: SafetyPoi[] = elements
    .filter((el) => el.type === 'node')
    .map((el) => {
      const tags = el.tags ?? {};
      const kind: SafetyPoiKind = tags.highway === 'bus_stop' ? 'bus_stop' : 'crossing';
      return {
        id: el.id,
        latitude: el.lat,
        longitude: el.lon,
        kind,
        name: tags.name,
        hasSignal: kind === 'crossing' ? tags.crossing === 'traffic_signals' : undefined,
      };
    });

  // The bbox is a loose rectangle around a possibly-winding path; only keep POIs actually
  // near the route itself.
  return pois.filter((poi) => path.some((point) => haversineMeters(poi, point) <= NEAR_PATH_METERS));
}
