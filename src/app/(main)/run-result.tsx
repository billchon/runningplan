import { NaverMapPolylineOverlay, NaverMapView } from '@mj-studio/react-native-naver-map';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { downsamplePath, isCircular, type Coord } from '@/lib/geo';
import { computeCompletionRate, computeSegments, type RunSegment } from '@/lib/run-analysis';
import { supabase } from '@/lib/supabase';
import { useRunResultDraftStore } from '@/store/run-result-draft-store';

const SEOUL_CITY_HALL: Coord = { latitude: 37.5665, longitude: 126.978 };

const SEGMENT_COLORS: Record<RunSegment['speedCategory'], string> = {
  fast: '#2ecc71',
  normal: '#3c87f7',
  slow: '#e74c3c',
};

const ratingCategories = ['경관', '안전', '평탄'] as const;
type RatingCategory = (typeof ratingCategories)[number];

export default function RunResultScreen() {
  const { courseId, trackedPath, plannedPath, distanceMeters, durationSeconds, reset } =
    useRunResultDraftStore();

  const [segments, setSegments] = useState<RunSegment[]>([]);
  const [completionRate, setCompletionRate] = useState<number | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [ratings, setRatings] = useState<Record<RatingCategory, number>>({
    경관: 0,
    안전: 0,
    평탄: 0,
  });
  const [activeCourseId, setActiveCourseId] = useState<string | null>(courseId);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isSavingFavorite, setIsSavingFavorite] = useState(false);
  const [favoriteError, setFavoriteError] = useState<string | null>(null);
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

      if (courseId) {
        const { data: course } = await supabase
          .from('courses')
          .select('is_favorite')
          .eq('id', courseId)
          .single();
        setIsFavorite(course?.is_favorite ?? false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once with whatever the draft store had at mount time
  }, []);

  const handleRate = async (category: RatingCategory, score: number) => {
    setRatings((prev) => ({ ...prev, [category]: score }));
    if (!activeCourseId) return;
    await supabase
      .from('course_ratings')
      .upsert({ course_id: activeCourseId, category, score }, { onConflict: 'course_id,category' });
  };

  // Favoriting a course-based run just flips a flag. Favoriting a free run has nothing to
  // flag yet - it turns the tracked path into a real, re-runnable course first (see PRD 4.4).
  const handleToggleFavorite = async () => {
    if (activeCourseId) {
      const next = !isFavorite;
      setIsFavorite(next);
      await supabase.from('courses').update({ is_favorite: next }).eq('id', activeCourseId);
      return;
    }

    setIsSavingFavorite(true);
    setFavoriteError(null);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setFavoriteError('로그인 정보를 확인할 수 없습니다.');
        return;
      }

      const waypoints = downsamplePath(trackedPath);
      if (waypoints.length < 2) {
        setFavoriteError('경로가 너무 짧아 코스로 저장할 수 없습니다.');
        return;
      }

      const { data: course, error: insertError } = await supabase
        .from('courses')
        .insert({
          user_id: user.id,
          distance_m: distanceMeters,
          avg_pace: distanceMeters > 0 ? durationSeconds / 60 / (distanceMeters / 1000) : null,
          is_circular: isCircular(waypoints[0], waypoints[waypoints.length - 1]),
          is_favorite: true,
          source: 'free_run',
        })
        .select('id')
        .single();

      if (insertError || !course) {
        setFavoriteError(insertError?.message ?? '코스를 저장하지 못했습니다.');
        return;
      }

      await supabase.from('course_waypoints').insert(
        waypoints.map((point, seq) => ({
          course_id: course.id,
          seq,
          lat: point.latitude,
          lng: point.longitude,
        })),
      );

      setActiveCourseId(course.id);
      setIsFavorite(true);
    } finally {
      setIsSavingFavorite(false);
    }
  };

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

      <Pressable onPress={handleToggleFavorite} disabled={isSavingFavorite} style={styles.favoriteRow}>
        <ThemedText>
          {isFavorite ? '★ 즐겨찾기 됨' : '☆ 즐겨찾기에 추가'}
          {!activeCourseId ? ' (이 경로를 코스로 저장)' : ''}
        </ThemedText>
      </Pressable>
      {isSavingFavorite && (
        <ThemedText type="small" themeColor="textSecondary">
          코스로 저장하는 중...
        </ThemedText>
      )}
      {favoriteError && (
        <ThemedText type="small" style={styles.error}>
          {favoriteError}
        </ThemedText>
      )}

      {activeCourseId && (
        <View style={styles.ratingRow}>
          <ThemedText type="small" themeColor="textSecondary">
            이 코스는 어땠나요?
          </ThemedText>
          {ratingCategories.map((category) => (
            <View key={category} style={styles.ratingLine}>
              <ThemedText type="small" themeColor="textSecondary" style={styles.ratingLabel}>
                {category}
              </ThemedText>
              {[1, 2, 3, 4, 5].map((score) => (
                <Pressable key={score} onPress={() => handleRate(category, score)} hitSlop={6}>
                  <ThemedText type="default">{score <= ratings[category] ? '★' : '☆'}</ThemedText>
                </Pressable>
              ))}
            </View>
          ))}
        </View>
      )}

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
  favoriteRow: {
    marginTop: -Spacing.two,
  },
  ratingRow: {
    gap: Spacing.one,
  },
  ratingLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  ratingLabel: {
    width: 40,
  },
});
