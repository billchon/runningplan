// Mirrors PRD section 10 (데이터 모델 ERD).

export type LoginProvider = 'email' | 'kakao' | 'google';

export interface User {
  id: string;
  email: string;
  login_provider: LoginProvider;
  height_cm: number | null;
  weight_kg: number | null;
}

export interface Course {
  id: string;
  user_id: string;
  name: string;
  memo: string | null;
  distance_m: number;
  avg_pace: number;
  is_circular: boolean;
}

export interface CourseWaypoint {
  id: string;
  course_id: string;
  seq: number;
  lat: number;
  lng: number;
}

export type RatingCategory = '경관' | '안전' | '평탄';

export interface CourseRating {
  id: string;
  course_id: string;
  category: RatingCategory;
  score: 1 | 2 | 3 | 4 | 5;
}

export type LocationTagType = 'start' | 'finish';

export interface CourseLocationTag {
  id: string;
  course_id: string;
  tag_type: LocationTagType;
  region_name: string;
}

export interface Run {
  id: string;
  user_id: string;
  course_id: string | null;
  distance_m: number;
  duration_sec: number;
  completion_rate: number;
}

export type SpeedCategory = 'fast' | 'normal' | 'slow';

export interface RunSegment {
  id: string;
  run_id: string;
  km_index: number;
  pace: number;
  speed_category: SpeedCategory;
}
