import {
  NaverMapMarkerOverlay,
  NaverMapPolylineOverlay,
  NaverMapView,
} from '@mj-studio/react-native-naver-map';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { fetchPedestrianRoute } from '@/lib/tmap';
import { useCourseDraftStore } from '@/store/course-draft-store';

interface Waypoint {
  latitude: number;
  longitude: number;
}

const SEOUL_CITY_HALL: Waypoint = { latitude: 37.5665, longitude: 126.978 };

export default function CourseBuilderScreen() {
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [path, setPath] = useState<Waypoint[]>([]);
  const [distanceMeters, setDistanceMeters] = useState<number | null>(null);
  const [durationSeconds, setDurationSeconds] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setDraft = useCourseDraftStore((state) => state.setDraft);

  useEffect(() => {
    if (waypoints.length < 2) {
      return;
    }

    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard "start loading" flag before an async fetch
    setIsLoading(true);
    setError(null);

    fetchPedestrianRoute(waypoints)
      .then((route) => {
        if (cancelled) return;
        setPath(route.path);
        setDistanceMeters(route.distanceMeters);
        setDurationSeconds(route.durationSeconds);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : '경로를 계산하지 못했습니다.');
        setPath([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [waypoints]);

  const hasRoute = waypoints.length >= 2;
  const distanceLabel =
    hasRoute && distanceMeters != null ? `${(distanceMeters / 1000).toFixed(1)} km` : '--';
  const durationLabel =
    hasRoute && durationSeconds != null ? `${Math.round(durationSeconds / 60)} 분` : '--';

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
          {hasRoute && path.length > 1 && (
            <NaverMapPolylineOverlay coords={path} color="#3c87f7" width={5} />
          )}
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

      {error && (
        <ThemedText type="small" style={styles.error}>
          {error}
        </ThemedText>
      )}

      <ThemedText>
        예상 거리: {isLoading ? '계산 중...' : distanceLabel} · 예상 소요 시간:{' '}
        {isLoading ? '계산 중...' : durationLabel}
      </ThemedText>

      <Button
        label="경유지 초기화"
        variant="secondary"
        onPress={() => {
          setWaypoints([]);
          setPath([]);
          setDistanceMeters(null);
          setDurationSeconds(null);
          setError(null);
        }}
      />
      <Button
        label="다음 (코스 정보 입력)"
        disabled={!hasRoute || isLoading}
        onPress={() => {
          setDraft({ waypoints, path, distanceMeters, durationSeconds });
          router.push('/(main)/course-info');
        }}
      />
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
  error: {
    color: '#d64545',
  },
});
