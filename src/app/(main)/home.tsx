import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

interface CoursePreview {
  id: string;
  name: string;
}

interface WeeklySummary {
  runCount: number;
  totalDistanceMeters: number;
  newCourseCount: number;
}

// Monday 00:00 local time of the current week.
function startOfWeek(): Date {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = day === 0 ? 6 : day - 1;
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMonday);
  return start;
}

export default function HomeScreen() {
  const [myCourses, setMyCourses] = useState<CoursePreview[]>([]);
  const [favoriteCourses, setFavoriteCourses] = useState<CoursePreview[]>([]);
  const [summary, setSummary] = useState<WeeklySummary | null>(null);

  useEffect(() => {
    supabase
      .from('courses')
      .select('id, name')
      .eq('source', 'builder')
      .order('created_at', { ascending: false })
      .limit(3)
      .then(({ data }) => {
        setMyCourses((data ?? []).map((row) => ({ id: row.id, name: row.name || '이름 없는 코스' })));
      });

    supabase
      .from('courses')
      .select('id, name')
      .eq('is_favorite', true)
      .order('created_at', { ascending: false })
      .limit(3)
      .then(({ data }) => {
        setFavoriteCourses((data ?? []).map((row) => ({ id: row.id, name: row.name || '이름 없는 코스' })));
      });

    const weekStartIso = startOfWeek().toISOString();
    Promise.all([
      supabase.from('runs').select('distance_m').gte('created_at', weekStartIso),
      supabase
        .from('courses')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', weekStartIso),
    ]).then(([runsResult, coursesResult]) => {
      const runs = runsResult.data ?? [];
      setSummary({
        runCount: runs.length,
        totalDistanceMeters: runs.reduce((sum, run) => sum + (run.distance_m ?? 0), 0),
        newCourseCount: coursesResult.count ?? 0,
      });
    });
  }, []);

  const summaryLabel = summary
    ? `러닝 ${summary.runCount}회 · ${(summary.totalDistanceMeters / 1000).toFixed(1)}km · 신규 코스 ${summary.newCourseCount}개`
    : '불러오는 중...';

  const startRun = (course?: CoursePreview) => {
    if (course) {
      router.push({
        pathname: '/(main)/run-tracking',
        params: { courseId: course.id, courseName: course.name },
      });
    } else {
      router.push('/(main)/run-tracking');
    }
  };

  return (
    <Screen title="홈">
      <Button label="나만의 러닝 코스 만들기" onPress={() => router.push('/(main)/course-builder')} />

      <View style={styles.section}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          이번 주 요약
        </ThemedText>
        <ThemedView type="backgroundElement" style={styles.summaryRow}>
          <ThemedText>{summaryLabel}</ThemedText>
        </ThemedView>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            코스 선택
          </ThemedText>
          <ThemedText type="linkPrimary" onPress={() => router.push('/(main)/course-list')}>
            더보기
          </ThemedText>
        </View>

        <ThemedView type="backgroundElement" style={styles.courseRow}>
          <ThemedText>자유 러닝</ThemedText>
          <Button label="시작" onPress={() => startRun()} />
        </ThemedView>

        <ThemedText type="small" themeColor="textSecondary">
          내가 만든 코스
        </ThemedText>
        {myCourses.length === 0 && (
          <ThemedText type="small" themeColor="textSecondary">
            아직 만든 코스가 없습니다.
          </ThemedText>
        )}
        {myCourses.map((course) => (
          <ThemedView key={course.id} type="backgroundElement" style={styles.courseRow}>
            <ThemedText>{course.name}</ThemedText>
            <Button label="시작" onPress={() => startRun(course)} />
          </ThemedView>
        ))}

        <ThemedText type="small" themeColor="textSecondary">
          즐겨찾기 코스
        </ThemedText>
        {favoriteCourses.length === 0 && (
          <ThemedText type="small" themeColor="textSecondary">
            아직 즐겨찾기한 코스가 없습니다. 러닝을 마친 뒤 결과 화면에서 즐겨찾기해보세요.
          </ThemedText>
        )}
        {favoriteCourses.map((course) => (
          <ThemedView key={course.id} type="backgroundElement" style={styles.courseRow}>
            <ThemedText>{course.name}</ThemedText>
            <Button label="시작" onPress={() => startRun(course)} />
          </ThemedView>
        ))}
      </View>

      <Button
        label="러닝 히스토리 보기"
        variant="secondary"
        onPress={() => router.push('/(main)/run-history')}
      />
      <Button
        label="성장 리포트 보기"
        variant="secondary"
        onPress={() => router.push('/(main)/growth-report')}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.two,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    lineHeight: 26,
  },
  summaryRow: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
  },
  courseRow: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
