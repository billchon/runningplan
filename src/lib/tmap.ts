interface Coord {
  latitude: number;
  longitude: number;
}

export interface TurnPoint extends Coord {
  description: string;
}

export interface PedestrianRoute {
  path: Coord[];
  turnPoints: TurnPoint[];
  distanceMeters: number;
  durationSeconds: number;
}

const TMAP_PEDESTRIAN_URL = 'https://apis.openapi.sk.com/tmap/routes/pedestrian?version=1';

// TODO: user needs to issue a free appKey at https://openapi.sk.com (T map > 보행자 경로안내)
// and put it in .env as EXPO_PUBLIC_TMAP_APP_KEY (see PRD 6, 7).
export async function fetchPedestrianRoute(waypoints: Coord[]): Promise<PedestrianRoute> {
  const appKey = process.env.EXPO_PUBLIC_TMAP_APP_KEY;
  if (!appKey) {
    throw new Error('TMAP_APP_KEY가 설정되지 않았습니다. .env를 확인해주세요.');
  }
  if (waypoints.length < 2) {
    throw new Error('경로를 계산하려면 최소 2개의 지점이 필요합니다.');
  }

  const start = waypoints[0];
  const end = waypoints[waypoints.length - 1];
  const via = waypoints.slice(1, -1);

  const body: Record<string, string> = {
    startX: String(start.longitude),
    startY: String(start.latitude),
    endX: String(end.longitude),
    endY: String(end.latitude),
    reqCoordType: 'WGS84GEO',
    resCoordType: 'WGS84GEO',
    startName: '출발',
    endName: '도착',
  };
  if (via.length > 0) {
    body.passList = via.map((point) => `${point.longitude},${point.latitude}`).join('_');
  }

  const response = await fetch(TMAP_PEDESTRIAN_URL, {
    method: 'POST',
    headers: {
      appKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Tmap 경로 계산 실패 (${response.status}): ${message}`);
  }

  const geoJson = await response.json();
  const features: any[] = geoJson.features ?? [];

  const path: Coord[] = [];
  const turnPoints: TurnPoint[] = [];
  for (const feature of features) {
    if (feature.geometry?.type === 'LineString') {
      for (const [longitude, latitude] of feature.geometry.coordinates) {
        path.push({ latitude, longitude });
      }
    } else if (feature.geometry?.type === 'Point') {
      const description: string | undefined = feature.properties?.description;
      if (!description) continue;
      const [longitude, latitude] = feature.geometry.coordinates;
      turnPoints.push({ latitude, longitude, description });
    }
  }

  const summary = features[0]?.properties ?? {};
  return {
    path,
    turnPoints,
    distanceMeters: Number(summary.totalDistance ?? 0),
    durationSeconds: Number(summary.totalTime ?? 0),
  };
}

const TMAP_REVERSE_GEOCODING_URL = 'https://apis.openapi.sk.com/tmap/geo/reversegeocoding';

// Best-effort: 행정동 + 주변 건물명 (see PRD 4.2). Returns null instead of throwing so a
// geocoding hiccup never blocks saving the course itself.
export async function reverseGeocode(point: Coord): Promise<string | null> {
  const appKey = process.env.EXPO_PUBLIC_TMAP_APP_KEY;
  if (!appKey) return null;

  const params = new URLSearchParams({
    version: '1',
    lat: String(point.latitude),
    lon: String(point.longitude),
    coordType: 'WGS84GEO',
    addressType: 'A10',
  });

  try {
    const response = await fetch(`${TMAP_REVERSE_GEOCODING_URL}?${params.toString()}`, {
      headers: { appKey, Accept: 'application/json' },
    });
    if (!response.ok) return null;

    const data = await response.json();
    const info = data.addressInfo;
    if (!info) return null;

    const dong = info.legalDong || info.adminDong || '';
    const building = info.buildingName ? ` (${info.buildingName})` : '';
    const label = `${[info.city_do, info.gu_gun, dong].filter(Boolean).join(' ')}${building}`.trim();
    return label || null;
  } catch {
    return null;
  }
}
