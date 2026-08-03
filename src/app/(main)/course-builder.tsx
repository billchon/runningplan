import { router } from 'expo-router';

import { Button } from '@/components/button';
import { PlaceholderBox } from '@/components/placeholder-box';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';

// TODO: replace with Kakao/Naver map SDK + Tmap 보행자 경로 API integration (see PRD 6, 7).
export default function CourseBuilderScreen() {
  return (
    <Screen title="코스 빌더">
      <ThemedText themeColor="textSecondary">
        지도에서 시작점 · 경유지 · 도착점을 탭해 경로를 만드세요.
      </ThemedText>

      <PlaceholderBox label="지도 영역 (지도 SDK 연동 예정)" height={320} />

      <ThemedText>예상 거리: -- km · 예상 소요 시간: -- 분</ThemedText>

      <Button label="다음 (코스 정보 입력)" onPress={() => router.push('/(main)/course-info')} />
    </Screen>
  );
}
