import {
  NaverMapMarkerOverlay,
  NaverMapPolylineOverlay,
  NaverMapView,
  type NaverMapViewRef,
} from '@mj-studio/react-native-naver-map';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fetchPedestrianRoute, searchPlaces, type PlaceSearchResult } from '@/lib/tmap';
import { useCourseDraftStore } from '@/store/course-draft-store';

interface Waypoint {
  latitude: number;
  longitude: number;
}

const SEOUL_CITY_HALL: Waypoint = { latitude: 37.5665, longitude: 126.978 };

export default function CourseBuilderScreen() {
  const theme = useTheme();
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [path, setPath] = useState<Waypoint[]>([]);
  const [distanceMeters, setDistanceMeters] = useState<number | null>(null);
  const [durationSeconds, setDurationSeconds] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PlaceSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const setDraft = useCourseDraftStore((state) => state.setDraft);
  const mapRef = useRef<NaverMapViewRef>(null);

  // Center the map on the user's current location once it's available, rather than always
  // opening on a hardcoded Seoul City Hall default.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted' || cancelled) return;

      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      if (cancelled) return;

      mapRef.current?.animateCameraTo({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        zoom: 15,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, []);

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

  // Tapping an existing waypoint selects it (for move/delete); tapping the map either moves
  // the selected waypoint there, or - with nothing selected - adds a new one. The SDK's
  // marker overlay has no drag support, so tap-to-select-then-tap-to-move is the substitute.
  const handleMapTap = ({ latitude, longitude }: Waypoint) => {
    if (selectedIndex != null) {
      setWaypoints((prev) =>
        prev.map((point, index) => (index === selectedIndex ? { latitude, longitude } : point)),
      );
      setSelectedIndex(null);
      return;
    }
    setWaypoints((prev) => [...prev, { latitude, longitude }]);
  };

  const handleMarkerTap = (index: number) => {
    setSelectedIndex((prev) => (prev === index ? null : index));
  };

  const handleDeleteSelected = () => {
    if (selectedIndex == null) return;
    setWaypoints((prev) => prev.filter((_, index) => index !== selectedIndex));
    setSelectedIndex(null);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setSearchError(null);
    try {
      const results = await searchPlaces(searchQuery);
      setSearchResults(results);
      if (results.length === 0) {
        setSearchError('검색 결과가 없습니다.');
      }
    } catch (e) {
      setSearchError(e instanceof Error ? e.message : '장소를 검색하지 못했습니다.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSearchResult = (result: PlaceSearchResult) => {
    mapRef.current?.animateCameraTo({ latitude: result.latitude, longitude: result.longitude, zoom: 16 });
    setSearchResults([]);
    setSearchQuery('');
  };

  const hasRoute = waypoints.length >= 2;
  const distanceLabel =
    hasRoute && distanceMeters != null ? `${(distanceMeters / 1000).toFixed(1)} km` : '--';
  const durationLabel =
    hasRoute && durationSeconds != null ? `${Math.round(durationSeconds / 60)} 분` : '--';

  return (
    <Screen title="코스 빌더">
      <ThemedText themeColor="textSecondary">
        {selectedIndex != null
          ? '지도를 탭해 선택한 경유지를 이동하세요.'
          : '지도에서 시작점 · 경유지 · 도착점을 탭해 경로를 만드세요. 경유지를 탭하면 이동·삭제할 수 있습니다.'}
      </ThemedText>

      <View style={styles.searchRow}>
        <TextInput
          placeholder="장소 검색 (예: 강남역, 한강공원)"
          placeholderTextColor={theme.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
          style={[styles.searchInput, { color: theme.text, backgroundColor: theme.backgroundElement }]}
        />
        <Button label="검색" onPress={handleSearch} disabled={isSearching} />
      </View>

      {searchError && (
        <ThemedText type="small" style={styles.error}>
          {searchError}
        </ThemedText>
      )}

      {searchResults.length > 0 && (
        <View style={styles.searchResults}>
          {searchResults.map((result) => (
            <Pressable key={result.id} onPress={() => handleSelectSearchResult(result)}>
              <ThemedView type="backgroundElement" style={styles.searchResultRow}>
                <ThemedText type="smallBold">{result.name}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {result.address}
                </ThemedText>
              </ThemedView>
            </Pressable>
          ))}
        </View>
      )}

      <View style={styles.mapWrapper}>
        <NaverMapView
          ref={mapRef}
          style={styles.map}
          initialCamera={{ ...SEOUL_CITY_HALL, zoom: 15 }}
          onTapMap={handleMapTap}
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
              image={{ symbol: selectedIndex === index ? 'red' : 'green' }}
              onTap={() => handleMarkerTap(index)}
            />
          ))}
        </NaverMapView>
      </View>

      <ThemedText type="small" themeColor="textSecondary">
        경유지 {waypoints.length}개 지정됨
      </ThemedText>

      {selectedIndex != null && (
        <Button label={`경유지 ${selectedIndex + 1} 삭제`} variant="secondary" onPress={handleDeleteSelected} />
      )}

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
          setSelectedIndex(null);
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
  searchRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
  searchResults: {
    gap: Spacing.one,
  },
  searchResultRow: {
    borderRadius: Spacing.two,
    padding: Spacing.two,
    gap: 2,
  },
});
