import { RATES } from '../rates/2026.ts';
import { monthlyIncomeTax } from './withholding.ts';

export interface NetPayInput {
  /** 세전 연봉 (원). 퇴직금 별도 기준 */
  annualSalary: number;
  /** 월 비과세 금액 (원). 식대 등. 기본 0 */
  nonTaxableMonthly?: number;
  /** 공제대상가족 수 (본인 포함, 최소 1) */
  familyCount?: number;
  /** 8세 이상 20세 이하 자녀 수 */
  children?: number;
}

export interface NetPayResult {
  grossMonthly: number;
  nonTaxableMonthly: number;
  taxableMonthly: number;
  pension: number;
  health: number;
  longTermCare: number;
  employment: number;
  insuranceTotal: number;
  incomeTax: number;
  localIncomeTax: number;
  taxTotal: number;
  deductionTotal: number;
  netMonthly: number;
  netAnnual: number;
}

const floor10 = (n: number) => Math.floor(n / 10) * 10;
const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);

export function calcNetPay(input: NetPayInput): NetPayResult {
  const familyCount = Math.max(1, Math.floor(input.familyCount ?? 1));
  const children = Math.max(0, Math.floor(input.children ?? 0));
  const grossMonthly = Math.floor(input.annualSalary / 12);
  const nonTaxableMonthly = clamp(input.nonTaxableMonthly ?? 0, 0, grossMonthly);
  const taxableMonthly = grossMonthly - nonTaxableMonthly;

  // 4대보험은 비과세(식대 등)를 제외한 보수월액 기준
  const pensionBase = clamp(taxableMonthly, RATES.pension.lower, RATES.pension.upper);
  const pension = floor10(pensionBase * RATES.pension.rate * RATES.pension.employeeShare);

  const health = floor10(taxableMonthly * RATES.health.rate * RATES.health.employeeShare);
  const healthTotal = taxableMonthly * RATES.health.rate; // 장기요양은 건강보험료(근로자+회사 합) 기준
  const longTermCare = floor10(
    healthTotal * RATES.longTermCare.rateOfHealthPremium * RATES.longTermCare.employeeShare,
  );
  const employment = floor10(taxableMonthly * RATES.employment.employeeRate);
  const insuranceTotal = pension + health + longTermCare + employment;

  // 소득세: 국세청 근로소득 간이세액표 (비과세 제외 월급여 기준)
  const incomeTax = monthlyIncomeTax(taxableMonthly, familyCount, children);
  const localIncomeTax = floor10(incomeTax * RATES.localIncomeTaxRate);
  const taxTotal = incomeTax + localIncomeTax;

  const deductionTotal = insuranceTotal + taxTotal;
  const netMonthly = grossMonthly - deductionTotal;

  return {
    grossMonthly,
    nonTaxableMonthly,
    taxableMonthly,
    pension,
    health,
    longTermCare,
    employment,
    insuranceTotal,
    incomeTax,
    localIncomeTax,
    taxTotal,
    deductionTotal,
    netMonthly,
    netAnnual: netMonthly * 12,
  };
}
