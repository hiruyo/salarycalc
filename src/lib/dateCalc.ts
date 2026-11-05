/**
 * 날짜 계산 (모두 'YYYY-MM-DD' 문자열, UTC 자정 기준으로 계산해 시간대·서머타임 영향 없음)
 */

const DAY = 86_400_000;
export const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'] as const;

export function parseYMD(s: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const t = Date.UTC(y, mo - 1, d);
  const back = new Date(t);
  // 2026-02-30 같은 존재하지 않는 날짜 거부
  if (back.getUTCFullYear() !== y || back.getUTCMonth() !== mo - 1 || back.getUTCDate() !== d) return null;
  return t;
}

export function formatYMD(t: number): string {
  const d = new Date(t);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`;
}

export function weekdayOf(t: number): string {
  return WEEKDAYS[new Date(t).getUTCDay()];
}

/** 월 단위 이동. 대상 월에 그 날짜가 없으면 말일로 맞춤 (1/31 + 1개월 = 2/28 또는 2/29) */
export function addMonths(t: number, months: number): number {
  const d = new Date(t);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + months;
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return Date.UTC(y, m, Math.min(d.getUTCDate(), lastDay));
}

/** a ≤ b 일 때 b가 a로부터 몇 년 몇 개월 며칠 뒤인지 (달력 기준) */
function diffYMD(a: number, b: number): { years: number; months: number; days: number } {
  let total = 0;
  // 대략적인 개월 수에서 시작해 보정
  const da = new Date(a);
  const db = new Date(b);
  total = (db.getUTCFullYear() - da.getUTCFullYear()) * 12 + (db.getUTCMonth() - da.getUTCMonth());
  while (total > 0 && addMonths(a, total) > b) total--;
  while (addMonths(a, total + 1) <= b) total++;
  const days = Math.round((b - addMonths(a, total)) / DAY);
  return { years: Math.floor(total / 12), months: total % 12, days };
}

export interface PeriodResult {
  valid: boolean;
  /** 종료일 − 시작일 (일). 종료일이 빠르면 음수 */
  days: number;
  /** 시작일·종료일 모두 포함한 일수 (|days| + 1) */
  daysInclusive: number;
  weeks: number;
  weekRemainder: number;
  years: number;
  months: number;
  remainDays: number;
  /** 주말(토·일)을 뺀 평일 수 (시작일·종료일 포함, 공휴일은 반영 안 함) */
  weekdays: number;
  startWeekday: string;
  endWeekday: string;
}

export function period(start: string, end: string): PeriodResult {
  const a = parseYMD(start);
  const b = parseYMD(end);
  const invalid: PeriodResult = {
    valid: false, days: 0, daysInclusive: 0, weeks: 0, weekRemainder: 0,
    years: 0, months: 0, remainDays: 0, weekdays: 0, startWeekday: '', endWeekday: '',
  };
  if (a === null || b === null) return invalid;

  const days = Math.round((b - a) / DAY);
  const abs = Math.abs(days);
  const [lo, hi] = a <= b ? [a, b] : [b, a];
  const ymd = diffYMD(lo, hi);

  // 평일 수 (양 끝 포함)
  const n = abs + 1;
  const fullWeeks = Math.floor(n / 7);
  let weekdays = fullWeeks * 5;
  const startDow = new Date(lo).getUTCDay();
  for (let i = 0; i < n % 7; i++) {
    const dow = (startDow + i) % 7;
    if (dow !== 0 && dow !== 6) weekdays++;
  }

  return {
    valid: true,
    days,
    daysInclusive: n,
    weeks: Math.floor(abs / 7),
    weekRemainder: abs % 7,
    years: ymd.years,
    months: ymd.months,
    remainDays: ymd.days,
    weekdays,
    startWeekday: weekdayOf(a),
    endWeekday: weekdayOf(b),
  };
}

export type DateUnit = 'day' | 'week' | 'month' | 'year';

export interface AddResult {
  valid: boolean;
  date: string;
  weekday: string;
}

/** 날짜에 더하기/빼기 (amount가 음수면 빼기) */
export function addToDate(base: string, amount: number, unit: DateUnit): AddResult {
  const t = parseYMD(base);
  if (t === null || !Number.isFinite(amount)) return { valid: false, date: '', weekday: '' };
  const n = Math.trunc(amount);
  let r: number;
  if (unit === 'day') r = t + n * DAY;
  else if (unit === 'week') r = t + n * 7 * DAY;
  else if (unit === 'month') r = addMonths(t, n);
  else r = addMonths(t, n * 12);
  return { valid: true, date: formatYMD(r), weekday: weekdayOf(r) };
}

export interface AgeResult {
  valid: boolean;
  /** 만 나이 (생일이 지나야 한 살 증가) */
  manAge: number;
  /** 연 나이 (기준 연도 − 출생 연도) */
  yearAge: number;
  /** 세는 나이 (연 나이 + 1) */
  koreanAge: number;
  /** 다음 생일 */
  nextBirthday: string;
  /** 다음 생일까지 남은 일수 (오늘이 생일이면 0) */
  daysToBirthday: number;
  /** 태어난 지 며칠째 (태어난 날 = 1일째) */
  daysSinceBirth: number;
}

/**
 * 만 나이. 2월 29일생은 평년에 3월 1일에 나이가 듭니다(민법상 기간 계산과 같이 말일 다음 날).
 */
export function age(birth: string, ref: string): AgeResult {
  const b = parseYMD(birth);
  const r = parseYMD(ref);
  const bad: AgeResult = { valid: false, manAge: 0, yearAge: 0, koreanAge: 0, nextBirthday: '', daysToBirthday: 0, daysSinceBirth: 0 };
  if (b === null || r === null || r < b) return bad;

  const bd = new Date(b);
  const rd = new Date(r);
  const by = bd.getUTCFullYear();
  const bm = bd.getUTCMonth();
  const bday = bd.getUTCDate();

  /** y년의 생일 (2/29생이 평년이면 3/1) */
  const birthdayIn = (y: number) => {
    const t = Date.UTC(y, bm, bday);
    return new Date(t).getUTCMonth() === bm ? t : Date.UTC(y, bm + 1, 1);
  };

  const ry = rd.getUTCFullYear();
  const thisYear = birthdayIn(ry);
  const manAge = ry - by - (r < thisYear ? 1 : 0);
  const next = r <= thisYear ? thisYear : birthdayIn(ry + 1);

  return {
    valid: true,
    manAge,
    yearAge: ry - by,
    koreanAge: ry - by + 1,
    nextBirthday: formatYMD(next),
    daysToBirthday: Math.round((next - r) / DAY),
    daysSinceBirth: Math.round((r - b) / DAY) + 1,
  };
}
