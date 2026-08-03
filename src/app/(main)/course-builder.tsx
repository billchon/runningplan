import { NaverMapMarkerOverlay, NaverMapView } from '@mj-studio/react-native-naver-map';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

interface Waypoint {
  latitude: number;
  longitude: number;
}

const SEOUL_CITY_HALL: Waypoint = { latitude: 37.5665, longitude: 126.978 };

// TODO: after waypoints are set, call the Tmap 보행자 경로 API to fill in the road-based
// route + estimated distance/time (see PRD 4.2, 6). Distance/time below is a placeholder.
export default function CourseBuilderScreen() {
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);

  return (
    <Screen title="코스 빌더">
      <ThemedText themeColor="textSecondary">
        지도에서 시작점 · 경유지 · 도착점을 탭해 경로를 만드세요.
      </ThemedText>

      <View style={styles.mapWrapper}>
        <NaverMapView
          style={styles.map}
          initialCamera={{ ...SEOUL_CITY_HALL, zoom: 15 }}
          onTapMap={({ latitude, longitude }) =>
            setWaypoints((prev) => [...prev, { latitude, longitude }])
          }
        >
          {waypoints.map((point, index) => (
            <NaverMapMarkerOverlay
              key={`${point.latitude}-${point.longitude}-${index}`}
              latitude={point.latitude}
              longitude={point.longitude}
              anchor={{ x: 0.5, y: 1 }}
              caption={{ text: `${index + 1}` }}
            />
          ))}
        </NaverMapView>
      </View>

      <ThemedText type="small" themeColor="textSecondary">
        경유지 {waypoints.length}개 지정됨
      </ThemedText>
      <ThemedText>예상 거리: -- km · 예상 소요 시간: -- 분</ThemedText>

      <Button
        label="경유지 초기화"
        variant="secondary"
        onPress={() => setWaypoints([])}
      />
      <Button label="다음 (코스 정보 입력)" onPress={() => router.push('/(main)/course-info')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  mapWrapper: {
    height: 320,
    borderRadius: Spacing.three,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
});
