import { haversineMeters, type Coord, type TimedCoord } from '@/lib/geo';

export type SpeedCategory = 'fast' | 'normal' | 'slow';

export interface RunSegment {
  kmIndex: number;
  path: Coord[];
  paceMinPerKm: number;
  speedCategory: SpeedCategory;
}

// Splits the tracked path into ~1km segments and buckets each into fast/normal/slow relative
// to the run's overall average pace (see PRD 4.4).
export function computeSegments(path: TimedCoord[]): RunSegment[] {
  if (path.length < 2) return [];

  const totalDistance = path.reduce((sum, point, i) => (i === 0 ? 0 : sum + haversineMeters(path[i - 1], point)), 0);
  const totalDurationSeconds = (path[path.length - 1].timestamp - path[0].timestamp) / 1000;
  if (totalDistance <= 0 || totalDurationSeconds <= 0) return [];
  const avgPace = totalDurationSeconds / 60 / (totalDistance / 1000);

  const segments: RunSegment[] = [];
  let segDistance = 0;
  let segDurationSeconds = 0;
  let segPoints: Coord[] = [path[0]];
  let kmIndex = 0;

  for (let i = 1; i < path.length; i++) {
    segDistance += haversineMeters(path[i - 1], path[i]);
    segDurationSeconds += (path[i].timestamp - path[i - 1].timestamp) / 1000;
    segPoints.push(path[i]);

    const isLastPoint = i === path.length - 1;
    if (segDistance >= 1000 || isLastPoint) {
      const paceMinPerKm =
        segDistance > 0 ? segDurationSeconds / 60 / (segDistance / 1000) : avgPace;
      segments.push({
        kmIndex,
        path: segPoints,
        paceMinPerKm,
        speedCategory:
          paceMinPerKm < avgPace * 0.9 ? 'fast' : paceMinPerKm > avgPace * 1.1 ? 'slow' : 'normal',
      });
      kmIndex++;
      segDistance = 0;
      segDurationSeconds = 0;
      segPoints = [path[i]];
    }
  }

  return segments;
}

// % of the planned route the runner actually came within `thresholdMeters` of, sampled every
// ~20m along the plan. GPS noise tolerance per PRD 7's open issue on completion-rate accuracy.
export function computeCompletionRate(
  plannedPath: Coord[],
  trackedPath: Coord[],
  thresholdMeters = 30,
): number | null {
  if (plannedPath.length < 2 || trackedPath.length < 2) return null;

  const samples: Coord[] = [plannedPath[0]];
  let carry = 0;
  for (let i = 1; i < plannedPath.length; i++) {
    carry += haversineMeters(plannedPath[i - 1], plannedPath[i]);
    while (carry >= 20) {
      samples.push(plannedPath[i]);
      carry -= 20;
    }
  }

  let covered = 0;
  for (const sample of samples) {
    const isCovered = trackedPath.some((point) => haversineMeters(sample, point) < thresholdMeters);
    if (isCovered) covered++;
  }

  return Math.round((covered / samples.length) * 100);
}
