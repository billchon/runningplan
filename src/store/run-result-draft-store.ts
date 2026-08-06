import { create } from 'zustand';

import type { Coord, TimedCoord } from '@/lib/geo';

interface RunResultDraft {
  courseId: string | null;
  trackedPath: TimedCoord[];
  plannedPath: Coord[];
  distanceMeters: number;
  durationSeconds: number;
}

interface RunResultDraftState extends RunResultDraft {
  setDraft: (draft: RunResultDraft) => void;
  reset: () => void;
}

// Bridges run-tracking's live GPS session to run-result, which computes segments/completion
// rate and persists to Supabase.
export const useRunResultDraftStore = create<RunResultDraftState>((set) => ({
  courseId: null,
  trackedPath: [],
  plannedPath: [],
  distanceMeters: 0,
  durationSeconds: 0,
  setDraft: (draft) => set(draft),
  reset: () =>
    set({ courseId: null, trackedPath: [], plannedPath: [], distanceMeters: 0, durationSeconds: 0 }),
}));
