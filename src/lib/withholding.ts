import { WITHHOLDING_ROWS, WITHHOLDING_AT_10M } from '../rates/withholding2026.ts';

/**
 * 근로소득 간이세액표(소득세법 시행령 별표 2, 2026.2.27 개정) 조회.
 * 급여명세서의 소득세와 같은 방식으로 계산합니다.
 */

const floor10 = (n: number) => Math.floor(n / 10) * 10;

/** 8세 이상 20세 이하 자녀 수별 세액 공제액 (표 주석 3) */
export function childDeduction(children: number): number {
  if (children <= 0) return 0;
  if (children === 1) return 20_830;
  if (children === 2) return 45_830;
  return 45_830 + (children - 2) * 33_330;
}

/** 공제대상가족 f명(1~11)일 때 월급여(비과세 제외, 원)에 대한 세액 */
function taxForFamily(monthly: number, f: number): number {
  const k = monthly / 1000; // 천원 단위
  const col = f - 1;

  if (k < WITHHOLDING_ROWS[0][0]) return 0;

  if (k < 10_000) {
    // 이진 탐색: low <= k < high
    let lo = 0;
    let hi = WITHHOLDING_ROWS.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (WITHHOLDING_ROWS[mid][0] <= k) lo = mid;
      else hi = mid - 1;
    }
    return WITHHOLDING_ROWS[lo][2 + col];
  }

  const base = WITHHOLDING_AT_10M[col];
  if (k === 10_000) return base;

  // 10,000천원 초과 구간 공식 (표 하단)
  const x = monthly;
  if (x <= 14_000_000) return base + (x - 10_000_000) * 0.98 * 0.35 + 25_000;
  if (x <= 28_000_000) return base + 1_397_000 + (x - 14_000_000) * 0.98 * 0.38;
  if (x <= 30_000_000) return base + 6_610_600 + (x - 28_000_000) * 0.98 * 0.4;
  if (x <= 45_000_000) return base + 7_394_600 + (x - 30_000_000) * 0.4;
  if (x <= 87_000_000) return base + 13_394_600 + (x - 45_000_000) * 0.42;
  return base + 31_034_600 + (x - 87_000_000) * 0.45;
}

/**
 * 월 소득세 (지방소득세 제외)
 * @param monthlyTaxable 월급여액 (비과세·학자금 제외, 원)
 * @param familyCount 공제대상가족 수 (본인·배우자 포함)
 * @param children 8세 이상 20세 이하 자녀 수
 */
export function monthlyIncomeTax(monthlyTaxable: number, familyCount: number, children: number): number {
  const family = Math.max(1, Math.floor(familyCount));
  let tax: number;
  if (family <= 11) {
    tax = taxForFamily(monthlyTaxable, family);
  } else {
    // 표 주석 4: 11명 세액 - (10명 세액 - 11명 세액) × 초과 인원
    const t11 = taxForFamily(monthlyTaxable, 11);
    const t10 = taxForFamily(monthlyTaxable, 10);
    tax = t11 - (t10 - t11) * (family - 11);
  }
  tax -= childDeduction(Math.max(0, Math.floor(children)));
  return Math.max(0, floor10(tax));
}
