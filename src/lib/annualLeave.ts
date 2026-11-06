/**
 * 연차유급휴가 계산 (근로기준법 제60조, 입사일 기준)
 *
 * - 1년 미만(또는 1년간 80% 미만 출근): 1개월 개근 시 1일 → 최대 11일
 *   1개월 근로를 마친 "다음 날" 재직 중이어야 발생 (2021.12 고용노동부 행정해석, 대법원 2021.10.14 판결)
 * - 1년간 80% 이상 출근: 15일. 1년 근로를 마친 다음 날(입사 366일째) 재직 중이어야 발생
 * - 3년 이상: 최초 1년을 초과하는 계속근로 매 2년마다 1일 가산, 총 25일 한도
 * - 단시간 근로자: 통상 근로자 연차일수 × 소정근로시간 ÷ 통상 근로자 소정근로시간(40) × 8시간, 1시간 미만은 1시간
 *   (근로기준법 시행령 별표 2)
 * - 상시 5인 미만 사업장, 4주 평균 1주 소정근로시간 15시간 미만 근로자는 적용 제외
 *
 * 매월 개근, 매년 80% 이상 출근을 가정합니다.
 */
import { parseYMD, addMonths, formatYMD } from './dateCalc.ts';

const DAY = 86_400_000;
const FULL_TIME_WEEKLY_HOURS = 40;
const MAX_LEAVE = 25;
const FIRST_YEAR_MONTHLY_MAX = 11;

/** 근속 n년(n ≥ 1)을 마친 뒤 발생하는 연차 일수 */
export function leaveDaysForYear(n: number): number {
  if (n < 1) return 0;
  return Math.min(MAX_LEAVE, 15 + Math.floor((n - 1) / 2));
}

export interface LeaveGrant {
  /** 1년 미만 월 연차면 'month', 연 단위 연차면 'year' */
  kind: 'month' | 'year';
  /** 'month'면 몇 개월째, 'year'면 근속 몇 년 */
  index: number;
  /** 발생일 (YYYY-MM-DD) */
  date: string;
  days: number;
}

export interface AnnualLeaveInput {
  /** 입사일 */
  startDate: string;
  /** 기준일 (재직 중인 날, 퇴사자는 마지막 근무일) */
  refDate: string;
  /** 1주 소정근로시간 (기본 40) */
  weeklyHours?: number;
  /** 통상시급 (원). 연차수당 계산용 */
  hourlyWage?: number;
  /** 미사용 연차 일수. 연차수당 계산용 */
  unusedDays?: number;
}

export interface AnnualLeaveResult {
  valid: boolean;
  /** 주 15시간 이상이라 연차 적용 대상인지 */
  eligible: boolean;
  /** 재직일수 (입사일 포함) */
  tenureDays: number;
  /** 근속 만 년수 */
  yearsCompleted: number;
  /** 기준일까지 발생한 1년 미만 월 연차 개수 */
  monthlyLeaveDays: number;
  /** 가장 최근에 발생한 연 단위 연차 (없으면 null) */
  latestYearGrant: LeaveGrant | null;
  /** 다음에 발생할 연차 */
  nextGrant: LeaveGrant | null;
  /** 기준일까지 발생한 연차 총합 (입사 이후 전체, 일) */
  totalAccruedDays: number;
  /** 연차 1일의 시간 (통상 근로자 8시간, 단시간은 비례) */
  hoursPerDay: number;
  /** 근속연수별 연차 일정 (1~25년차 상한 도달까지) */
  schedule: LeaveGrant[];
  /** 미사용 연차수당 (원) */
  allowance: number;
  /** 미사용 연차 시간 */
  unusedHours: number;
}

/** 단시간 근로자의 연차 시간: 1시간 미만은 1시간으로 (올림) */
export function leaveHours(days: number, weeklyHours: number): number {
  if (days <= 0) return 0;
  const h = Math.min(weeklyHours, FULL_TIME_WEEKLY_HOURS);
  return Math.ceil(((days * h) / FULL_TIME_WEEKLY_HOURS) * 8 - 1e-9);
}

export function calcAnnualLeave(input: AnnualLeaveInput): AnnualLeaveResult {
  const weekly = Math.max(0, input.weeklyHours ?? FULL_TIME_WEEKLY_HOURS);
  const s = parseYMD(input.startDate);
  const r = parseYMD(input.refDate);
  const empty: AnnualLeaveResult = {
    valid: false, eligible: false, tenureDays: 0, yearsCompleted: 0, monthlyLeaveDays: 0,
    latestYearGrant: null, nextGrant: null, totalAccruedDays: 0, hoursPerDay: 8, schedule: [],
    allowance: 0, unusedHours: 0,
  };
  if (s === null || r === null || r < s) return empty;

  const eligible = weekly >= 15;
  const hoursPerDay = (Math.min(weekly, FULL_TIME_WEEKLY_HOURS) / FULL_TIME_WEEKLY_HOURS) * 8;
  const tenureDays = Math.round((r - s) / DAY) + 1;

  // 1년 미만 월 연차: k개월 근로를 마친 다음 날 = addMonths(s, k)
  const monthly: LeaveGrant[] = [];
  for (let k = 1; k <= FIRST_YEAR_MONTHLY_MAX; k++) {
    monthly.push({ kind: 'month', index: k, date: formatYMD(addMonths(s, k)), days: 1 });
  }

  // 연 단위 연차: n년 근로를 마친 다음 날 = addMonths(s, 12n). 25일 도달(21년차)까지 표시
  const schedule: LeaveGrant[] = [];
  for (let n = 1; ; n++) {
    const days = leaveDaysForYear(n);
    schedule.push({ kind: 'year', index: n, date: formatYMD(addMonths(s, 12 * n)), days });
    if (days >= MAX_LEAVE) break;
  }

  const arisen = (g: LeaveGrant) => parseYMD(g.date)! <= r;
  const monthlyArisen = eligible ? monthly.filter(arisen) : [];
  // 기준일이 25일 도달 이후여도 매년 계속 발생
  let yearsCompleted = 0;
  while (addMonths(s, 12 * (yearsCompleted + 1)) <= r) yearsCompleted++;
  const yearGrants: LeaveGrant[] = [];
  if (eligible) {
    for (let n = 1; n <= yearsCompleted; n++) {
      yearGrants.push({ kind: 'year', index: n, date: formatYMD(addMonths(s, 12 * n)), days: leaveDaysForYear(n) });
    }
  }

  const upcomingMonthly = monthly.find((g) => !arisen(g));
  const n1 = yearsCompleted + 1;
  const nextYear: LeaveGrant = { kind: 'year', index: n1, date: formatYMD(addMonths(s, 12 * n1)), days: leaveDaysForYear(n1) };
  const nextGrant = !eligible ? null : upcomingMonthly ?? nextYear;

  const totalAccruedDays =
    monthlyArisen.reduce((a, g) => a + g.days, 0) + yearGrants.reduce((a, g) => a + g.days, 0);

  const unusedDays = Math.max(0, input.unusedDays ?? 0);
  const unusedHours = eligible ? leaveHours(unusedDays, weekly) : 0;
  const allowance = Math.floor(unusedHours * Math.max(0, input.hourlyWage ?? 0));

  return {
    valid: true,
    eligible,
    tenureDays,
    yearsCompleted,
    monthlyLeaveDays: monthlyArisen.length,
    latestYearGrant: yearGrants.at(-1) ?? null,
    nextGrant,
    totalAccruedDays,
    hoursPerDay,
    schedule,
    allowance,
    unusedHours,
  };
}
