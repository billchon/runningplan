import * as Speech from 'expo-speech';

import { haversineMeters, type Coord } from '@/lib/geo';
import type { TurnPoint } from '@/lib/tmap';

const TURN_ANNOUNCE_METERS = 40;
const OFF_COURSE_METERS = 30;
const OFF_COURSE_COOLDOWN_MS = 20_000;

function speak(text: string) {
  Speech.speak(text, { language: 'ko-KR' });
}

function nearestDistanceToPath(point: Coord, path: Coord[]): number {
  let min = Infinity;
  for (const p of path) {
    const d = haversineMeters(point, p);
    if (d < min) min = d;
  }
  return min;
}

// Drives voice guidance for one run: upcoming-turn callouts (from Tmap's own turn
// descriptions), off-course warnings against the planned path, and per-km pace splits.
// All three degrade gracefully when there's no course (free run) - turnPoints/plannedPath
// just come in empty and only the km-pace announcements fire.
export class VoiceGuide {
  private nextTurnIndex = 0;
  private lastOffCourseWarningAt = 0;
  private wasOffCourse = false;
  private lastKmAnnounced = 0;
  private lastKmElapsedSeconds = 0;

  constructor(
    private turnPoints: TurnPoint[],
    private plannedPath: Coord[],
  ) {}

  start() {
    if (this.plannedPath.length > 0) {
      speak('안내를 시작합니다.');
    }
  }

  update(current: Coord, distanceMeters: number, elapsedSeconds: number) {
    this.checkTurn(current);
    this.checkOffCourse(current);
    this.checkKmSplit(distanceMeters, elapsedSeconds);
  }

  private checkTurn(current: Coord) {
    const turn = this.turnPoints[this.nextTurnIndex];
    if (!turn) return;
    if (haversineMeters(current, turn) <= TURN_ANNOUNCE_METERS) {
      speak(turn.description);
      this.nextTurnIndex++;
    }
  }

  private checkOffCourse(current: Coord) {
    if (this.plannedPath.length === 0) return;

    const distance = nearestDistanceToPath(current, this.plannedPath);
    const isOffCourse = distance > OFF_COURSE_METERS;
    const now = Date.now();

    if (isOffCourse && now - this.lastOffCourseWarningAt > OFF_COURSE_COOLDOWN_MS) {
      speak('코스에서 벗어났습니다.');
      this.lastOffCourseWarningAt = now;
      this.wasOffCourse = true;
    } else if (!isOffCourse && this.wasOffCourse) {
      speak('코스로 복귀했습니다.');
      this.wasOffCourse = false;
    }
  }

  private checkKmSplit(distanceMeters: number, elapsedSeconds: number) {
    const km = Math.floor(distanceMeters / 1000);
    if (km <= this.lastKmAnnounced) return;

    const splitSeconds = elapsedSeconds - this.lastKmElapsedSeconds;
    const minutes = Math.floor(splitSeconds / 60);
    const seconds = splitSeconds % 60;
    speak(`${km}킬로미터 통과. 페이스 ${minutes}분 ${seconds}초.`);

    this.lastKmAnnounced = km;
    this.lastKmElapsedSeconds = elapsedSeconds;
  }

  finish() {
    Speech.stop();
  }
}
