export interface SeveranceInput {
  /** 입사일 (YYYY-MM-DD) */
  startDate: string;
  /** 마지막 근무일 (YYYY-MM-DD) */
  endDate: string;
  /** 퇴직 전 3개월간 받은 임금 총액 (원, 세전, 기본급+수당 포함) */
  last3MonthsPay: number;
  /** 연간 상여금 총액 (원). 퇴직금 산정에 3/12 반영 */
  annualBonus?: number;
  /** 연차수당 (원, 직전 연도 지급분). 퇴직금 산정에 3/12 반영 */
  annualLeavePay?: number;
}

export interface SeveranceResult {
  valid: boolean;
  /** 지급 대상 (계속근로기간 1년 이상) */
  eligible: boolean;
  /** 재직일수 (입사일·마지막 근무일 포함) */
  tenureDays: number;
  /** 퇴직 전 3개월의 총 일수 (달력일수) */
  last3MonthsDays: number;
  /** 1일 평균임금 (원) */
  averageDailyWage: number;
  /** 퇴직금 (세전, 원) */
  severancePay: number;
}

const DAY = 86_400_000;

function parseDate(s: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const t = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(t) ? null : t;
}

/** 월을 빼되, 대상 월에 해당 일이 없으면 그 달의 마지막 날로 맞춤 */
function minusMonths(ts: number, months: number): number {
  const d = new Date(ts);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() - months;
  const day = d.getUTCDate();
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return Date.UTC(y, m, Math.min(day, lastDay));
}

/**
 * 마지막 근무일 기준 "퇴직(이직) 전 3개월"의 달력 일수.
 * (마지막 근무일 다음 날)에서 3개월 전까지. 날짜가 잘못되면 null.
 */
export function daysInLast3Months(endDate: string): number | null {
  const end = parseDate(endDate);
  if (end === null) return null;
  const periodEnd = end + DAY;
  return Math.round((periodEnd - minusMonths(periodEnd, 3)) / DAY);
}

/**
 * 퇴직금 =1일 평균임금 × 30일 × (재직일수 ÷ 365)
 * 1일 평균임금 = (퇴직 전 3개월 임금 + 상여금×3/12 + 연차수당×3/12) ÷ 퇴직 전 3개월 총 일수
 *
 * 평균임금이 통상임금보다 낮은 경우(통상임금 적용)와 퇴직소득세는 반영하지 않습니다.
 */
export function calcSeverance(input: SeveranceInput): SeveranceResult {
  const empty: SeveranceResult = {
    valid: false,
    eligible: false,
    tenureDays: 0,
    last3MonthsDays: 0,
    averageDailyWage: 0,
    severancePay: 0,
  };

  const start = parseDate(input.startDate);
  const end = parseDate(input.endDate);
  if (start === null || end === null || end < start) return empty;

  const tenureDays = Math.round((end - start) / DAY) + 1;

  const last3MonthsDays = daysInLast3Months(input.endDate)!;

  const pay = Math.max(0, input.last3MonthsPay);
  const bonus = Math.max(0, input.annualBonus ?? 0);
  const leave = Math.max(0, input.annualLeavePay ?? 0);
  const total = pay + (bonus * 3) / 12 + (leave * 3) / 12;
  const averageDailyWage = total / last3MonthsDays;

  const eligible = tenureDays >= 365;
  const severancePay = eligible ? Math.floor((averageDailyWage * 30 * tenureDays) / 365) : 0;

  return {
    valid: true,
    eligible,
    tenureDays,
    last3MonthsDays,
    averageDailyWage: Math.floor(averageDailyWage),
    severancePay,
  };
}
