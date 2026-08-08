export interface RunRecord {
  distanceMeters: number;
  durationSeconds: number;
  createdAt: string;
}

export interface WeeklyStat {
  label: string;
  maxDistanceKm: number;
  avgDistanceKm: number;
  avgPaceMinPerKm: number | null;
}

function mondayOf(date: Date): Date {
  const day = date.getDay();
  const diffToMonday = day === 0 ? 6 : day - 1;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - diffToMonday);
}

// Buckets runs into weeks (Monday-start), oldest to newest. Weekly granularity + an 8-week
// window are a reasonable default for PRD 4.5's open "집계 주기/표시 기간" question, given
// this is a personal-scale app where monthly buckets would be too coarse to show trends.
export function computeWeeklyStats(runs: RunRecord[], weeksCount = 8): WeeklyStat[] {
  const thisMonday = mondayOf(new Date());
  const buckets: { start: Date; end: Date; label: string }[] = [];
  for (let i = weeksCount - 1; i >= 0; i--) {
    const start = new Date(thisMonday);
    start.setDate(start.getDate() - i * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    buckets.push({ start, end, label: `${start.getMonth() + 1}/${start.getDate()}` });
  }

  return buckets.map(({ start, end, label }) => {
    const weekRuns = runs.filter((r) => {
      const t = new Date(r.createdAt);
      return t >= start && t < end;
    });
    if (weekRuns.length === 0) {
      return { label, maxDistanceKm: 0, avgDistanceKm: 0, avgPaceMinPerKm: null };
    }

    const distancesKm = weekRuns.map((r) => r.distanceMeters / 1000);
    const totalDistanceKm = distancesKm.reduce((a, b) => a + b, 0);
    const totalDurationMin = weekRuns.reduce((a, r) => a + r.durationSeconds, 0) / 60;

    return {
      label,
      maxDistanceKm: Math.max(...distancesKm),
      avgDistanceKm: totalDistanceKm / distancesKm.length,
      avgPaceMinPerKm: totalDistanceKm > 0 ? totalDurationMin / totalDistanceKm : null,
    };
  });
}
