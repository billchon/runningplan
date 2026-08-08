export interface Coord {
  latitude: number;
  longitude: number;
}

export interface TimedCoord extends Coord {
  timestamp: number;
}

const EARTH_RADIUS_METERS = 6_371_000;

export function haversineMeters(a: Coord, b: Coord): number {
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLng = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;

  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(h));
}

export function pathDistanceMeters(path: Coord[]): number {
  let total = 0;
  for (let i = 1; i < path.length; i++) {
    total += haversineMeters(path[i - 1], path[i]);
  }
  return total;
}

// Slices a path into consecutive ~segmentMeters chunks, purely by distance (no timing) - used
// to show 1km markers on a planned route before it's been run (see PRD 4.2).
export function splitPathByDistance(path: Coord[], segmentMeters = 1000): Coord[][] {
  if (path.length < 2) return [];

  const segments: Coord[][] = [];
  let current: Coord[] = [path[0]];
  let segDistance = 0;

  for (let i = 1; i < path.length; i++) {
    segDistance += haversineMeters(path[i - 1], path[i]);
    current.push(path[i]);
    if (segDistance >= segmentMeters) {
      segments.push(current);
      current = [path[i]];
      segDistance = 0;
    }
  }
  if (current.length > 1) segments.push(current);

  return segments;
}
