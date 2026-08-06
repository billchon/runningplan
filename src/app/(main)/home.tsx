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

// TODO: replace the weekly summary with a real aggregate over RUNS once there's run history.
export default function HomeScreen() {
  const [courses, setCourses] = useState<CoursePreview[]>([]);

  useEffect(() => {
    supabase
      .from('courses')
      .select('id, name')
      .order('created_at', { ascending: false })
      .limit(3)
      .then(({ data }) => {
        setCourses((data ?? []).map((row) => ({ id: row.id, name: row.name || '이름 없는 코스' })));
      });
  }, []);

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
          <ThemedText>러닝 3회 · 12.4km · 신규 코스 1개</ThemedText>
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

        {courses.map((course) => (
          <ThemedView key={course.id} type="backgroundElement" style={styles.courseRow}>
            <ThemedText>{course.name}</ThemedText>
            <Button label="시작" onPress={() => startRun(course)} />
          </ThemedView>
        ))}
      </View>

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
