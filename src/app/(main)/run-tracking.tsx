import { router } from 'expo-router';

import { Button } from '@/components/button';
import { PlaceholderBox } from '@/components/placeholder-box';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';

// TODO: wire up expo-location background tracking + completion-rate calc vs planned course (see PRD 4.4, 7).
export default function RunTrackingScreen() {
  return (
    <Screen title="러닝 중">
      <PlaceholderBox label="실시간 위치 지도 (지도 SDK 연동 예정)" height={280} />

      <ThemedText>거리: -- km</ThemedText>
      <ThemedText>페이스: --&apos;-- /km</ThemedText>
      <ThemedText>계획 코스 대비 완주율: --%</ThemedText>

      <Button label="러닝 종료" onPress={() => router.replace('/(main)/run-result')} />
    </Screen>
  );
}
