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
    /** 사업주 실업급여분 (근로자와 같음) */
    employerRate: 0.009,
    /** 사업주만 내는 고용안정·직업능력개발사업분 (상시근로자 규모별) */
    stabilityRates: {
      u150: 0.0025, // 150인 미만
      p150: 0.0045, // 150인 이상 우선지원대상기업
      m1000: 0.0065, // 150인 이상 1,000인 미만
      o1000: 0.0085, // 1,000인 이상, 국가·지방자치단체
    },
  },

  /** 산재보험 평균 요율 (2026년 고시, 출퇴근재해 포함). 실제는 업종별로 다름 → 계산기에서 바꿔 입력 */
  industrialAccidentAvgRate: 0.0147,

  /** 월 비과세 식대 한도 */
  mealAllowanceExemptMax: 200_000,

  minWageHourly: 10_320,

  /**
   * 실업급여(구직급여) — 2026.1.1 이후 이직자 기준
   * 상한액: 고용보험법 시행령 개정 (66,000 → 68,100원)
   * 하한액: 최저시급 × 80% × 1일 소정근로시간 (8시간이면 66,048원)
   */
  unemployment: {
    benefitRate: 0.6, // 평균임금의 60%
    dailyMax: 68_100,
    minWageRatio: 0.8,
    maxDailyHours: 8,
    /** 소정급여일수 [피보험기간 1년 미만, 1~3년, 3~5년, 5~10년, 10년 이상] (고용보험법 별표 1) */
    benefitDays: {
      under50: [120, 150, 180, 210, 240],
      over50OrDisabled: [120, 180, 210, 240, 270],
    },
  },

  /** 프리랜서(인적용역 사업소득) 원천징수: 소득세 3% + 지방소득세(소득세의 10%) = 3.3% */
  freelancerIncomeTaxRate: 0.03,

  /**
   * 전월세 전환율 (주택임대차보호법 제7조의2, 시행령 제9조)
   * 법정 상한 = min(연 10%, 한국은행 기준금리 + 연 2%)
   * 기준금리는 금통위 결정 때마다 갱신 (2026-10-22 동결: 연 3.0%)
   */
  rentConversion: {
    baseRate: 0.03,
    baseRateAsOf: '2026-10-22',
    addOn: 0.02,
    cap: 0.1,
  },

  /**
   * 주식 (2026년 1월 1일 이후 양도분)
   * - 증권거래세: 코스피 0.05% + 농어촌특별세 0.15%, 코스닥·K-OTC 0.20%, 코넥스 0.10%
   * - 해외주식 양도소득세: (양도차익 − 연 250만원) × 20%, 지방소득세는 그 10%
   *   원화 환산은 매수·매도 각각의 결제일 기준환율
   * - 배당소득 원천징수: 소득세 14% + 지방소득세 1.4% (미국 주식은 현지 15%만 원천징수)
   * - 금융소득(이자+배당) 연 2,000만원 초과 시 종합과세 대상
   */
  stock: {
    markets: {
      kospi: { name: '코스피', transactionTax: 0.0005, ruralTax: 0.0015 },
      kosdaq: { name: '코스닥', transactionTax: 0.002, ruralTax: 0 },
      konex: { name: '코넥스', transactionTax: 0.001, ruralTax: 0 },
      kotc: { name: 'K-OTC', transactionTax: 0.002, ruralTax: 0 },
    },
    defaultFeeRate: 0.00015,
    overseas: { basicDeduction: 2_500_000, taxRate: 0.2, defaultFeeRate: 0.0025 },
    dividend: { domesticIncomeTaxRate: 0.14, usWithholdingRate: 0.15, comprehensiveThreshold: 20_000_000, minWithholding: 1_000 },
  },

  // 소득세는 국세청 근로소득 간이세액표(withholding2026.ts)를 조회해 계산합니다.
  localIncomeTaxRate: 0.1, // 지방소득세 = 소득세의 10%

  /** 주휴수당 월 환산 주수 (365 / 7 / 12) */
  weeksPerMonth: 365 / 7 / 12,
} as const;

export type Rates = typeof RATES;
