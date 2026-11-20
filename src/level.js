// 수준 보정 로직
// - base: 사용자가 ▲/▼ 버튼으로 정하는 기준 레벨
// - offset: 자동 보정값. base의 ±1 범위 안에서만 움직인다
// - 버튼을 누른 직후 FREEZE_TURNS 턴 동안은 자동 보정을 멈춘다

export const MIN_LEVEL = 1;
export const MAX_LEVEL = 10;
const WINDOW = 3; // 최근 몇 턴의 평균으로 판단할지
const FREEZE_TURNS = 2;

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

export class LevelController {
  constructor(base = 3) {
    this.base = clamp(base, MIN_LEVEL, MAX_LEVEL);
    this.offset = 0;
    this.recent = [];
    this.freeze = 0;
  }

  get current() {
    return clamp(this.base + this.offset, MIN_LEVEL, MAX_LEVEL);
  }

  // 수동 조정: 지금 보이는 레벨에서 한 단계 이동하고, 그 값을 새 기준으로 삼는다
  manual(delta) {
    this.base = clamp(this.current + delta, MIN_LEVEL, MAX_LEVEL);
    this.offset = 0;
    this.recent = [];
    this.freeze = FREEZE_TURNS;
    return this.current;
  }

  // 자동 보정: 모델이 평가한 사용자 레벨을 받아 반영한다
  observe(userLevel) {
    if (!Number.isFinite(userLevel)) return this.current;
    this.recent.push(clamp(userLevel, MIN_LEVEL, MAX_LEVEL));
    if (this.recent.length > WINDOW) this.recent.shift();
    if (this.freeze > 0) {
      this.freeze -= 1;
      return this.current;
    }
    const avg = this.recent.reduce((a, b) => a + b, 0) / this.recent.length;
    this.offset = clamp(Math.round(avg - this.base), -1, 1);
    return this.current;
  }

  toJSON() {
    return { base: this.base };
  }
}

// 레벨 → CEFR 표기 (내부 참고용)
export function cefr(level) {
  if (level <= 2) return "A1";
  if (level <= 4) return "A2";
  if (level <= 6) return "B1";
  if (level <= 8) return "B2";
  if (level <= 9) return "C1";
  return "C2";
}

// 레벨별 TTS 속도
export function speechRate(level) {
  return [0.75, 0.8, 0.85, 0.9, 0.95, 1.0, 1.0, 1.05, 1.05, 1.1][level - 1] ?? 1.0;
}
