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
