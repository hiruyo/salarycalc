/**
 * 2026년 귀속 연말정산 (2027년 1~2월 신고) 공제 기준.
 * 출처: 소득세법·조세특례제한법 (2025.12.2 국회 의결 개정 포함). 확인일 2026-11-07.
 * 매년 이 파일을 복사해 다음 귀속연도 값으로 갱신하세요.
 */
export const YEAR_END = {
  year: 2026,

  /** 근로소득공제 (소득세법 제47조) */
  earnedIncomeDeduction: {
    cap: 20_000_000,
    tiers: [
      { upTo: 5_000_000, base: 0, rate: 0.7, from: 0 },
      { upTo: 15_000_000, base: 3_500_000, rate: 0.4, from: 5_000_000 },
      { upTo: 45_000_000, base: 7_500_000, rate: 0.15, from: 15_000_000 },
      { upTo: 100_000_000, base: 12_000_000, rate: 0.05, from: 45_000_000 },
      { upTo: Infinity, base: 14_750_000, rate: 0.02, from: 100_000_000 },
    ],
  },

  /** 인적공제 */
  personal: { basic: 1_500_000, senior70: 1_000_000, disabled: 2_000_000 },

  /** 종합소득세율 (과세표준 → 세율, 누진공제) */
  brackets: [
    { upTo: 14_000_000, rate: 0.06, deduction: 0 },
    { upTo: 50_000_000, rate: 0.15, deduction: 1_260_000 },
    { upTo: 88_000_000, rate: 0.24, deduction: 5_760_000 },
    { upTo: 150_000_000, rate: 0.35, deduction: 15_440_000 },
    { upTo: 300_000_000, rate: 0.38, deduction: 19_940_000 },
    { upTo: 500_000_000, rate: 0.4, deduction: 25_940_000 },
    { upTo: 1_000_000_000, rate: 0.42, deduction: 35_940_000 },
    { upTo: Infinity, rate: 0.45, deduction: 65_940_000 },
  ],

  /** 근로소득세액공제 (소득세법 제59조) */
  earnedCredit: { lowLimit: 1_300_000, lowRate: 0.55, highBase: 715_000, highRate: 0.3 },

  /** 신용카드 등 소득공제 (조특법 제126조의2) — 2026년 사용분부터 자녀 수에 따라 기본한도 상향 */
  card: {
    minSpendRatio: 0.25,
    rates: { credit: 0.15, debitCash: 0.3, culture: 0.3, market: 0.4, transit: 0.4 },
    /** 문화체육(도서·공연·박물관·미술관·신문·영화·체육시설) 30%는 총급여 7천만원 이하만 */
    cultureSalaryMax: 70_000_000,
    highSalary: 70_000_000,
    /** 기본한도: [자녀 0명, 1명, 2명 이상] (기본공제 대상 직계비속: 20세 이하, 장애인은 나이 무관) */
    baseLimitLow: [3_000_000, 3_500_000, 4_000_000],
    baseLimitHigh: [2_500_000, 2_750_000, 3_000_000],
    /** 추가한도: 7천 이하 전통시장·대중교통·문화체육 합산 300만, 초과 전통시장·대중교통 합산 200만 */
    extraLimitLow: 3_000_000,
    extraLimitHigh: 2_000_000,
  },

  /** 주택청약종합저축 소득공제 (조특법 제87조): 총급여 7천 이하 무주택 세대주, 연 300만원 한도 40% */
  housingSubscription: { salaryMax: 70_000_000, limit: 3_000_000, rate: 0.4 },

  /** 소득공제 종합한도 (조특법 제132조의2) */
  deductionCap: 25_000_000,

  /**
   * 자녀세액공제 (소득세법 제59조의2, 2026.4.21 개정): 대상 나이를 13세로 올리되 부칙으로 단계 적용
   * 2026년 귀속 9세 이상. 단 2017년생은 단계 적용에서 제외(부칙 제2조③) → 실제 대상 2006~2016년생
   */
  childCredit: { minAge: 9, excludedBirthYear: 2017, one: 250_000, two: 550_000, perExtra: 400_000 },
  /** 출산·입양 세액공제: 첫째·둘째·셋째 이상 */
  birthCredit: [0, 300_000, 500_000, 700_000],
  /** 결혼세액공제 (조특법 제92조): 2024~2026년 혼인신고, 생애 1회 */
  marriageCredit: 500_000,

  /** 연금계좌 세액공제 (소득세법 제59조의3) */
  pension: { salaryHighRateMax: 55_000_000, highRate: 0.15, lowRate: 0.12, savingsLimit: 6_000_000, totalLimit: 9_000_000 },

  /** 특별세액공제 (소득세법 제59조의4) */
  insurance: { limit: 1_000_000, rate: 0.12 },
  medical: { thresholdRatio: 0.03, otherLimit: 7_000_000, rate: 0.15 },
  education: { rate: 0.15 },
  donation: { lowRate: 0.15, highRate: 0.3, threshold: 10_000_000 },
  standardCredit: 130_000,

  /** 월세 세액공제 (조특법 제95조의2) */
  rent: { salaryMax: 80_000_000, highRateSalaryMax: 55_000_000, highRate: 0.17, lowRate: 0.15, limit: 10_000_000 },

  localTaxRate: 0.1,
} as const;
