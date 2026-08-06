import { NaverMapMarkerOverlay, NaverMapPolylineOverlay, NaverMapView } from '@mj-studio/react-native-naver-map';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';
import { reverseGeocode } from '@/lib/tmap';
import { useCourseDraftStore } from '@/store/course-draft-store';

const ratingCategories = ['경관', '안전', '평탄'] as const;
type RatingCategory = (typeof ratingCategories)[number];

// A course is "circular" if its start and end are within ~30m of each other.
function isCircular(start: { latitude: number; longitude: number }, end: { latitude: number; longitude: number }) {
  const dLat = start.latitude - end.latitude;
  const dLng = start.longitude - end.longitude;
  const roughMeters = Math.sqrt(dLat ** 2 + dLng ** 2) * 111_000;
  return roughMeters < 30;
}

export default function CourseInfoScreen() {
  const theme = useTheme();
  const { waypoints, path, distanceMeters, durationSeconds, reset } = useCourseDraftStore();

  const [courseId, setCourseId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [memo, setMemo] = useState('');
  const [ratings, setRatings] = useState<Record<RatingCategory, number>>({
    경관: 0,
    안전: 0,
    평탄: 0,
  });
  const [locationLabel, setLocationLabel] = useState('위치 태그 확인 중...');
  const [error, setError] = useState<string | null>(null);
  const isFirstRender = useRef(true);

  // Create the course row (+ waypoints) once, from whatever course-builder handed off.
  useEffect(() => {
    if (waypoints.length < 2) return;

    let cancelled = false;

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) setError('로그인 정보를 확인할 수 없습니다.');
        return;
      }

      const start = waypoints[0];
      const end = waypoints[waypoints.length - 1];
      const avgPace =
        distanceMeters && durationSeconds ? durationSeconds / 60 / (distanceMeters / 1000) : null;

      const { data: course, error: insertError } = await supabase
        .from('courses')
        .insert({
          user_id: user.id,
          distance_m: distanceMeters ?? 0,
          avg_pace: avgPace,
          is_circular: isCircular(start, end),
        })
        .select('id')
        .single();

      if (cancelled) return;
      if (insertError || !course) {
        setError(insertError?.message ?? '코스를 저장하지 못했습니다.');
        return;
      }

      setCourseId(course.id);

      await supabase.from('course_waypoints').insert(
        waypoints.map((point, seq) => ({
          course_id: course.id,
          seq,
          lat: point.latitude,
          lng: point.longitude,
        })),
      );

      const [startLabel, endLabel] = await Promise.all([
        reverseGeocode(start),
        reverseGeocode(end),
      ]);
      if (cancelled) return;

      const tagRows = [];
      if (startLabel) tagRows.push({ course_id: course.id, tag_type: 'start', region_name: startLabel });
      if (endLabel && !isCircular(start, end)) {
        tagRows.push({ course_id: course.id, tag_type: 'finish', region_name: endLabel });
      }
      if (tagRows.length > 0) {
        await supabase.from('course_location_tags').insert(tagRows);
      }

      if (isCircular(start, end)) {
        setLocationLabel(startLabel ? `${startLabel} · 순환` : '위치 태그를 확인하지 못했습니다');
      } else {
        setLocationLabel(
          [startLabel, endLabel].filter(Boolean).join(' → ') || '위치 태그를 확인하지 못했습니다',
        );
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only run once per draft, not on every distance/duration recompute
  }, []);

  // Debounce-save name/memo edits once the course row exists.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (!courseId) return;

    const timeout = setTimeout(() => {
      supabase.from('courses').update({ name, memo }).eq('id', courseId);
    }, 800);

    return () => clearTimeout(timeout);
  }, [name, memo, courseId]);

  const handleRate = async (category: RatingCategory, score: number) => {
    setRatings((prev) => ({ ...prev, [category]: score }));
    if (!courseId) return;
    await supabase
      .from('course_ratings')
      .upsert({ course_id: courseId, category, score }, { onConflict: 'course_id,category' });
  };

  const avgPaceLabel =
    distanceMeters && durationSeconds
      ? `${(durationSeconds / 60 / (distanceMeters / 1000)).toFixed(1)}'/km`
      : "--'-- /km";

  if (waypoints.length < 2) {
    return (
      <Screen title="코스 정보">
        <ThemedText themeColor="textSecondary">
          먼저 코스 빌더에서 경로를 만들어주세요.
        </ThemedText>
        <Button label="코스 빌더로 이동" onPress={() => router.replace('/(main)/course-builder')} />
      </Screen>
    );
  }

  return (
    <Screen title="코스 정보">
      <ThemedText themeColor="textSecondary">{locationLabel}</ThemedText>

      <View style={styles.mapWrapper}>
        <NaverMapView
          style={styles.map}
          initialCamera={{ ...waypoints[0], zoom: 15 }}
          isScrollGesturesEnabled={false}
          isZoomGesturesEnabled={false}
        >
          {path.length > 1 && <NaverMapPolylineOverlay coords={path} color="#3c87f7" width={5} />}
          {waypoints.map((point, index) => (
            <NaverMapMarkerOverlay
              key={`${point.latitude}-${point.longitude}-${index}`}
              latitude={point.latitude}
              longitude={point.longitude}
              anchor={{ x: 0.5, y: 1 }}
              caption={{ text: `${index + 1}` }}
            />
          ))}
        </NaverMapView>
      </View>
      <ThemedText>평균 페이스: {avgPaceLabel}</ThemedText>

      <TextInput
        placeholder="코스 이름"
        placeholderTextColor={theme.textSecondary}
        value={name}
        onChangeText={setName}
        style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
      />
      <TextInput
        placeholder="메모"
        placeholderTextColor={theme.textSecondary}
        value={memo}
        onChangeText={setMemo}
        multiline
        style={[
          styles.input,
          styles.memo,
          { color: theme.text, backgroundColor: theme.backgroundElement },
        ]}
      />

      {error && (
        <ThemedText type="small" style={styles.error}>
          {error}
        </ThemedText>
      )}

      <View style={styles.ratingRow}>
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

      <ThemedText type="small" themeColor="textSecondary">
        자동으로 저장됩니다.
      </ThemedText>

      <Button
        label="완료"
        onPress={async () => {
          // The name/memo debounce (800ms) may not have fired yet - flush it so a quick tap
          // right after typing doesn't lose the edit.
          if (courseId) {
            await supabase.from('courses').update({ name, memo }).eq('id', courseId);
          }
          reset();
          router.replace('/(main)/course-list');
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  mapWrapper: {
    height: 220,
    borderRadius: Spacing.three,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  input: {
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
  memo: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  error: {
    color: '#d64545',
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
