import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

const SPEED_LABEL: Record<string, string> = { fast: '빠름', normal: '보통', slow: '느림' };

interface RunSegmentRow {
  km_index: number;
  pace: number | null;
  speed_category: string | null;
}

interface RunRow {
  id: string;
  courseName: string;
  distanceMeters: number;
  durationSeconds: number;
  completionRate: number | null;
  createdAt: string;
  segments: RunSegmentRow[];
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatDuration(seconds: number) {
  const minutes = String(Math.floor(seconds / 60)).padStart(2, '0');
  const secs = String(seconds % 60).padStart(2, '0');
  return `${minutes}:${secs}`;
}

export default function RunHistoryScreen() {
  const [runs, setRuns] = useState<RunRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    supabase
      .from('runs')
      .select('id, distance_m, duration_sec, completion_rate, created_at, courses(name), run_segments(km_index, pace, speed_category)')
      .order('created_at', { ascending: false })
      .then(({ data, error: fetchError }) => {
        if (fetchError) {
          setError(fetchError.message);
          return;
        }
        setRuns(
          (data ?? []).map((row: any) => ({
            id: row.id,
            courseName: row.courses?.name || (row.courses ? '이름 없는 코스' : '자유 러닝'),
            distanceMeters: row.distance_m,
            durationSeconds: row.duration_sec,
            completionRate: row.completion_rate,
            createdAt: row.created_at,
            segments: (row.run_segments ?? []).sort((a: RunSegmentRow, b: RunSegmentRow) => a.km_index - b.km_index),
          })),
        );
      });
  };

  useEffect(load, []);

  const handleDelete = async (id: string) => {
    setRuns((prev) => prev?.filter((r) => r.id !== id) ?? null);
    await supabase.from('runs').delete().eq('id', id);
  };

  return (
    <Screen title="러닝 기록">
      {!runs && !error && <ThemedText themeColor="textSecondary">불러오는 중...</ThemedText>}
      {error && (
        <ThemedText type="small" style={styles.error}>
          {error}
        </ThemedText>
      )}
      {runs && runs.length === 0 && (
        <ThemedText themeColor="textSecondary">아직 러닝 기록이 없습니다.</ThemedText>
      )}

      {runs?.map((run) => {
        const avgPaceLabel =
          run.distanceMeters > 0
            ? `${(run.durationSeconds / 60 / (run.distanceMeters / 1000)).toFixed(1)}'/km`
            : "--'--/km";

        return (
          <ThemedView key={run.id} type="backgroundElement" style={styles.row}>
            <ThemedText type="smallBold">
              {run.courseName} · {formatDate(run.createdAt)}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {(run.distanceMeters / 1000).toFixed(2)}km · {formatDuration(run.durationSeconds)} · 평균 페이스{' '}
              {avgPaceLabel}
              {run.completionRate != null ? ` · 완주율 ${run.completionRate}%` : ''}
            </ThemedText>

            {run.segments.length > 0 && (
              <ThemedText type="small" themeColor="textSecondary">
                구간:{' '}
                {run.segments
                  .map(
                    (seg) =>
                      `${seg.km_index + 1}km ${SPEED_LABEL[seg.speed_category ?? ''] ?? '-'}`,
                  )
                  .join(' · ')}
              </ThemedText>
            )}

            <Button label="삭제" variant="secondary" onPress={() => handleDelete(run.id)} />
          </ThemedView>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  error: {
    color: '#d64545',
  },
});
