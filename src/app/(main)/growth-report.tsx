import { PlaceholderBox } from '@/components/placeholder-box';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';

// TODO: aggregate RUNS by week/month for longest/avg distance and avg pace trends (see PRD 4.5, open issues).
export default function GrowthReportScreen() {
  return (
    <Screen title="성장 리포트">
      <ThemedText type="subtitle">최장 거리 추이</ThemedText>
      <PlaceholderBox label="그래프 (차트 라이브러리 연동 예정)" height={160} />

      <ThemedText type="subtitle">평균 거리 추이</ThemedText>
      <PlaceholderBox label="그래프 (차트 라이브러리 연동 예정)" height={160} />

      <ThemedText type="subtitle">평균 페이스 추이</ThemedText>
      <PlaceholderBox label="그래프 (차트 라이브러리 연동 예정)" height={160} />
    </Screen>
  );
}
