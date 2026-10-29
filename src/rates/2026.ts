/**
 * 2026년 기준 요율·공제 상수.
 * 매년 이 파일만 복사해서 (2027.ts) 값을 갱신하면 됩니다. 갱신 체크리스트는 README 참고.
 *
 * 출처 (확인일: 2026-10-30)
 * - 국민연금 9.5%, 기준소득월액 상·하한(2026.7~2027.6: 659만/41만): 보건복지부 2026년 제1차 국민연금심의위원회
 * - 건강보험 7.19%, 장기요양 건강보험료의 13.14%, 고용보험 근로자 0.9%: 2026년 고시 (공단 공식 자료로 재확인 권장)
 * - 최저시급 10,320원: 2026년 확정 최저임금
 * - 소득세: 소득세법 시행령 [별표 2] 근로소득 간이세액표 (2026.2.27 개정) → withholding2026.ts
 */
export const RATES = {
  year: 2026,

  pension: {
    rate: 0.095, // 근로자·회사 합산
    employeeShare: 0.5,
    // 2026.7.1 ~ 2027.6.30 적용. (2026.1~6월은 상한 6,370,000 / 하한 400,000)
    lower: 410_000,
    upper: 6_590_000,
  },

  health: {
    rate: 0.0719, // 근로자·회사 합산
    employeeShare: 0.5,
  },

  longTermCare: {
    rateOfHealthPremium: 0.1314, // 건강보험료 대비
    employeeShare: 0.5,
  },

  employment: {
    employeeRate: 0.009,
  },

  /** 월 비과세 식대 한도 */
  mealAllowanceExemptMax: 200_000,

  minWageHourly: 10_320,

  // 소득세는 국세청 근로소득 간이세액표(withholding2026.ts)를 조회해 계산합니다.
  localIncomeTaxRate: 0.1, // 지방소득세 = 소득세의 10%

  /** 주휴수당 월 환산 주수 (365 / 7 / 12) */
  weeksPerMonth: 365 / 7 / 12,
} as const;

export type Rates = typeof RATES;
