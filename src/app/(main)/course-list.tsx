import { router } from 'expo-router';
import { StyleSheet } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

// TODO: fetch from COURSES table, ordered by recent/rating (see PRD 4.2, 10).
const mockCourses = [
  { id: 'course-1', name: '한강 야경 코스', avgPace: "5'40\"", rating: 4.5 },
  { id: 'course-2', name: '동네 언덕 코스', avgPace: "6'10\"", rating: 4.0 },
];

export default function CourseListScreen() {
  return (
    <Screen title="코스 목록">
      {mockCourses.map((course) => (
        <ThemedView key={course.id} type="backgroundElement" style={styles.row}>
          <ThemedText>{course.name}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            평균 페이스 {course.avgPace} · 평점 {course.rating}
          </ThemedText>
          <Button label="시작" onPress={() => router.push('/(main)/run-tracking')} />
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
});
