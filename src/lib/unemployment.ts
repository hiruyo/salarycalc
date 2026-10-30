import { RATES } from '../rates/2026.ts';
import { daysInLast3Months } from './severance.ts';

/** 고용보험 피보험기간 구간 (별표 1 열 순서) */
export type InsuredPeriod = 'under1' | '1to3' | '3to5' | '5to10' | 'over10';

const PERIOD_INDEX: Record<InsuredPeriod, number> = {
  under1: 0,
  '1to3': 1,
  '3to5': 2,
  '5to10': 3,
  over10: 4,
};

export interface UnemploymentInput {
  /** 마지막 근무일 (YYYY-MM-DD) */
  lastWorkDate: string;
  /** 이직 전 3개월 임금 총액 (원, 세전) */
  last3MonthsPay: number;
  /** 이직일 현재 만 나이 */
  age: number;
  /** 장애인 여부 (장애인고용촉진법상 장애인 → 50세 이상 기준 적용) */
  disabled?: boolean;
  /** 고용보험 가입기간 구간 */
  insuredPeriod: InsuredPeriod;
  /** 1일 소정근로시간 (기본 8, 최대 8) */
  dailyHours?: number;
}

export interface UnemploymentResult {
  valid: boolean;
  /** 1일 평균임금 */
  averageDailyWage: number;
  /** 평균임금 × 60% (상·하한 적용 전) */
  rawDailyBenefit: number;
  /** 1일 하한액 */
  dailyMin: number;
  /** 1일 상한액 */
  dailyMax: number;
  /** 구직급여일액 (상·하한 적용) */
  dailyBenefit: number;
  /** 'max' | 'min' | null : 상한·하한 적용 여부 */
  limitApplied: 'max' | 'min' | null;
  /** 소정급여일수 */
  benefitDays: number;
  /** 월 환산 (일액 × 30) */
  monthlyBenefit: number;
  /** 총 예상 수령액 (일액 × 소정급여일수) */
  totalBenefit: number;
}

/**
 * 구직급여일액 = 평균임금 × 60%  (상한 68,100원, 하한 최저시급 × 80% × 1일 소정근로시간)
 * 평균임금 = 이직 전 3개월 임금 총액 ÷ 그 기간의 총 일수
 * 총액 = 구직급여일액 × 소정급여일수 (이직일 현재 연령·피보험기간으로 결정)
 *
 * 수급 자격(이직 전 18개월 중 피보험단위기간 180일 이상, 비자발적 이직 등)은 판정하지 않습니다.
 */
export function calcUnemployment(input: UnemploymentInput): UnemploymentResult {
  const u = RATES.unemployment;
  const days3 = daysInLast3Months(input.lastWorkDate);
  const hours = Math.min(Math.max(input.dailyHours ?? u.maxDailyHours, 1), u.maxDailyHours);
  const dailyMin = Math.floor(RATES.minWageHourly * u.minWageRatio * hours);

  if (days3 === null) {
    return {
      valid: false,
      averageDailyWage: 0,
      rawDailyBenefit: 0,
      dailyMin,
      dailyMax: u.dailyMax,
      dailyBenefit: 0,
      limitApplied: null,
      benefitDays: 0,
      monthlyBenefit: 0,
      totalBenefit: 0,
    };
  }

  const averageDailyWage = Math.max(0, input.last3MonthsPay) / days3;
  const rawDailyBenefit = Math.floor(averageDailyWage * u.benefitRate);

  let dailyBenefit = rawDailyBenefit;
  let limitApplied: UnemploymentResult['limitApplied'] = null;
  if (dailyBenefit > u.dailyMax) {
    dailyBenefit = u.dailyMax;
    limitApplied = 'max';
  } else if (dailyBenefit < dailyMin) {
    dailyBenefit = dailyMin;
    limitApplied = 'min';
  }

  const row = input.disabled || input.age >= 50 ? u.benefitDays.over50OrDisabled : u.benefitDays.under50;
  const benefitDays = row[PERIOD_INDEX[input.insuredPeriod]];

  return {
    valid: true,
    averageDailyWage: Math.floor(averageDailyWage),
    rawDailyBenefit,
    dailyMin,
    dailyMax: u.dailyMax,
    dailyBenefit,
    limitApplied,
    benefitDays,
    monthlyBenefit: dailyBenefit * 30,
    totalBenefit: dailyBenefit * benefitDays,
  };
}
