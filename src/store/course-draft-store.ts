import { create } from 'zustand';

interface Coord {
  latitude: number;
  longitude: number;
}

interface CourseDraftState {
  waypoints: Coord[];
  path: Coord[];
  distanceMeters: number | null;
  durationSeconds: number | null;
  setDraft: (draft: {
    waypoints: Coord[];
    path: Coord[];
    distanceMeters: number | null;
    durationSeconds: number | null;
  }) => void;
  reset: () => void;
}

// Bridges course-builder's map state to course-info, which persists it to Supabase.
export const useCourseDraftStore = create<CourseDraftState>((set) => ({
  waypoints: [],
  path: [],
  distanceMeters: null,
  durationSeconds: null,
  setDraft: (draft) => set(draft),
  reset: () => set({ waypoints: [], path: [], distanceMeters: null, durationSeconds: null }),
}));
