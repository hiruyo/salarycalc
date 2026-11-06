/**
 * 사장님용 인건비 계산 (월 기준)
 * 직원 1인당: 세전 급여 + 회사 부담 4대보험(국민연금·건강·장기요양·고용·산재) + 퇴직금 적립(1/12)
 *
 * - 4대보험 기준 보수는 비과세(식대 등)를 뺀 금액
 * - 주 15시간 미만(월 60시간 미만) 근로자는 국민연금·건강보험·고용보험 적용 제외로 보고 산재보험만 계산
 * - 국민연금 60세 이상 미가입, 두루누리 등 정부 지원, 근로자 수 산정 특례는 반영하지 않음
 */
import { RATES } from '../rates/2026.ts';
import { calcNetPay } from './netpay.ts';
import { monthlyIncomeTax } from './withholding.ts';
import { calcWeeklyHolidayPay } from './weeklyHolidayPay.ts';

export type CompanySize = keyof typeof RATES.employment.stabilityRates;

export interface Employee {
  name?: string;
  payType: 'monthly' | 'hourly';
  /** 월급제: 세전 월 급여 총액 (비과세 포함) */
  monthlyPay?: number;
  /** 월급제: 그중 비과세 (식대 등) */
  nonTaxable?: number;
  /** 시급제: 시급 */
  hourlyWage?: number;
  /** 시급제: 1주 소정근로시간 */
  weeklyHours?: number;
}

export interface PayrollOptions {
  companySize: CompanySize;
  /** 산재보험료율 (예: 0.0147) */
  industrialRate: number;
}

export interface EmployerInsurance {
  pension: number;
  health: number;
  longTermCare: number;
  employment: number;
  industrial: number;
  total: number;
}

export interface EmployeeResult {
  name: string;
  /** 월 세전 급여 (주휴수당 포함) */
  gross: number;
  /** 4대보험 기준 보수 (비과세 제외) */
  taxable: number;
  /** 국민연금·건강·고용보험 가입 대상 여부 */
  insured: boolean;
  employer: EmployerInsurance;
  /** 퇴직금 적립 (월 급여의 1/12) */
  severanceReserve: number;
  /** 회사가 쓰는 월 총 인건비 */
  totalCost: number;
  /** 근로자 공제 (4대보험 + 소득세·지방소득세) */
  employeeDeduction: number;
  /** 근로자 실수령액 */
  net: number;
}

// 1e-6: 4,000,000 × 0.0135 = 53,999.999… 같은 부동소수점 오차 보정
const floor10 = (n: number) => Math.floor(n / 10 + 1e-6) * 10;
const pos = (n: number | undefined) => (Number.isFinite(n) && (n as number) > 0 ? (n as number) : 0);

export function calcEmployee(e: Employee, opt: PayrollOptions): EmployeeResult {
  let gross: number;
  let nonTaxable: number;
  let insured = true;
  if (e.payType === 'hourly') {
    const hours = pos(e.weeklyHours);
    gross = calcWeeklyHolidayPay({ hourlyWage: pos(e.hourlyWage), weeklyHours: hours }).monthlyTotal;
    nonTaxable = 0;
    insured = hours >= 15;
  } else {
    gross = Math.floor(pos(e.monthlyPay));
    nonTaxable = Math.min(pos(e.nonTaxable), gross);
  }
  const taxable = gross - nonTaxable;

  let pension = 0;
  let health = 0;
  let longTermCare = 0;
  let employment = 0;
  let employeeDeduction: number;

  if (insured && gross > 0) {
    // 국민연금·건강·장기요양은 근로자와 회사가 같은 금액
    const np = calcNetPay({ annualSalary: gross * 12, nonTaxableMonthly: nonTaxable, familyCount: 1 });
    pension = np.pension;
    health = np.health;
    longTermCare = np.longTermCare;
    const stability = RATES.employment.stabilityRates[opt.companySize] ?? RATES.employment.stabilityRates.u150;
    employment = floor10(taxable * (RATES.employment.employerRate + stability));
    employeeDeduction = np.deductionTotal;
  } else {
    const tax = monthlyIncomeTax(taxable, 1, 0);
    employeeDeduction = tax + floor10(tax * RATES.localIncomeTaxRate);
  }
  const industrial = floor10(taxable * Math.max(0, opt.industrialRate));
  const employerTotal = pension + health + longTermCare + employment + industrial;
  const severanceReserve = Math.floor(gross / 12);

  return {
    name: e.name?.trim() || '',
    gross,
    taxable,
    insured,
    employer: { pension, health, longTermCare, employment, industrial, total: employerTotal },
    severanceReserve,
    totalCost: gross + employerTotal + severanceReserve,
    employeeDeduction,
    net: gross - employeeDeduction,
  };
}

export interface PayrollResult {
  employees: EmployeeResult[];
  gross: number;
  employer: EmployerInsurance;
  severanceReserve: number;
  totalCost: number;
  /** 급여 대비 추가 부담률 (회사 4대보험 + 퇴직 적립) / 급여 */
  extraRatio: number;
}

export function calcPayroll(list: Employee[], opt: PayrollOptions): PayrollResult {
  const employees = list.map((e) => calcEmployee(e, opt));
  const sum = (f: (r: EmployeeResult) => number) => employees.reduce((a, r) => a + f(r), 0);
  const employer: EmployerInsurance = {
    pension: sum((r) => r.employer.pension),
    health: sum((r) => r.employer.health),
    longTermCare: sum((r) => r.employer.longTermCare),
    employment: sum((r) => r.employer.employment),
    industrial: sum((r) => r.employer.industrial),
    total: sum((r) => r.employer.total),
  };
  const gross = sum((r) => r.gross);
  const severanceReserve = sum((r) => r.severanceReserve);
  return {
    employees,
    gross,
    employer,
    severanceReserve,
    totalCost: gross + employer.total + severanceReserve,
    extraRatio: gross > 0 ? (employer.total + severanceReserve) / gross : 0,
  };
}
