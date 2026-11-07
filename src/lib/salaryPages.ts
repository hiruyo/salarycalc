/**
 * 연봉별 실수령액 페이지 (/salary/4500 등) 데이터 — 빌드할 때 정적 페이지로 생성 (순수 로직, 테스트 가능)
 *
 * 기본 조건은 연봉 계산기와 같게: 식대 20만원 비과세, 공제대상가족 1명(본인), 자녀 없음.
 * 페이지마다 부양가족별·식대 유무·인상 효과·퇴직금 포함·회사 부담 인건비 등 그 연봉에만 해당하는 수치를 담아
 * 내용이 서로 겹치지 않게 합니다.
 */
import { RATES } from '../rates/2026.ts';
import { calcNetPay, type NetPayResult } from './netpay.ts';
import { calcEmployee } from './payroll.ts';

/** 페이지를 만드는 연봉 (만원): 2,000~1억은 100만원 간격, 그 위는 1.5억까지 500만원 간격 */
export const SALARY_PAGE_AMOUNTS: number[] = [
  ...Array.from({ length: 81 }, (_, i) => 2000 + i * 100),
  ...Array.from({ length: 10 }, (_, i) => 10500 + i * 500),
];

export const DEFAULT_MEAL = RATES.mealAllowanceExemptMax; // 200,000

/** 주 40시간 + 주휴 8시간 × 4.345주 ≈ 209시간 (주휴수당 계산기와 같은 관행) */
export const MONTHLY_HOURS = 209;

export const minWageMonthly = RATES.minWageHourly * MONTHLY_HOURS;
export const minWageAnnual = minWageMonthly * 12;

export function isSalaryPageAmount(man: number): boolean {
  return SALARY_PAGE_AMOUNTS.includes(man);
}

const net = (man: number, extra: { meal?: number; family?: number; children?: number } = {}) =>
  calcNetPay({
    annualSalary: man * 10_000,
    nonTaxableMonthly: extra.meal ?? DEFAULT_MEAL,
    familyCount: extra.family ?? 1,
    children: extra.children ?? 0,
  });

export interface FamilyRow {
  label: string;
  family: number;
  children: number;
  incomeTax: number;
  netMonthly: number;
  /** 본인 1명 대비 월 실수령액 차이 */
  diff: number;
}

export interface NeighborRow {
  man: number;
  netMonthly: number;
  /** 이 페이지 연봉 대비 월 실수령액 차이 */
  diff: number;
  current: boolean;
  /** 해당 연봉 페이지가 있는지 (링크 여부) */
  hasPage: boolean;
}

export interface SalaryPageData {
  man: number;
  base: NetPayResult;
  /** 공제 합계 ÷ 월 급여 (%) */
  deductionRate: number;
  /** 월 실수령액 ÷ 월 급여 (%) */
  takeHomeRate: number;
  family: FamilyRow[];
  /** 식대 비과세가 없을 때 */
  noMeal: NetPayResult;
  /** 같은 조건에서 연봉이 100만원 오르면 */
  raise100: { netMonthlyDiff: number; netAnnualDiff: number; keepRate: number };
  neighbors: NeighborRow[];
  /** 퇴직금 포함 연봉일 때 (÷13 × 12가 실제 연봉) */
  withSeverance: { realAnnual: number; result: NetPayResult };
  /** 통상 시급 환산 (세전 월급 ÷ 209) */
  hourlyGross: number;
  /** 주 40시간 전일제 기준 최저임금 월 환산액보다 낮은지 */
  belowMinWage: boolean;
  /** 국민연금 기준소득월액 상한에 걸리는지 */
  pensionCapped: boolean;
  /** 회사 입장 월 총 인건비 (150인 미만, 산재 평균요율) */
  employer: { employerInsurance: number; severanceReserve: number; totalCost: number };
  prev: number | null;
  next: number | null;
}

const pct1 = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 1000) / 10 : 0);

export function salaryPageData(man: number): SalaryPageData {
  const base = net(man);

  const familyCases = [
    { label: '본인 1명', family: 1, children: 0 },
    { label: '본인 + 배우자', family: 2, children: 0 },
    { label: '배우자 + 자녀 1명', family: 3, children: 1 },
    { label: '배우자 + 자녀 2명', family: 4, children: 2 },
  ];
  const family = familyCases.map((c) => {
    const r = net(man, { family: c.family, children: c.children });
    return { ...c, incomeTax: r.incomeTax, netMonthly: r.netMonthly, diff: r.netMonthly - base.netMonthly };
  });

  const up = net(man + 100);
  const netMonthlyDiff = up.netMonthly - base.netMonthly;
  const netAnnualDiff = up.netAnnual - base.netAnnual;

  // 앞뒤 연봉: 1억 이하는 100만원 간격 ±5단계, 그 위는 500만원 간격 ±3단계
  const step = man > 10_000 ? 500 : 100;
  const span = man > 10_000 ? 3 : 5;
  const neighbors: NeighborRow[] = [];
  for (let k = -span; k <= span; k++) {
    const m = man + k * step;
    if (m < 1000) continue;
    const r = net(m);
    neighbors.push({ man: m, netMonthly: r.netMonthly, diff: r.netMonthly - base.netMonthly, current: k === 0, hasPage: isSalaryPageAmount(m) });
  }

  const realAnnual = Math.round((man * 10_000 * 12) / 13);
  const withSevResult = calcNetPay({ annualSalary: realAnnual, nonTaxableMonthly: DEFAULT_MEAL, familyCount: 1 });

  const emp = calcEmployee(
    { payType: 'monthly', monthlyPay: base.grossMonthly, nonTaxable: base.nonTaxableMonthly },
    { companySize: 'u150', industrialRate: RATES.industrialAccidentAvgRate },
  );

  const idx = SALARY_PAGE_AMOUNTS.indexOf(man);

  return {
    man,
    base,
    deductionRate: pct1(base.deductionTotal, base.grossMonthly),
    takeHomeRate: pct1(base.netMonthly, base.grossMonthly),
    family,
    noMeal: net(man, { meal: 0 }),
    raise100: { netMonthlyDiff, netAnnualDiff, keepRate: pct1(netAnnualDiff, 1_000_000) },
    neighbors,
    withSeverance: { realAnnual, result: withSevResult },
    hourlyGross: Math.floor(base.grossMonthly / MONTHLY_HOURS),
    belowMinWage: base.grossMonthly < minWageMonthly,
    pensionCapped: base.taxableMonthly > RATES.pension.upper,
    employer: { employerInsurance: emp.employer.total, severanceReserve: emp.severanceReserve, totalCost: emp.totalCost },
    prev: idx > 0 ? SALARY_PAGE_AMOUNTS[idx - 1] : null,
    next: idx >= 0 && idx < SALARY_PAGE_AMOUNTS.length - 1 ? SALARY_PAGE_AMOUNTS[idx + 1] : null,
  };
}

/** 4500 → "4,500만원", 12000 → "1억 2,000만원", 10000 → "1억원" */
export function manLabel(man: number): string {
  const eok = Math.floor(man / 10_000);
  const rest = man % 10_000;
  if (!eok) return `${rest.toLocaleString('ko-KR')}만원`;
  if (!rest) return `${eok}억원`;
  return `${eok}억 ${rest.toLocaleString('ko-KR')}만원`;
}
