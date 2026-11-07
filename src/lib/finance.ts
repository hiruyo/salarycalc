/**
 * 금융 계산: 대출 상환(원리금균등·원금균등·만기일시), 예금·적금 이자, 대출 갈아타기.
 * 금액은 원 단위, 금리는 연 이율(예: 0.045 = 4.5%).
 */
import { RATES } from '../rates/2026.ts';

const F = RATES.finance;
const pos = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0);
const floor10 = (n: number) => Math.floor(n / 10 + 1e-6) * 10;

/* ───────── 대출 상환 ───────── */

export type RepayMethod = 'equal-payment' | 'equal-principal' | 'bullet';

export interface LoanInput {
  principal: number;
  /** 연 금리 */
  rate: number;
  /** 전체 기간 (개월, 거치기간 포함) */
  months: number;
  method: RepayMethod;
  /** 거치기간 (개월): 이자만 내는 기간 */
  graceMonths?: number;
}

export interface LoanRow {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
}

export interface LoanResult {
  rows: LoanRow[];
  totalInterest: number;
  totalPayment: number;
  /** 첫 달 상환액 (거치기간이면 이자만) */
  firstPayment: number;
  /** 거치 후 첫 원금 상환 달의 상환액 */
  firstAmortPayment: number;
  /** 마지막 달 상환액 */
  lastPayment: number;
  maxPayment: number;
}

/** 원리금균등 월 상환액 (원 단위 반올림 전) */
export function annuityPayment(principal: number, rate: number, months: number): number {
  const P = pos(principal);
  const n = Math.floor(pos(months));
  if (!P || !n) return 0;
  const i = pos(rate) / 12;
  if (!i) return P / n;
  const f = Math.pow(1 + i, n);
  return (P * i * f) / (f - 1);
}

/** 월별 이자는 원 단위 반올림, 마지막 달에 남은 원금을 모두 갚아 잔액 0으로 맞춤 */
export function calcLoan(input: LoanInput): LoanResult {
  const P = Math.round(pos(input.principal));
  const n = Math.floor(pos(input.months));
  const g = Math.min(Math.floor(pos(input.graceMonths ?? 0)), Math.max(0, n - 1));
  const i = pos(input.rate) / 12;
  const rows: LoanRow[] = [];
  let bal = P;
  const amortN = n - g;
  const pay = input.method === 'equal-payment' ? Math.round(annuityPayment(P, input.rate, amortN)) : 0;
  const principalEach = input.method === 'equal-principal' && amortN ? P / amortN : 0;

  for (let m = 1; m <= n && P > 0; m++) {
    const interest = Math.round(bal * i);
    let prin = 0;
    if (m > g) {
      if (input.method === 'equal-payment') prin = pay - interest;
      else if (input.method === 'equal-principal') prin = Math.round(principalEach * (m - g)) - Math.round(principalEach * (m - g - 1));
      else prin = m === n ? bal : 0;
    }
    if (m === n || prin > bal) prin = bal;
    prin = Math.max(0, prin);
    bal -= prin;
    rows.push({ month: m, payment: prin + interest, principal: prin, interest, balance: bal });
  }
  const totalInterest = rows.reduce((a, r) => a + r.interest, 0);
  return {
    rows,
    totalInterest,
    totalPayment: P + totalInterest,
    firstPayment: rows[0]?.payment ?? 0,
    firstAmortPayment: rows[g]?.payment ?? 0,
    lastPayment: rows[rows.length - 1]?.payment ?? 0,
    maxPayment: rows.reduce((a, r) => Math.max(a, r.payment), 0),
  };
}

/* ───────── 예금·적금 ───────── */

export type SavingsKind = 'deposit' | 'installment';
export type Compounding = 'simple' | 'monthly';
/** 일반과세 15.4% / 상호금융 세금우대(농특세 1.4%) / 비과세 */
export type TaxType = 'general' | 'mutual' | 'free';

export interface SavingsInput {
  kind: SavingsKind;
  /** 예금: 맡기는 돈, 적금: 매월 넣는 돈 */
  amount: number;
  rate: number;
  months: number;
  compounding: Compounding;
  taxType: TaxType;
}

export interface SavingsResult {
  /** 원금 합계 */
  principal: number;
  /** 세전 이자 */
  interest: number;
  incomeTax: number;
  localTax: number;
  ruralTax: number;
  tax: number;
  afterTaxInterest: number;
  /** 만기 수령액 (세후) */
  maturity: number;
  /** 세후 연 환산 수익률 (예금은 원금 대비, 적금은 평균 잔액 대비) */
  effectiveRate: number;
  /** 상호금융 세금우대 한도(3,000만원)를 넘었는지 */
  overMutualLimit: boolean;
}

export function interestTax(interest: number, taxType: TaxType): { incomeTax: number; localTax: number; ruralTax: number } {
  const I = Math.floor(pos(interest));
  if (taxType === 'free') return { incomeTax: 0, localTax: 0, ruralTax: 0 };
  if (taxType === 'mutual') return { incomeTax: 0, localTax: 0, ruralTax: floor10(I * F.ruralTaxRate) };
  const incomeTax = floor10(I * F.interestIncomeTaxRate);
  return { incomeTax, localTax: floor10(incomeTax * RATES.localIncomeTaxRate), ruralTax: 0 };
}

export function calcSavings(input: SavingsInput): SavingsResult {
  const A = Math.round(pos(input.amount));
  const n = Math.floor(pos(input.months));
  const i = pos(input.rate) / 12;
  let principal = 0;
  let interest = 0;
  if (input.kind === 'deposit') {
    principal = A;
    interest = input.compounding === 'monthly' ? A * (Math.pow(1 + i, n) - 1) : A * pos(input.rate) * (n / 12);
  } else {
    principal = A * n;
    // k번째 달에 넣은 돈은 (n − k + 1)개월 동안 이자가 붙음
    interest = input.compounding === 'monthly' ? (i ? A * (((1 + i) * (Math.pow(1 + i, n) - 1)) / i - n) : 0) : A * i * ((n * (n + 1)) / 2);
  }
  interest = Math.floor(interest + 1e-6);
  let t = interestTax(interest, input.taxType);
  // 상호금융 세금우대는 원금 3,000만원까지: 넘는 부분의 이자는 일반과세
  if (input.taxType === 'mutual' && principal > F.mutualDepositLimit) {
    const inLimit = Math.floor((interest * F.mutualDepositLimit) / principal);
    const m = interestTax(inLimit, 'mutual');
    const g = interestTax(interest - inLimit, 'general');
    t = { incomeTax: g.incomeTax, localTax: g.localTax, ruralTax: m.ruralTax };
  }
  const tax = t.incomeTax + t.localTax + t.ruralTax;
  const afterTaxInterest = interest - tax;
  // 적금 평균 잔액 = A × (n + 1) / 2
  const avgBalance = input.kind === 'deposit' ? principal : (A * (n + 1)) / 2;
  const effectiveRate = avgBalance && n ? afterTaxInterest / avgBalance / (n / 12) : 0;
  return {
    principal,
    interest,
    ...t,
    tax,
    afterTaxInterest,
    maturity: principal + afterTaxInterest,
    effectiveRate,
    overMutualLimit: input.taxType === 'mutual' && principal > F.mutualDepositLimit,
  };
}

/** 적금 금리를 같은 기간 예금(단리) 금리로 환산: 적금 이자 = 원금 합계 × 환산금리 × 기간 */
export function installmentAsDepositRate(rate: number, months: number): number {
  const n = Math.floor(pos(months));
  return n ? (pos(rate) * (n + 1)) / (2 * n) : 0;
}

/* ───────── 대출 갈아타기 ───────── */

export function stampTax(amount: number): { total: number; borrower: number } {
  const a = pos(amount);
  const row = F.stampTax.find((r) => a <= r.upTo)!;
  return { total: row.tax, borrower: row.tax / 2 };
}

/** 중도상환수수료 = 상환금액 × 수수료율 × (부과기간 − 경과기간) ÷ 부과기간. 부과기간은 3년, 대출기간이 더 짧으면 대출기간 */
export function prepaymentFee(amount: number, feeRate: number, elapsedMonths: number, feeMonths: number = F.prepaymentFeeMonths): number {
  const left = Math.max(0, feeMonths - Math.floor(pos(elapsedMonths)));
  if (!left || !feeMonths) return 0;
  return Math.floor(pos(amount) * pos(feeRate) * (left / feeMonths));
}

export interface RefinanceInput {
  balance: number;
  currentRate: number;
  remainingMonths: number;
  newRate: number;
  /** 새 대출 기간 (비우면 남은 기간과 같게) */
  newMonths?: number;
  method: RepayMethod;
  feeRate: number;
  /** 지금 대출을 받은 지 몇 개월 */
  elapsedMonths: number;
  /** 근저당 설정·감정 등 기타 비용 (원) */
  otherCosts: number;
}

export interface RefinanceResult {
  currentInterest: number;
  newInterest: number;
  interestSaving: number;
  prepaymentFee: number;
  stampTax: number;
  otherCosts: number;
  totalCost: number;
  /** 순이익 = 이자 절감 − 비용 */
  netBenefit: number;
  currentMonthly: number;
  newMonthly: number;
  /** 누적 이자 절감액이 비용을 넘는 달 (없으면 null) */
  breakEvenMonth: number | null;
  sameTerm: boolean;
}

export function calcRefinance(i: RefinanceInput): RefinanceResult {
  const n = Math.floor(pos(i.remainingMonths));
  const nn = Math.floor(pos(i.newMonths ?? 0)) || n;
  const cur = calcLoan({ principal: i.balance, rate: i.currentRate, months: n, method: i.method });
  const nxt = calcLoan({ principal: i.balance, rate: i.newRate, months: nn, method: i.method });
  const loanTerm = Math.floor(pos(i.elapsedMonths)) + n;
  const fee = prepaymentFee(i.balance, i.feeRate, i.elapsedMonths, Math.min(F.prepaymentFeeMonths, loanTerm));
  const st = stampTax(i.balance).borrower;
  const other = Math.round(pos(i.otherCosts));
  const totalCost = fee + st + other;
  let cum = 0;
  let breakEvenMonth: number | null = null;
  const len = Math.max(cur.rows.length, nxt.rows.length);
  for (let m = 0; m < len; m++) {
    cum += (cur.rows[m]?.interest ?? 0) - (nxt.rows[m]?.interest ?? 0);
    if (breakEvenMonth === null && cum >= totalCost && cum > 0) breakEvenMonth = m + 1;
  }
  const interestSaving = cur.totalInterest - nxt.totalInterest;
  return {
    currentInterest: cur.totalInterest,
    newInterest: nxt.totalInterest,
    interestSaving,
    prepaymentFee: fee,
    stampTax: st,
    otherCosts: other,
    totalCost,
    netBenefit: interestSaving - totalCost,
    currentMonthly: cur.firstPayment,
    newMonthly: nxt.firstPayment,
    breakEvenMonth,
    sameTerm: nn === n,
  };
}
