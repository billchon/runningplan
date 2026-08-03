import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

// TODO: replace mock course list / weekly summary with data from Supabase (COURSES, RUNS tables).
const mockCourses = [
  { id: 'free-run', name: '자유 러닝' },
  { id: 'course-1', name: '한강 야경 코스' },
  { id: 'course-2', name: '동네 언덕 코스' },
];

export default function HomeScreen() {
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

        {mockCourses.map((course) => (
          <ThemedView key={course.id} type="backgroundElement" style={styles.courseRow}>
            <ThemedText>{course.name}</ThemedText>
            <Button label="시작" onPress={() => router.push('/(main)/run-tracking')} />
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
