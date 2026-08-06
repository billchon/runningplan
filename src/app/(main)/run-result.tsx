import { NaverMapPolylineOverlay, NaverMapView } from '@mj-studio/react-native-naver-map';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { Coord } from '@/lib/geo';
import { computeCompletionRate, computeSegments, type RunSegment } from '@/lib/run-analysis';
import { supabase } from '@/lib/supabase';
import { useRunResultDraftStore } from '@/store/run-result-draft-store';

const SEOUL_CITY_HALL: Coord = { latitude: 37.5665, longitude: 126.978 };

const SEGMENT_COLORS: Record<RunSegment['speedCategory'], string> = {
  fast: '#2ecc71',
  normal: '#3c87f7',
  slow: '#e74c3c',
};

export default function RunResultScreen() {
  const { courseId, trackedPath, plannedPath, distanceMeters, durationSeconds, reset } =
    useRunResultDraftStore();

  const [segments, setSegments] = useState<RunSegment[]>([]);
  const [completionRate, setCompletionRate] = useState<number | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const hasSavedRef = useRef(false);

  useEffect(() => {
    if (hasSavedRef.current) return;
    hasSavedRef.current = true;

    const computedSegments = computeSegments(trackedPath);
    const rate = courseId ? computeCompletionRate(plannedPath, trackedPath) : null;
    setSegments(computedSegments);
    setCompletionRate(rate);

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setSaveError('로그인 정보를 확인할 수 없습니다.');
        return;
      }

      const { data: run, error: insertError } = await supabase
        .from('runs')
        .insert({
          user_id: user.id,
          course_id: courseId,
          distance_m: distanceMeters,
          duration_sec: durationSeconds,
          completion_rate: rate,
        })
        .select('id')
        .single();

      if (insertError || !run) {
        setSaveError(insertError?.message ?? '러닝 기록을 저장하지 못했습니다.');
        return;
      }

      if (computedSegments.length > 0) {
        await supabase.from('run_segments').insert(
          computedSegments.map((seg) => ({
            run_id: run.id,
            km_index: seg.kmIndex,
            pace: seg.paceMinPerKm,
            speed_category: seg.speedCategory,
          })),
        );
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once with whatever the draft store had at mount time
  }, []);

  const avgPaceLabel =
    distanceMeters > 0
      ? `${(durationSeconds / 60 / (distanceMeters / 1000)).toFixed(1)}'/km`
      : "--'--/km";
  const hours = String(Math.floor(durationSeconds / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((durationSeconds % 3600) / 60)).padStart(2, '0');
  const seconds = String(durationSeconds % 60).padStart(2, '0');

  const mapCenter = trackedPath[0] ?? plannedPath[0] ?? SEOUL_CITY_HALL;

  return (
    <Screen title="러닝 결과">
      <View style={styles.mapWrapper}>
        <NaverMapView
          style={styles.map}
          initialCamera={{ ...mapCenter, zoom: 16 }}
          isScrollGesturesEnabled={false}
          isZoomGesturesEnabled={false}
        >
          {plannedPath.length > 1 && (
            <NaverMapPolylineOverlay coords={plannedPath} color="#c0c0c0" width={4} />
          )}
          {segments.map((segment) => (
            <NaverMapPolylineOverlay
              key={segment.kmIndex}
              coords={segment.path}
              color={SEGMENT_COLORS[segment.speedCategory]}
              width={5}
            />
          ))}
        </NaverMapView>
      </View>

      {saveError && (
        <ThemedText type="small" style={styles.error}>
          {saveError}
        </ThemedText>
      )}

      <ThemedText>거리: {(distanceMeters / 1000).toFixed(2)} km</ThemedText>
      <ThemedText>
        시간: {hours}:{minutes}:{seconds}
      </ThemedText>
      <ThemedText>평균 페이스: {avgPaceLabel}</ThemedText>
      <ThemedText>완주율: {completionRate != null ? `${completionRate}%` : '자유 러닝'}</ThemedText>

      <View style={styles.legend}>
        <ThemedText type="small" themeColor="textSecondary">
          🟢 빠름 · 🔵 보통 · 🔴 느림 (1km 구간별)
        </ThemedText>
      </View>

      <Button
        label="홈으로"
        onPress={() => {
          reset();
          router.replace('/(main)/home');
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  mapWrapper: {
    height: 280,
    borderRadius: Spacing.three,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  error: {
    color: '#d64545',
  },
  legend: {
    marginTop: -Spacing.two,
  },
});
