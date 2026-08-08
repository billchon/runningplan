import { useEffect, useState } from 'react';

import { WeeklyBarChart } from '@/components/weekly-bar-chart';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { computeWeeklyStats, type WeeklyStat } from '@/lib/growth-stats';
import { supabase } from '@/lib/supabase';

function formatPace(minutesPerKm: number) {
  const whole = Math.floor(minutesPerKm);
  const seconds = Math.round((minutesPerKm - whole) * 60);
  return `${whole}'${String(seconds).padStart(2, '0')}"`;
}

export default function GrowthReportScreen() {
  const [stats, setStats] = useState<WeeklyStat[] | null>(null);

  useEffect(() => {
    supabase
      .from('runs')
      .select('distance_m, duration_sec, created_at')
      .then(({ data }) => {
        const runs = (data ?? []).map((row) => ({
          distanceMeters: row.distance_m,
          durationSeconds: row.duration_sec,
          createdAt: row.created_at,
        }));
        setStats(computeWeeklyStats(runs));
      });
  }, []);

  const labels = stats?.map((s) => s.label) ?? [];

  return (
    <Screen title="성장 리포트">
      {!stats && <ThemedText themeColor="textSecondary">불러오는 중...</ThemedText>}

      {stats && (
        <>
          <ThemedText type="subtitle">최장 거리 추이</ThemedText>
          <WeeklyBarChart
            labels={labels}
            values={stats.map((s) => (s.maxDistanceKm > 0 ? s.maxDistanceKm : null))}
            formatValue={(v) => `${v.toFixed(1)}`}
          />

          <ThemedText type="subtitle">평균 거리 추이</ThemedText>
          <WeeklyBarChart
            labels={labels}
            values={stats.map((s) => (s.avgDistanceKm > 0 ? s.avgDistanceKm : null))}
            formatValue={(v) => `${v.toFixed(1)}`}
          />

          <ThemedText type="subtitle">평균 페이스 추이</ThemedText>
          <WeeklyBarChart
            labels={labels}
            values={stats.map((s) => s.avgPaceMinPerKm)}
            formatValue={formatPace}
          />
        </>
      )}
    </Screen>
  );
}
