import { RATES } from '../rates/2026.ts';

export interface WeeklyHolidayInput {
  /** 시급 (원) */
  hourlyWage: number;
  /** 1주 소정근로시간 */
  weeklyHours: number;
}

export interface WeeklyHolidayResult {
  eligible: boolean;
  /** 주휴시간 (1주) */
  holidayHours: number;
  /** 주휴수당 (1주, 원) */
  weeklyHolidayPay: number;
  /** 주휴수당 월 환산 (원) */
  monthlyHolidayPay: number;
  /** 주 근로 급여 (주휴수당 제외) */
  weeklyBasePay: number;
  /** 월 환산 총급여 (기본급 + 주휴수당) */
  monthlyTotal: number;
  /** 월 환산 근로시간 (주휴 포함) */
  monthlyPaidHours: number;
  /** 최저시급 이상인지 */
  meetsMinWage: boolean;
}

/**
 * 주휴수당 = (1주 소정근로시간 ÷ 40) × 8 × 시급  (주 40시간 초과분은 40으로 제한)
 * 주 15시간 미만이면 주휴수당 없음. 1주 개근 가정.
 */
export function calcWeeklyHolidayPay(input: WeeklyHolidayInput): WeeklyHolidayResult {
  const hours = Math.max(0, input.weeklyHours);
  const wage = Math.max(0, input.hourlyWage);
  const eligible = hours >= 15;
  const holidayHours = eligible ? (Math.min(hours, 40) / 40) * 8 : 0;
  const weeklyHolidayPay = Math.floor(holidayHours * wage);
  const weeklyBasePay = Math.floor(hours * wage);
  const w = RATES.weeksPerMonth;
  // 월 환산 시간은 관행대로 정수로 반올림 (주 40시간 → 174 + 35 = 209시간)
  const monthlyBaseHours = Math.round(hours * w);
  const monthlyHolidayHours = Math.round(holidayHours * w);

  return {
    eligible,
    holidayHours,
    weeklyHolidayPay,
    monthlyHolidayPay: Math.floor(monthlyHolidayHours * wage),
    weeklyBasePay,
    monthlyTotal: Math.floor((monthlyBaseHours + monthlyHolidayHours) * wage),
    monthlyPaidHours: monthlyBaseHours + monthlyHolidayHours,
    meetsMinWage: wage >= RATES.minWageHourly,
  };
}
