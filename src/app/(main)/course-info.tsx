import { NaverMapMarkerOverlay, NaverMapPolylineOverlay, NaverMapView } from '@mj-studio/react-native-naver-map';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { loadCoursePlan } from '@/lib/courses';
import type { Coord } from '@/lib/geo';
import { isCircular, splitPathByDistance } from '@/lib/geo';
import { fetchSafetyConvenienceInfo, type SafetyPoi } from '@/lib/osm-poi';
import { supabase } from '@/lib/supabase';
import { reverseGeocode } from '@/lib/tmap';
import { useCourseDraftStore } from '@/store/course-draft-store';

const KM_SEGMENT_COLORS = ['#3c87f7', '#8fb8f6'];
// Waypoint markers previously had no explicit width/height, which the SDK renders as an
// oversized native asset that hid the safety-layer icons underneath - both now share one size.
const WAYPOINT_MARKER_SIZE = 24;
// Safety-layer markers must draw above waypoint markers (same zIndex group) so an overlapping
// waypoint can't hide a tappable safety icon underneath it.
const WAYPOINT_Z_INDEX = 0;
const SAFETY_POI_Z_INDEX = 1;

function poiEmoji(poi: Pick<SafetyPoi, 'kind' | 'hasSignal'>) {
  switch (poi.kind) {
    case 'bus_stop':
      return '🚌';
    case 'subway':
      return '🚇';
    default:
      return poi.hasSignal ? '🚦' : '🚸';
  }
}

// Crossings are almost never named in OSM (they're just a point on a road), unlike bus stops
// and subway stations which reliably have one - so "이름 없음" would show on nearly every
// crossing tap. A crossing without a name is still identifiable as "a crossing".
function poiTitle(poi: Pick<SafetyPoi, 'kind' | 'name'>) {
  if (poi.name) return poi.name;
  return poi.kind === 'crossing' ? '횡단보도' : '이름 없음';
}

export default function CourseInfoScreen() {
  const theme = useTheme();
  const { courseId: routeCourseId } = useLocalSearchParams<{ courseId?: string }>();
  const isEditMode = !!routeCourseId;
  const draft = useCourseDraftStore();

  const [courseId, setCourseId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [memo, setMemo] = useState('');
  const [locationLabel, setLocationLabel] = useState('위치 태그 확인 중...');
  const [error, setError] = useState<string | null>(null);
  const isFirstRender = useRef(true);

  const [showSafetyLayer, setShowSafetyLayer] = useState(false);
  const [safetyPois, setSafetyPois] = useState<SafetyPoi[] | null>(null);
  const [safetyLoading, setSafetyLoading] = useState(false);
  const [safetyError, setSafetyError] = useState<string | null>(null);
  const [selectedPoi, setSelectedPoi] = useState<SafetyPoi | null>(null);

  // Edit-mode-only: course data loaded from Supabase for an existing course, as opposed to
  // a freshly-drafted one handed off from course-builder via the store.
  const [loadedWaypoints, setLoadedWaypoints] = useState<Coord[]>([]);
  const [loadedPath, setLoadedPath] = useState<Coord[]>([]);
  const [loadedDistanceMeters, setLoadedDistanceMeters] = useState<number | null>(null);
  const [loadedAvgPace, setLoadedAvgPace] = useState<number | null>(null);
  const [isEditLoading, setIsEditLoading] = useState(isEditMode);

  const waypoints = isEditMode ? loadedWaypoints : draft.waypoints;
  const path = isEditMode ? loadedPath : draft.path;
  const distanceMeters = isEditMode ? loadedDistanceMeters : draft.distanceMeters;
  const kmSegments = useMemo(() => splitPathByDistance(path), [path]);

  // Edit mode: load an existing course's saved data instead of creating a new one.
  useEffect(() => {
    if (!isEditMode || !routeCourseId) return;

    let cancelled = false;

    (async () => {
      const [{ data: course }, plan, { data: tagRows }] = await Promise.all([
        supabase.from('courses').select('name, memo, avg_pace').eq('id', routeCourseId).single(),
        loadCoursePlan(routeCourseId),
        supabase.from('course_location_tags').select('tag_type, region_name').eq('course_id', routeCourseId),
      ]);
      if (cancelled) return;

      setCourseId(routeCourseId);
      setName(course?.name ?? '');
      setMemo(course?.memo ?? '');
      setLoadedAvgPace(course?.avg_pace ?? null);
      setLoadedWaypoints(plan.waypoints);
      setLoadedPath(plan.path);
      setLoadedDistanceMeters(plan.distanceMeters);

      const startTag = tagRows?.find((t) => t.tag_type === 'start')?.region_name;
      const finishTag = tagRows?.find((t) => t.tag_type === 'finish')?.region_name;
      setLocationLabel(
        finishTag ? `${startTag} → ${finishTag}` : startTag ? `${startTag} · 순환` : '위치 태그 없음',
      );
      setIsEditLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [isEditMode, routeCourseId]);

  // Create the course row (+ waypoints) once, from whatever course-builder handed off.
  useEffect(() => {
    if (isEditMode || draft.waypoints.length < 2) return;

    let cancelled = false;

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) setError('로그인 정보를 확인할 수 없습니다.');
        return;
      }

      const start = waypoints[0];
      const end = waypoints[waypoints.length - 1];
      const avgPace =
        distanceMeters && draft.durationSeconds
          ? draft.durationSeconds / 60 / (distanceMeters / 1000)
          : null;

      const { data: course, error: insertError } = await supabase
        .from('courses')
        .insert({
          user_id: user.id,
          distance_m: distanceMeters ?? 0,
          avg_pace: avgPace,
          is_circular: isCircular(start, end),
        })
        .select('id')
        .single();

      if (cancelled) return;
      if (insertError || !course) {
        setError(insertError?.message ?? '코스를 저장하지 못했습니다.');
        return;
      }

      setCourseId(course.id);

      // Without waypoints the course row is unusable (no route to show or re-run), so unlike
      // the location-tag insert below this one must surface a failure instead of failing quietly.
      const { error: waypointsError } = await supabase.from('course_waypoints').insert(
        waypoints.map((point, seq) => ({
          course_id: course.id,
          seq,
          lat: point.latitude,
          lng: point.longitude,
        })),
      );
      if (cancelled) return;
      if (waypointsError) {
        setError('경로 저장에 실패했습니다. 코스를 다시 만들어주세요.');
        return;
      }

      const [startLabel, endLabel] = await Promise.all([
        reverseGeocode(start),
        reverseGeocode(end),
      ]);
      if (cancelled) return;

      const tagRows = [];
      if (startLabel) tagRows.push({ course_id: course.id, tag_type: 'start', region_name: startLabel });
      if (endLabel && !isCircular(start, end)) {
        tagRows.push({ course_id: course.id, tag_type: 'finish', region_name: endLabel });
      }
      if (tagRows.length > 0) {
        await supabase.from('course_location_tags').insert(tagRows);
      }

      if (isCircular(start, end)) {
        setLocationLabel(startLabel ? `${startLabel} · 순환` : '위치 태그를 확인하지 못했습니다');
      } else {
        setLocationLabel(
          [startLabel, endLabel].filter(Boolean).join(' → ') || '위치 태그를 확인하지 못했습니다',
        );
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only run once per draft, not on every distance/duration recompute
  }, []);

  // Debounce-save name/memo edits once the course row exists.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (!courseId) return;

    const timeout = setTimeout(() => {
      supabase.from('courses').update({ name, memo }).eq('id', courseId);
    }, 800);

    return () => clearTimeout(timeout);
  }, [name, memo, courseId]);

  const safetyPoiMarkers = useMemo(
    () =>
      safetyPois?.map((poi) => (
        <NaverMapMarkerOverlay
          key={poi.id}
          latitude={poi.latitude}
          longitude={poi.longitude}
          width={WAYPOINT_MARKER_SIZE}
          height={WAYPOINT_MARKER_SIZE}
          zIndex={SAFETY_POI_Z_INDEX}
          caption={{
            text: poiEmoji(poi),
            textSize: 14,
            align: 'Center',
          }}
          onTap={() => setSelectedPoi(poi)}
        />
      )),
    [safetyPois],
  );

  const handleToggleSafetyLayer = async () => {
    if (showSafetyLayer) {
      setShowSafetyLayer(false);
      setSelectedPoi(null);
      return;
    }
    setShowSafetyLayer(true);
    if (safetyPois || safetyLoading) return;

    setSafetyLoading(true);
    setSafetyError(null);
    try {
      const pois = await fetchSafetyConvenienceInfo(path);
      setSafetyPois(pois);
    } catch (e) {
      setSafetyError(e instanceof Error ? e.message : '안전·편의정보를 불러오지 못했습니다.');
    } finally {
      setSafetyLoading(false);
    }
  };

  const avgPaceMinPerKm = isEditMode
    ? loadedAvgPace
    : distanceMeters && draft.durationSeconds
      ? draft.durationSeconds / 60 / (distanceMeters / 1000)
      : null;
  const avgPaceLabel = avgPaceMinPerKm != null ? `${avgPaceMinPerKm.toFixed(1)}'/km` : "--'-- /km";

  if (isEditMode && isEditLoading) {
    return (
      <Screen title="코스 정보">
        <ThemedText themeColor="textSecondary">불러오는 중...</ThemedText>
      </Screen>
    );
  }

  if (waypoints.length < 2) {
    return (
      <Screen title="코스 정보">
        <ThemedText themeColor="textSecondary">
          먼저 코스 빌더에서 경로를 만들어주세요.
        </ThemedText>
        <Button label="코스 빌더로 이동" onPress={() => router.replace('/(main)/course-builder')} />
      </Screen>
    );
  }

  return (
    <Screen title="코스 정보">
      <ThemedText themeColor="textSecondary">{locationLabel}</ThemedText>

      <View style={styles.mapWrapper}>
        <NaverMapView
          style={styles.map}
          initialCamera={{ ...waypoints[0], zoom: 15 }}
          isScrollGesturesEnabled={false}
          isZoomGesturesEnabled={false}
        >
          {kmSegments.map((segment, index) => (
            <NaverMapPolylineOverlay
              key={index}
              coords={segment}
              color={KM_SEGMENT_COLORS[index % KM_SEGMENT_COLORS.length]}
              width={5}
            />
          ))}
          {kmSegments.slice(0, -1).map((segment, index) => (
            <NaverMapMarkerOverlay
              key={`km-${index}`}
              latitude={segment[segment.length - 1].latitude}
              longitude={segment[segment.length - 1].longitude}
              width={18}
              height={18}
              image={{ symbol: 'gray' }}
              caption={{ text: `${index + 1}km`, textSize: 10 }}
            />
          ))}
          {waypoints.map((point, index) => (
            <NaverMapMarkerOverlay
              key={`${point.latitude}-${point.longitude}-${index}`}
              latitude={point.latitude}
              longitude={point.longitude}
              anchor={{ x: 0.5, y: 1 }}
              width={WAYPOINT_MARKER_SIZE}
              height={WAYPOINT_MARKER_SIZE}
              zIndex={WAYPOINT_Z_INDEX}
              caption={{ text: `${index + 1}` }}
            />
          ))}
          {showSafetyLayer && safetyPoiMarkers}
        </NaverMapView>
      </View>

      <Pressable
        onPress={handleToggleSafetyLayer}
        style={styles.safetyToggle}
        hitSlop={Spacing.two}
      >
        <ThemedText type="small">
          {showSafetyLayer
            ? '안전·편의 정보 숨기기'
            : '안전·편의 정보 보기 (버스정류소 · 횡단보도 · 지하철)'}
        </ThemedText>
      </Pressable>
      {showSafetyLayer && selectedPoi && (
        <View style={styles.poiCard}>
          <ThemedText type="smallBold">
            {poiEmoji(selectedPoi)} {poiTitle(selectedPoi)}
          </ThemedText>
          {selectedPoi.kind === 'bus_stop' && (
            <>
              <ThemedText type="small" themeColor="textSecondary">
                정류장 번호: {selectedPoi.stopRef ?? '정보 없음'}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                경유 버스: {selectedPoi.routeRefs?.join(', ') ?? '정보 없음'}
              </ThemedText>
            </>
          )}
          {selectedPoi.kind === 'subway' && (
            <ThemedText type="small" themeColor="textSecondary">
              {selectedPoi.subwayLines?.length
                ? `${selectedPoi.subwayLines.map((line) => `${line}호선`).join(', ')}`
                : '호선 정보 없음'}
            </ThemedText>
          )}
        </View>
      )}
      {safetyLoading && (
        <ThemedText type="small" themeColor="textSecondary">
          주변 정보를 불러오는 중...
        </ThemedText>
      )}
      {safetyError && (
        <ThemedText type="small" style={styles.error}>
          {safetyError}
        </ThemedText>
      )}

      <ThemedText>평균 페이스: {avgPaceLabel}</ThemedText>

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

      {error && (
        <ThemedText type="small" style={styles.error}>
          {error}
        </ThemedText>
      )}

      <ThemedText type="small" themeColor="textSecondary">
        자동으로 저장됩니다. 코스 평가는 이 코스로 러닝을 완료한 뒤 결과 화면에서 남길 수 있어요.
      </ThemedText>

      <Button
        label="완료"
        onPress={async () => {
          // The name/memo debounce (800ms) may not have fired yet - flush it so a quick tap
          // right after typing doesn't lose the edit. This flush's own failure used to be
          // ignored too, silently discarding the edit while still navigating away as if saved.
          if (courseId) {
            const { error: updateError } = await supabase
              .from('courses')
              .update({ name, memo })
              .eq('id', courseId);
            if (updateError) {
              setError('저장하지 못했습니다. 다시 시도해주세요.');
              return;
            }
          }
          if (!isEditMode) draft.reset();
          router.replace('/(main)/course-list');
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  mapWrapper: {
    height: 220,
    borderRadius: Spacing.three,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  safetyToggle: {
    paddingVertical: Spacing.two,
  },
  poiCard: {
    borderRadius: Spacing.two,
    padding: Spacing.two,
    gap: 2,
    backgroundColor: 'rgba(60, 135, 247, 0.08)',
  },
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
  error: {
    color: '#d64545',
  },
});
