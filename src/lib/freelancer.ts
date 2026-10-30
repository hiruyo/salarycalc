import { RATES } from '../rates/2026.ts';

export interface FreelancerResult {
  /** 세전 지급액 (계약 금액) */
  gross: number;
  /** 소득세 3% */
  incomeTax: number;
  /** 지방소득세 0.3% (소득세의 10%) */
  localIncomeTax: number;
  /** 원천징수 합계 */
  taxTotal: number;
  /** 실수령액 */
  net: number;
}

const floor10 = (n: number) => Math.floor(n / 10) * 10;

/** 세전 금액 → 3.3% 원천징수 후 실수령액. 세액은 10원 미만 절사. */
export function freelancerFromGross(gross: number): FreelancerResult {
  const g = Math.max(0, Math.floor(gross));
  const incomeTax = floor10(g * RATES.freelancerIncomeTaxRate);
  const localIncomeTax = floor10(incomeTax * RATES.localIncomeTaxRate);
  const taxTotal = incomeTax + localIncomeTax;
  return { gross: g, incomeTax, localIncomeTax, taxTotal, net: g - taxTotal };
}

/**
 * 받고 싶은 실수령액 → 필요한 세전 금액.
 * 실수령액이 목표 이상이 되는 가장 작은 세전 금액(원 단위)을 찾습니다.
 */
export function freelancerFromNet(targetNet: number): FreelancerResult {
  const t = Math.max(0, Math.floor(targetNet));
  if (t === 0) return freelancerFromGross(0);
  const rate = RATES.freelancerIncomeTaxRate * (1 + RATES.localIncomeTaxRate); // 0.033
  let g = Math.floor(t / (1 - rate)) - 20;
  if (g < 0) g = 0;
  // 절사 때문에 생기는 오차는 수십 원 이내라서 선형 탐색으로 충분
  while (freelancerFromGross(g).net < t) g++;
  return freelancerFromGross(g);
}
