/**
 * 주식 계산 (평단가·실현손익·해외주식 양도세·배당). 순수 로직이라 테스트 가능.
 * 금액은 원 단위, 해외 가격은 달러(소수) 단위로 받습니다.
 */
import { RATES } from '../rates/2026.ts';

const S = RATES.stock;
// 1e-6: 부동소수점 오차 보정
const floor = (n: number) => Math.floor(n + 1e-6);
const floor10 = (n: number) => Math.floor(n / 10 + 1e-6) * 10;
const pos = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0);

/* ───────── 평단가(물타기) ───────── */

export interface Lot {
  price: number;
  qty: number;
}

export interface AverageResult {
  totalQty: number;
  totalCost: number;
  /** 새 평균단가 (원, 소수 둘째 자리 반올림) */
  average: number;
  /** 기존 평단 대비 변화율 (기존 보유가 없으면 0) */
  changeRate: number;
  /** 추가 매수에 드는 금액 */
  addCost: number;
  /** 현재가가 있으면 평가 금액·손익·수익률 */
  value: number | null;
  profit: number | null;
  profitRate: number | null;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function calcAverage(held: Lot, buys: Lot[], currentPrice = 0): AverageResult {
  const lots = [held, ...buys].map((l) => ({ price: pos(l.price), qty: Math.floor(pos(l.qty)) })).filter((l) => l.qty > 0 && l.price > 0);
  const totalQty = lots.reduce((a, l) => a + l.qty, 0);
  const totalCost = lots.reduce((a, l) => a + l.price * l.qty, 0);
  const average = totalQty ? round2(totalCost / totalQty) : 0;
  const heldAvg = pos(held.price) && pos(held.qty) ? pos(held.price) : 0;
  const addCost = buys.reduce((a, l) => a + pos(l.price) * Math.floor(pos(l.qty)), 0);
  const cp = pos(currentPrice);
  const value = cp && totalQty ? cp * totalQty : null;
  return {
    totalQty,
    totalCost: Math.round(totalCost),
    average,
    changeRate: heldAvg && average ? average / heldAvg - 1 : 0,
    addCost: Math.round(addCost),
    value: value === null ? null : Math.round(value),
    profit: value === null ? null : Math.round(value - totalCost),
    profitRate: value === null || !totalCost ? null : value / totalCost - 1,
  };
}

/**
 * 목표 평단가를 만들려면 buyPrice에 몇 주를 사야 하는지.
 * n = Q(A − T) / (T − P). 목표가 기존 평단과 매수가 사이에 있어야 가능.
 */
export function sharesForTarget(heldQty: number, heldAvg: number, buyPrice: number, target: number): { qty: number; cost: number; average: number } | null {
  const Q = Math.floor(pos(heldQty));
  const A = pos(heldAvg);
  const P = pos(buyPrice);
  const T = pos(target);
  if (!Q || !A || !P || !T) return null;
  const between = (P < T && T < A) || (A < T && T < P);
  if (!between) return null;
  const qty = Math.ceil((Q * (A - T)) / (T - P) - 1e-9);
  const average = round2((Q * A + qty * P) / (Q + qty));
  return { qty, cost: Math.round(qty * P), average };
}

/* ───────── 국내 주식 실현손익 ───────── */

export type Market = keyof typeof S.markets;

export interface TradeInput {
  market: Market;
  buyPrice: number;
  sellPrice: number;
  qty: number;
  /** 증권사 수수료율 (예: 0.00015 = 0.015%), 매수·매도 각각 */
  feeRate: number;
}

export interface TradeResult {
  buyAmount: number;
  buyFee: number;
  sellAmount: number;
  sellFee: number;
  transactionTax: number;
  ruralTax: number;
  costs: number;
  /** 실현손익 = 매도금액 − 매수금액 − 수수료 − 세금 */
  profit: number;
  /** 수익률 = 실현손익 ÷ (매수금액 + 매수 수수료) */
  profitRate: number;
  /** 수수료·세금까지 본전이 되는 매도가 (원 단위 올림) */
  breakEven: number;
  taxRate: number;
}

export function calcTrade(i: TradeInput): TradeResult {
  const m = S.markets[i.market] ?? S.markets.kospi;
  const qty = Math.floor(pos(i.qty));
  const fee = pos(i.feeRate);
  const buyAmount = Math.round(pos(i.buyPrice) * qty);
  const sellAmount = Math.round(pos(i.sellPrice) * qty);
  // 증권사 수수료는 보통 원 미만 절사, 거래세·농특세도 원 미만 절사
  const buyFee = floor(buyAmount * fee);
  const sellFee = floor(sellAmount * fee);
  const transactionTax = floor(sellAmount * m.transactionTax);
  const ruralTax = floor(sellAmount * m.ruralTax);
  const costs = buyFee + sellFee + transactionTax + ruralTax;
  const profit = sellAmount - buyAmount - costs;
  const base = buyAmount + buyFee;
  const taxRate = m.transactionTax + m.ruralTax;
  const bp = pos(i.buyPrice);
  const breakEven = bp ? Math.ceil((bp * (1 + fee)) / (1 - fee - taxRate) - 1e-9) : 0;
  return { buyAmount, buyFee, sellAmount, sellFee, transactionTax, ruralTax, costs, profit, profitRate: base ? profit / base : 0, breakEven, taxRate };
}

/* ───────── 해외주식 양도소득세 ───────── */

export interface OverseasTrade {
  /** 매수 단가 (달러) */
  buyPrice: number;
  /** 매도 단가 (달러) */
  sellPrice: number;
  qty: number;
  /** 매수 결제일 기준환율 (원/달러) */
  buyRate: number;
  /** 매도 결제일 기준환율 (원/달러) */
  sellRate: number;
}

export interface OverseasTradeResult {
  proceeds: number;
  cost: number;
  fees: number;
  gain: number;
}

export interface OverseasTaxResult {
  trades: OverseasTradeResult[];
  /** 올해 양도차익 합계 (손실과 이익을 합친 값) */
  totalGain: number;
  basicDeduction: number;
  taxBase: number;
  incomeTax: number;
  localTax: number;
  totalTax: number;
  /** 세금이 0원이 되려면 추가로 확정해야 하는 손실 */
  lossToZero: number;
}

export function overseasTrade(t: OverseasTrade, feeRate: number): OverseasTradeResult | null {
  const qty = pos(t.qty);
  if (!qty || !pos(t.buyPrice) || !pos(t.sellPrice) || !pos(t.buyRate) || !pos(t.sellRate)) return null;
  const f = pos(feeRate);
  const buyUsd = t.buyPrice * qty;
  const sellUsd = t.sellPrice * qty;
  const cost = Math.round(buyUsd * t.buyRate);
  const proceeds = Math.round(sellUsd * t.sellRate);
  // 수수료는 각 거래의 환율로 원화 환산해 필요경비에 넣음
  const fees = Math.round(buyUsd * f * t.buyRate + sellUsd * f * t.sellRate);
  return { proceeds, cost, fees, gain: proceeds - cost - fees };
}

export function calcOverseasTax(trades: OverseasTrade[], feeRate: number, otherGain = 0): OverseasTaxResult {
  const rs = trades.map((t) => overseasTrade(t, feeRate)).filter((r): r is OverseasTradeResult => r !== null);
  const totalGain = rs.reduce((a, r) => a + r.gain, 0) + Math.round(Number(otherGain) || 0);
  const basicDeduction = Math.min(S.overseas.basicDeduction, Math.max(0, totalGain));
  const taxBase = Math.max(0, totalGain - basicDeduction);
  const incomeTax = floor(taxBase * S.overseas.taxRate);
  const localTax = floor(incomeTax * RATES.localIncomeTaxRate);
  return {
    trades: rs,
    totalGain,
    basicDeduction,
    taxBase,
    incomeTax,
    localTax,
    totalTax: incomeTax + localTax,
    lossToZero: taxBase,
  };
}

/* ───────── 배당금 ───────── */

export type DividendMarket = 'domestic' | 'us';

export interface DividendInput {
  /** 1년 세전 배당금 (원) */
  annualGross: number;
  /** 1년 지급 횟수 (1·2·4·12) */
  payments: number;
  market: DividendMarket;
}

export interface DividendResult {
  perPaymentGross: number;
  perPaymentTax: number;
  perPaymentNet: number;
  annualGross: number;
  /** 국내: 소득세 14%, 미국: 현지 원천징수 15% */
  annualIncomeTax: number;
  /** 국내: 지방소득세 1.4% (미국은 0) */
  annualLocalTax: number;
  annualTax: number;
  annualNet: number;
  monthlyNet: number;
  /** 금융소득 종합과세 기준(2,000만원) 초과 여부 */
  overThreshold: boolean;
}

export function dividendTax(gross: number, market: DividendMarket): { incomeTax: number; localTax: number } {
  const g = Math.floor(pos(gross));
  if (market === 'us') return { incomeTax: floor(g * S.dividend.usWithholdingRate), localTax: 0 };
  const incomeTax = floor10(g * S.dividend.domesticIncomeTaxRate);
  return { incomeTax, localTax: floor10(incomeTax * RATES.localIncomeTaxRate) };
}

export function calcDividend(i: DividendInput): DividendResult {
  const n = [1, 2, 4, 12].includes(i.payments) ? i.payments : 1;
  const per = Math.floor(pos(i.annualGross) / n);
  const t = dividendTax(per, i.market);
  const perTax = t.incomeTax + t.localTax;
  const annualGross = per * n;
  const annualNet = (per - perTax) * n;
  return {
    perPaymentGross: per,
    perPaymentTax: perTax,
    perPaymentNet: per - perTax,
    annualGross,
    annualIncomeTax: t.incomeTax * n,
    annualLocalTax: t.localTax * n,
    annualTax: perTax * n,
    annualNet,
    monthlyNet: Math.floor(annualNet / 12),
    overThreshold: annualGross > S.dividend.comprehensiveThreshold,
  };
}

/** 세후 월 목표 배당을 받으려면 필요한 투자금 (배당수익률은 세전 연 기준, 예: 0.05) */
export function investmentForMonthly(targetMonthlyNet: number, yieldRate: number, market: DividendMarket): number {
  const y = pos(yieldRate);
  const t = pos(targetMonthlyNet);
  if (!y || !t) return 0;
  const netRatio = market === 'us' ? 1 - S.dividend.usWithholdingRate : 1 - S.dividend.domesticIncomeTaxRate * (1 + RATES.localIncomeTaxRate);
  return Math.ceil((t * 12) / netRatio / y / 10_000) * 10_000;
}
