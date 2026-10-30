import { RATES } from '../rates/2026.ts';

/** 법정 전월세 전환율 상한 = min(10%, 기준금리 + 2%) */
export function legalConversionRate(baseRate: number = RATES.rentConversion.baseRate): number {
  const r = RATES.rentConversion;
  return Math.min(r.cap, baseRate + r.addOn);
}

export interface JeonseToWolseResult {
  valid: boolean;
  /** 월세로 바뀌는 보증금 (전세금 − 새 보증금) */
  convertedDeposit: number;
  /** 월세 */
  monthlyRent: number;
  /** 연간 월세 합계 */
  annualRent: number;
}

/** 전세 → 월세: 월세 = (전세보증금 − 새 보증금) × 전환율 ÷ 12 (원 단위 내림) */
export function jeonseToWolse(jeonseDeposit: number, newDeposit: number, rate: number): JeonseToWolseResult {
  const converted = jeonseDeposit - newDeposit;
  if (jeonseDeposit <= 0 || newDeposit < 0 || converted < 0 || rate <= 0) {
    return { valid: false, convertedDeposit: 0, monthlyRent: 0, annualRent: 0 };
  }
  const monthlyRent = Math.floor((converted * rate) / 12);
  return { valid: true, convertedDeposit: converted, monthlyRent, annualRent: monthlyRent * 12 };
}

export interface WolseToJeonseResult {
  valid: boolean;
  /** 월세를 보증금으로 환산한 금액 */
  depositFromRent: number;
  /** 환산 전세보증금 (기존 보증금 + 환산액) */
  jeonseDeposit: number;
}

/** 월세 → 전세: 전세보증금 = 보증금 + 월세 × 12 ÷ 전환율 (원 단위 내림) */
export function wolseToJeonse(deposit: number, monthlyRent: number, rate: number): WolseToJeonseResult {
  if (deposit < 0 || monthlyRent < 0 || rate <= 0) {
    return { valid: false, depositFromRent: 0, jeonseDeposit: 0 };
  }
  const depositFromRent = Math.floor((monthlyRent * 12) / rate);
  return { valid: true, depositFromRent, jeonseDeposit: deposit + depositFromRent };
}

/** 실제 계약의 전환율 = 월세 × 12 ÷ (전세금 − 월세 보증금) */
export function impliedConversionRate(jeonseDeposit: number, deposit: number, monthlyRent: number): number | null {
  const diff = jeonseDeposit - deposit;
  if (diff <= 0 || monthlyRent <= 0) return null;
  return (monthlyRent * 12) / diff;
}
