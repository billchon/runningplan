import { supabase } from '@/lib/supabase';
import { fetchPedestrianRoute } from '@/lib/tmap';

interface Coord {
  latitude: number;
  longitude: number;
}

export interface CoursePlan {
  waypoints: Coord[];
  path: Coord[];
  distanceMeters: number;
}

// Re-derives the road-based route for a saved course from its waypoints, since we only
// persist waypoints (not the full path geometry) - see PRD 10 ERD / course_waypoints.
export async function loadCoursePlan(courseId: string): Promise<CoursePlan> {
  const { data, error } = await supabase
    .from('course_waypoints')
    .select('seq, lat, lng')
    .eq('course_id', courseId)
    .order('seq', { ascending: true });

  if (error) throw error;

  const waypoints: Coord[] = (data ?? []).map((row) => ({
    latitude: row.lat,
    longitude: row.lng,
  }));

  if (waypoints.length < 2) {
    return { waypoints, path: [], distanceMeters: 0 };
  }

  const route = await fetchPedestrianRoute(waypoints);
  return { waypoints, path: route.path, distanceMeters: route.distanceMeters };
}
