import {
  NaverMapMarkerOverlay,
  NaverMapPolylineOverlay,
  NaverMapView,
  type NaverMapViewRef,
} from '@mj-studio/react-native-naver-map';
import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { loadCoursePlan } from '@/lib/courses';
import { haversineMeters, type Coord, type TimedCoord } from '@/lib/geo';
import type { TurnPoint } from '@/lib/tmap';
import { VoiceGuide } from '@/lib/voice-guidance';
import { useRunResultDraftStore } from '@/store/run-result-draft-store';

const SEOUL_CITY_HALL: Coord = { latitude: 37.5665, longitude: 126.978 };

export default function RunTrackingScreen() {
  const { courseId, courseName } = useLocalSearchParams<{ courseId?: string; courseName?: string }>();
  const setResultDraft = useRunResultDraftStore((state) => state.setDraft);

  const [plannedPath, setPlannedPath] = useState<Coord[]>([]);
  const [turnPoints, setTurnPoints] = useState<TurnPoint[]>([]);
  const [trackedPath, setTrackedPath] = useState<TimedCoord[]>([]);
  const [distanceMeters, setDistanceMeters] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const distanceRef = useRef(0);
  const guideRef = useRef<VoiceGuide | null>(null);
  const mapRef = useRef<NaverMapViewRef>(null);

  // Re-derive the planned road route from the course's saved waypoints, if a course was picked.
  // The map already mounted centered on SEOUL_CITY_HALL (this only resolves after mount), so
  // `initialCamera` can't pick it up - animate there explicitly once it's in.
  useEffect(() => {
    if (!courseId) return;
    loadCoursePlan(courseId)
      .then((plan) => {
        setPlannedPath(plan.path);
        setTurnPoints(plan.turnPoints);
        if (plan.path.length > 0) {
          mapRef.current?.animateCameraTo({ ...plan.path[0], zoom: 16 });
        }
      })
      .catch(() => {});
  }, [courseId]);

  // Voice guide starts once we know the full picture: immediately for a free run (no course),
  // or once the course's route + turn points have finished loading.
  useEffect(() => {
    if (courseId && plannedPath.length === 0) return;
    if (guideRef.current) return;
    guideRef.current = new VoiceGuide(turnPoints, plannedPath);
    guideRef.current.start();
  }, [courseId, plannedPath, turnPoints]);

  useEffect(() => {
    let subscribed = true;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (!subscribed) return;
      if (status !== 'granted') {
        setPermissionError('위치 권한이 필요합니다. 설정에서 위치 권한을 허용해주세요.');
        return;
      }

      const subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 2000, distanceInterval: 5 },
        (location) => {
          const point: TimedCoord = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            timestamp: location.timestamp,
          };

          setTrackedPath((prev) => {
            if (prev.length > 0) {
              distanceRef.current += haversineMeters(prev[prev.length - 1], point);
              setDistanceMeters(distanceRef.current);
            }
            return [...prev, point];
          });

          const elapsed = Math.floor((Date.now() - (startTimeRef.current ?? Date.now())) / 1000);
          guideRef.current?.update(point, distanceRef.current, elapsed);

          mapRef.current?.animateCameraTo({ latitude: point.latitude, longitude: point.longitude, zoom: 16 });
        },
      );
      if (!subscribed) {
        subscription.remove();
        return;
      }
      subscriptionRef.current = subscription;
      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - (startTimeRef.current ?? Date.now())) / 1000));
      }, 1000);
    })();

    return () => {
      subscribed = false;
      subscriptionRef.current?.remove();
      if (timerRef.current) clearInterval(timerRef.current);
      guideRef.current?.finish();
    };
  }, []);

  const handleEnd = () => {
    subscriptionRef.current?.remove();
    if (timerRef.current) clearInterval(timerRef.current);
    guideRef.current?.finish();

    setResultDraft({
      courseId: courseId ?? null,
      trackedPath,
      plannedPath,
      distanceMeters,
      durationSeconds: elapsedSeconds,
    });
    router.replace('/(main)/run-result');
  };

  const paceLabel =
    distanceMeters > 0
      ? `${(elapsedSeconds / 60 / (distanceMeters / 1000)).toFixed(1)}'/km`
      : "--'--/km";
  const minutes = String(Math.floor(elapsedSeconds / 60)).padStart(2, '0');
  const seconds = String(elapsedSeconds % 60).padStart(2, '0');

  const mapCenter = trackedPath[trackedPath.length - 1] ?? plannedPath[0] ?? SEOUL_CITY_HALL;

  return (
    <Screen title={courseName ? `러닝 중 · ${courseName}` : '러닝 중 (자유 러닝)'}>
      <View style={styles.mapWrapper}>
        <NaverMapView ref={mapRef} style={styles.map} initialCamera={{ ...mapCenter, zoom: 16 }}>
          {plannedPath.length > 1 && (
            <NaverMapPolylineOverlay coords={plannedPath} color="#c0c0c0" width={4} />
          )}
          {trackedPath.length > 1 && (
            <NaverMapPolylineOverlay coords={trackedPath} color="#3c87f7" width={5} />
          )}
          {trackedPath.length > 0 && (
            <NaverMapMarkerOverlay
              latitude={trackedPath[trackedPath.length - 1].latitude}
              longitude={trackedPath[trackedPath.length - 1].longitude}
              anchor={{ x: 0.5, y: 0.5 }}
            />
          )}
        </NaverMapView>
      </View>

      {permissionError && (
        <ThemedText type="small" style={styles.error}>
          {permissionError}
        </ThemedText>
      )}

      <ThemedText>거리: {(distanceMeters / 1000).toFixed(2)} km</ThemedText>
      <ThemedText>
        시간: {minutes}:{seconds}
      </ThemedText>
      <ThemedText>페이스: {paceLabel}</ThemedText>
      {plannedPath.length > 0 && <ThemedText themeColor="textSecondary">계획된 코스를 따라가는 중</ThemedText>}

      <Button label="러닝 종료" onPress={handleEnd} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  mapWrapper: {
    height: 280,
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
