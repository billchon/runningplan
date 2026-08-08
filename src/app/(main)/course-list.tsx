import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

interface CourseListItem {
  id: string;
  name: string;
  avgPace: number | null;
  avgRating: number | null;
}

function formatPace(minutesPerKm: number | null) {
  if (minutesPerKm == null) return "--'--";
  const whole = Math.floor(minutesPerKm);
  const seconds = Math.round((minutesPerKm - whole) * 60);
  return `${whole}'${String(seconds).padStart(2, '0')}"`;
}

export default function CourseListScreen() {
  const [courses, setCourses] = useState<CourseListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('courses')
      .select('id, name, avg_pace, course_ratings(score)')
      .order('created_at', { ascending: false })
      .then(({ data, error: fetchError }) => {
        if (fetchError) {
          setError(fetchError.message);
        } else {
          setCourses(
            (data ?? []).map((row: any) => {
              const scores: number[] = (row.course_ratings ?? []).map((r: any) => r.score);
              const avgRating = scores.length
                ? scores.reduce((sum, s) => sum + s, 0) / scores.length
                : null;
              return {
                id: row.id,
                name: row.name || '이름 없는 코스',
                avgPace: row.avg_pace,
                avgRating,
              };
            }),
          );
        }
        setIsLoading(false);
      });
  }, []);

  return (
    <Screen title="코스 목록">
      <ThemedText type="linkPrimary" onPress={() => router.push('/(main)/run-history')}>
        러닝 기록 보기
      </ThemedText>

      {isLoading && <ThemedText themeColor="textSecondary">불러오는 중...</ThemedText>}
      {error && (
        <ThemedText type="small" style={styles.error}>
          {error}
        </ThemedText>
      )}
      {!isLoading && !error && courses.length === 0 && (
        <ThemedText themeColor="textSecondary">아직 저장된 코스가 없습니다.</ThemedText>
      )}

      {courses.map((course) => (
        <ThemedView key={course.id} type="backgroundElement" style={styles.row}>
          <Pressable
            onPress={() =>
              router.push({ pathname: '/(main)/course-info', params: { courseId: course.id } })
            }
          >
            <ThemedText>{course.name}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              평균 페이스 {formatPace(course.avgPace)}
              {course.avgRating != null ? ` · 평점 ${course.avgRating.toFixed(1)}` : ''}
            </ThemedText>
            <ThemedText type="linkPrimary">수정</ThemedText>
          </Pressable>
          <Button
            label="시작"
            onPress={() =>
              router.push({
                pathname: '/(main)/run-tracking',
                params: { courseId: course.id, courseName: course.name },
              })
            }
          />
        </ThemedView>
      ))}
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
