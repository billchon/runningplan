import { haversineMeters, type Coord } from '@/lib/geo';

export type SafetyPoiKind = 'bus_stop' | 'crossing' | 'subway';

export interface SafetyPoi {
  id: number;
  latitude: number;
  longitude: number;
  kind: SafetyPoiKind;
  name?: string;
  hasSignal?: boolean;
  stopRef?: string;
  routeRefs?: string[];
  subwayLines?: string[];
}

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
// Must comfortably cover the widest per-kind radius below (subway, 400m) - the fetch bbox
// is only a coarse pre-filter, the real cutoff is NEAR_PATH_METERS per kind after fetch.
const BBOX_PADDING_DEG = 0.005;
// Subway stations are far sparser than bus stops, so they need a much wider "near the route"
// radius or they'd almost never show up on a running course.
const NEAR_PATH_METERS: Record<SafetyPoiKind, number> = {
  bus_stop: 60,
  crossing: 60,
  subway: 400,
};
// Radius for the follow-up "which line(s) serve this station" lookup - station nodes don't
// carry their own line/호선 number, only the route relations do. A physical subway line's
// track passes essentially through its own stations, so a tight radius reliably attributes
// the right line(s) without picking up unrelated lines elsewhere in the city.
const SUBWAY_LINE_RADIUS_METERS = 150;

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

async function overpassFetch(query: string) {
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
  return response.json();
}

// Best-effort: which subway line(s) (호선) pass through this station. Failure here shouldn't
// break the rest of the safety layer, so callers should treat a thrown/empty result as "unknown".
async function fetchSubwayLines(station: Coord): Promise<string[]> {
  const query = `[out:json][timeout:15];rel["route"="subway"](around:${SUBWAY_LINE_RADIUS_METERS},${station.latitude},${station.longitude});out tags;`;
  const data = await overpassFetch(query);
  const refs: string[] = (data.elements ?? [])
    .map((el: any) => el.tags?.ref)
    .filter((ref: unknown): ref is string => typeof ref === 'string' && ref.length > 0);
  const unique: string[] = [...new Set(refs)];
  return unique.sort();
}

// Bus stops, crosswalks (with traffic-signal info), and subway stations from OpenStreetMap
// via the free, keyless Overpass API - see PRD 4.3. data.go.kr's equivalent standard datasets
// turned out to be unusable (coordinates stripped from the restroom/rail APIs, no working
// parking API, the crosswalk dataset only has 시도/시군구-level data with no coordinates at
// all), so OSM is the actual data source for all three categories. (Parking lots were tried
// too, but OSM's Korean parking-lot data is almost always untagged beyond "this is a parking
// lot" - no name/fee/capacity - so a pin with no useful info wasn't worth showing.)
export async function fetchSafetyConvenienceInfo(path: Coord[]): Promise<SafetyPoi[]> {
  if (path.length === 0) return [];

  const { south, west, north, east } = boundingBox(path);
  const bbox = `${south},${west},${north},${east}`;
  const query = `[out:json][timeout:25];(node["highway"="bus_stop"](${bbox});node["highway"="crossing"](${bbox});node["railway"="station"]["station"="subway"](${bbox}););out body;`;

  const data = await overpassFetch(query);
  const elements: any[] = data.elements ?? [];

  function poiKind(tags: Record<string, string>): SafetyPoiKind {
    if (tags.highway === 'bus_stop') return 'bus_stop';
    if (tags.railway === 'station' && tags.station === 'subway') return 'subway';
    return 'crossing';
  }

  const pois: SafetyPoi[] = elements
    .filter((el) => el.type === 'node')
    .map((el) => {
      const tags = el.tags ?? {};
      const kind = poiKind(tags);
      const isBusStop = kind === 'bus_stop';
      return {
        id: el.id,
        latitude: el.lat,
        longitude: el.lon,
        kind,
        name: tags.name,
        hasSignal: kind === 'crossing' ? tags.crossing === 'traffic_signals' : undefined,
        stopRef: isBusStop ? tags.ref : undefined,
        routeRefs: isBusStop && tags.route_ref
          ? tags.route_ref
              .split(';')
              .map((ref: string) => ref.trim())
              .filter(Boolean)
          : undefined,
      };
    });

  // The bbox is a loose rectangle around a possibly-winding path; only keep POIs actually
  // near the route itself, using a per-kind radius (see NEAR_PATH_METERS).
  const nearby = pois.filter((poi) =>
    path.some((point) => haversineMeters(poi, point) <= NEAR_PATH_METERS[poi.kind]),
  );

  return Promise.all(
    nearby.map(async (poi) => {
      if (poi.kind !== 'subway') return poi;
      try {
        const subwayLines = await fetchSubwayLines(poi);
        return { ...poi, subwayLines };
      } catch {
        return poi;
      }
    }),
  );
}
