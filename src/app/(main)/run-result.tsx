import { router } from 'expo-router';

import { Button } from '@/components/button';
import { PlaceholderBox } from '@/components/placeholder-box';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';

// TODO: persist to RUNS / RUN_SEGMENTS tables; render pace-colored segments (빠름/보통/느림) (see PRD 4.4, 10).
export default function RunResultScreen() {
  return (
    <Screen title="러닝 결과">
      <PlaceholderBox label="1km 구간별 페이스 색상 경로 (지도 SDK 연동 예정)" height={280} />

      <ThemedText>거리: -- km</ThemedText>
      <ThemedText>시간: --:--:--</ThemedText>
      <ThemedText>평균 페이스: --&apos;-- /km</ThemedText>
      <ThemedText>완주율: --%</ThemedText>

      <Button label="홈으로" onPress={() => router.replace('/(main)/home')} />
    </Screen>
  );
}
