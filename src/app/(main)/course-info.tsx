import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { PlaceholderBox } from '@/components/placeholder-box';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const ratingCategories = ['경관', '안전', '평탄'] as const;

// TODO: autosave name/memo/ratings to COURSES / COURSE_RATINGS tables (see PRD 4.2, 10).
export default function CourseInfoScreen() {
  const theme = useTheme();
  const [name, setName] = useState('');
  const [memo, setMemo] = useState('');

  return (
    <Screen title="코스 정보">
      <ThemedText themeColor="textSecondary">서울 강남구 · 역삼동 부근 (자동 인식된 위치 태그)</ThemedText>

      <PlaceholderBox label="1km 구간 표시 경로 (지도 SDK 연동 예정)" height={220} />
      <ThemedText>평균 페이스: --&apos;-- /km</ThemedText>

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

      <View style={styles.ratingRow}>
        {ratingCategories.map((category) => (
          <ThemedText key={category} type="small" themeColor="textSecondary">
            {category}: ☆☆☆☆☆
          </ThemedText>
        ))}
      </View>

      <ThemedText type="small" themeColor="textSecondary">
        자동으로 저장됩니다.
      </ThemedText>

      <Button label="완료" onPress={() => router.replace('/(main)/course-list')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
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
  ratingRow: {
    gap: Spacing.one,
  },
});
