/**
 * 연말정산 환급 예상 계산 (2026년 귀속, 근로소득만 있는 경우)
 *
 * 흐름: 총급여 → 근로소득공제 → 인적·연금보험료·특별소득·카드 등 소득공제 → 과세표준 → 산출세액
 *       → 세액공제(근로소득·자녀·출산·결혼·연금계좌·특별(또는 표준)·월세) → 결정세액
 *       → 기납부세액과 비교해 환급/추가 납부
 *
 * 특별소득공제·특별세액공제·월세를 받는 경우와 표준세액공제(13만원)를 받는 경우를 모두 계산해 세금이 적은 쪽을 고릅니다.
 * 단순화: 부녀자·한부모 공제, 주택자금, 장애인 전용보험, 난임·미숙아 의료비, 정치자금·고향사랑·종교단체 기부금,
 *         세대주와 주소가 다른 배우자의 월세 공제(2026 신설)는 반영하지 않습니다.
 *         총급여 7천만원 초과자의 문화체육 사용분은 결제수단별로 나뉘지만, 입력칸이 하나라 신용카드(15%)로 계산합니다(보수적).
 */
import { YEAR_END as Y } from '../rates/yearEnd2026.ts';
import { calcNetPay } from './netpay.ts';
import { monthlyIncomeTax } from './withholding.ts';

export interface YearEndInput {
  /** 총급여 (연간 과세 급여, 비과세 제외) */
  salary: number;
  /** 기본공제 인원 (본인 포함) */
  dependents?: number;
  /** 그중 70세 이상 (경로우대) */
  seniors70?: number;
  /** 그중 장애인 */
  disabled?: number;
  /** 기본공제 대상 자녀 수: 20세 이하, 장애인은 나이 무관 (카드 기본한도용) */
  childrenUnder20?: number;
  /** 자녀세액공제 대상 자녀 수: 2026년 귀속은 2006~2016년생(9세 이상, 2017년생 제외), 장애인은 나이 무관 */
  children9plus?: number;
  /** 올해 출생·입양한 자녀의 순서 (0 없음, 1 첫째, 2 둘째, 3 셋째 이상) */
  birthOrder?: 0 | 1 | 2 | 3;
  /** 올해 혼인신고 (결혼세액공제, 생애 1회) */
  married?: boolean;

  /** 국민연금 납부액 (연). 비우면 총급여로 추정 */
  pensionPaid?: number;
  /** 건강·장기요양·고용보험료 합계 (연). 비우면 총급여로 추정 */
  insurancePaid?: number;

  creditCard?: number;
  debitCash?: number;
  culture?: number;
  market?: number;
  transit?: number;
  /** 주택청약 납입액 (무주택 세대주, 총급여 7천 이하) */
  housingSubscription?: number;

  pensionSavings?: number;
  irp?: number;
  /** 보장성 보험료 */
  lifeInsurance?: number;
  /** 본인·65세 이상·장애인·6세 이하 자녀·중증질환 산정특례자 의료비 (700만원 한도 없음) */
  medicalSelf?: number;
  /** 그 외 부양가족 의료비 */
  medicalOther?: number;
  /** 교육비 (1인당 한도 내 금액) */
  education?: number;
  donation?: number;
  /** 연간 월세 지급액 (무주택 세대주 등 요건 충족 시) */
  rent?: number;

  /** 기납부 소득세 (원천징수된 소득세 합계, 지방세 제외). 비우면 간이세액표로 추정 */
  prepaidTax?: number;
}

export interface CardDetail {
  total: number;
  minSpend: number;
  /** 기본한도 내 공제 */
  base: number;
  baseLimit: number;
  /** 추가한도로 더 받은 공제 */
  extra: number;
  deduction: number;
}

export interface YearEndResult {
  valid: boolean;
  salary: number;
  earnedDeduction: number;
  earnedIncome: number;
  personalDeduction: number;
  pensionPaid: number;
  insurancePaid: number;
  pensionEstimated: boolean;
  insuranceEstimated: boolean;
  card: CardDetail;
  housingDeduction: number;
  taxBase: number;
  calculatedTax: number;
  credits: {
    earned: number;
    child: number;
    birth: number;
    marriage: number;
    pension: number;
    insurance: number;
    medical: number;
    education: number;
    donation: number;
    rent: number;
    standard: number;
  };
  /** 'itemized' 특별공제 적용 / 'standard' 표준세액공제 적용 */
  method: 'itemized' | 'standard';
  decidedTax: number;
  decidedLocalTax: number;
  prepaidTax: number;
  prepaidEstimated: boolean;
  prepaidLocalTax: number;
  /** 양수면 환급, 음수면 추가 납부 (소득세 + 지방소득세) */
  refund: number;
}

const n0 = (v: number | undefined) => (Number.isFinite(v) && (v as number) > 0 ? (v as number) : 0);
const floor10 = (v: number) => Math.floor(v / 10 + 1e-6) * 10;

export function earnedIncomeDeduction(salary: number): number {
  const { tiers, cap } = Y.earnedIncomeDeduction;
  const t = tiers.find((x) => salary <= x.upTo)!;
  return Math.min(Math.floor(t.base + (salary - t.from) * t.rate), cap);
}

export function taxOnBase(base: number): number {
  if (base <= 0) return 0;
  const b = Y.brackets.find((x) => base <= x.upTo)!;
  return Math.floor(base * b.rate - b.deduction);
}

export function earnedTaxCredit(calculatedTax: number, salary: number): number {
  const c = Y.earnedCredit;
  const raw = calculatedTax <= c.lowLimit ? calculatedTax * c.lowRate : c.highBase + (calculatedTax - c.lowLimit) * c.highRate;
  let cap: number;
  if (salary <= 33_000_000) cap = 740_000;
  else if (salary <= 70_000_000) cap = Math.max(660_000, 740_000 - (salary - 33_000_000) * 0.008);
  else if (salary <= 120_000_000) cap = Math.max(500_000, 660_000 - (salary - 70_000_000) * 0.5);
  else cap = Math.max(200_000, 500_000 - (salary - 120_000_000) * 0.5);
  return Math.floor(Math.min(raw, cap));
}

export function childTaxCredit(children9plus: number): number {
  const c = Y.childCredit;
  if (children9plus <= 0) return 0;
  if (children9plus === 1) return c.one;
  return c.two + (children9plus - 2) * c.perExtra;
}

/**
 * 신용카드 등 소득공제.
 * 최저사용금액(총급여 25%)은 공제율이 낮은 것부터 차감: 신용카드 → 체크·현금 → 문화체육 → 전통시장 → 대중교통.
 * 기본한도 초과분은 min(초과분, 전통시장·대중교통·문화체육 공제분 합계, 추가한도)만큼 추가 공제.
 */
export function cardDeduction(input: {
  salary: number;
  creditCard: number;
  debitCash: number;
  culture: number;
  market: number;
  transit: number;
  childrenUnder20: number;
}): CardDetail {
  const c = Y.card;
  const low = input.salary <= c.highSalary;
  const cultureEligible = input.salary <= c.cultureSalaryMax;
  // 총급여 7천 초과면 문화체육 사용분은 신용카드 사용분으로 봄
  const items = [
    { amount: input.creditCard + (cultureEligible ? 0 : input.culture), rate: c.rates.credit, key: 'credit' },
    { amount: input.debitCash, rate: c.rates.debitCash, key: 'debitCash' },
    { amount: cultureEligible ? input.culture : 0, rate: c.rates.culture, key: 'culture' },
    { amount: input.market, rate: c.rates.market, key: 'market' },
    { amount: input.transit, rate: c.rates.transit, key: 'transit' },
  ];
  const total = items.reduce((a, x) => a + x.amount, 0);
  const minSpend = Math.floor(input.salary * c.minSpendRatio);

  let remainingMin = minSpend;
  const deductible: Record<string, number> = {};
  for (const it of items) {
    const used = Math.min(it.amount, remainingMin);
    remainingMin -= used;
    deductible[it.key] = Math.floor((it.amount - used) * it.rate);
  }
  const gross = Object.values(deductible).reduce((a, x) => a + x, 0);

  const kids = Math.min(2, Math.max(0, Math.floor(input.childrenUnder20)));
  const baseLimit = (low ? c.baseLimitLow : c.baseLimitHigh)[kids];
  const base = Math.min(gross, baseLimit);
  const over = gross - base;
  const extraPool = deductible.market + deductible.transit + (low ? deductible.culture : 0);
  const extra = Math.max(0, Math.min(over, extraPool, low ? c.extraLimitLow : c.extraLimitHigh));

  return { total, minSpend, base, baseLimit, extra, deduction: base + extra };
}

export function calcYearEnd(input: YearEndInput): YearEndResult {
  const salary = Math.floor(n0(input.salary));
  const dependents = Math.max(1, Math.floor(input.dependents ?? 1));
  const seniors = Math.min(dependents, Math.floor(n0(input.seniors70)));
  const disabled = Math.min(dependents, Math.floor(n0(input.disabled)));
  const childrenUnder20 = Math.floor(n0(input.childrenUnder20));
  const children9plus = Math.floor(n0(input.children9plus));

  // 4대보험 추정 (총급여를 12로 나눈 월급 기준)
  const np = calcNetPay({ annualSalary: salary, nonTaxableMonthly: 0, familyCount: dependents, children: children9plus });
  const pensionEstimated = input.pensionPaid === undefined || input.pensionPaid === null || Number.isNaN(input.pensionPaid);
  const insuranceEstimated = input.insurancePaid === undefined || input.insurancePaid === null || Number.isNaN(input.insurancePaid);
  const pensionPaid = pensionEstimated ? np.pension * 12 : n0(input.pensionPaid);
  const insurancePaid = insuranceEstimated ? (np.health + np.longTermCare + np.employment) * 12 : n0(input.insurancePaid);

  const earnedDeduction = earnedIncomeDeduction(salary);
  const earnedIncome = Math.max(0, salary - earnedDeduction);
  const personalDeduction =
    dependents * Y.personal.basic + seniors * Y.personal.senior70 + disabled * Y.personal.disabled;

  const card = cardDeduction({
    salary,
    creditCard: n0(input.creditCard),
    debitCash: n0(input.debitCash),
    culture: n0(input.culture),
    market: n0(input.market),
    transit: n0(input.transit),
    childrenUnder20,
  });
  const hs = Y.housingSubscription;
  const housingRaw = salary <= hs.salaryMax ? Math.floor(Math.min(n0(input.housingSubscription), hs.limit) * hs.rate) : 0;
  // 종합한도 2,500만원 (주택청약 + 카드)
  const capped = Math.min(housingRaw + card.deduction, Y.deductionCap);
  const housingDeduction = Math.min(housingRaw, capped);
  const cardAfterCap = capped - housingDeduction;
  const cardDetail: CardDetail = { ...card, deduction: cardAfterCap };

  // 공통 세액공제
  const p = Y.pension;
  const pensionBase = Math.min(Math.min(n0(input.pensionSavings), p.savingsLimit) + n0(input.irp), p.totalLimit);
  const pensionCredit = Math.floor(pensionBase * (salary <= p.salaryHighRateMax ? p.highRate : p.lowRate));
  const childCredit = childTaxCredit(children9plus);
  const birthCredit = Y.birthCredit[input.birthOrder ?? 0] ?? 0;
  const marriageCredit = input.married ? Y.marriageCredit : 0;

  // 특별세액공제 항목
  const insuranceCredit = Math.floor(Math.min(n0(input.lifeInsurance), Y.insurance.limit) * Y.insurance.rate);
  const threshold = Math.floor(salary * Y.medical.thresholdRatio);
  const other = n0(input.medicalOther);
  const self = n0(input.medicalSelf);
  const otherNet = Math.max(0, other - threshold);
  const selfNet = Math.max(0, self - Math.max(0, threshold - other));
  const medicalCredit = Math.floor((Math.min(otherNet, Y.medical.otherLimit) + selfNet) * Y.medical.rate);
  const educationCredit = Math.floor(n0(input.education) * Y.education.rate);
  // 일반기부금은 근로소득금액의 30%까지만 공제 대상
  const don = Math.min(n0(input.donation), Math.floor(earnedIncome * 0.3));
  const d = Y.donation;
  const donationCredit = Math.floor(Math.min(don, d.threshold) * d.lowRate + Math.max(0, don - d.threshold) * d.highRate);
  const r = Y.rent;
  const rentCredit =
    salary <= r.salaryMax ? Math.floor(Math.min(n0(input.rent), r.limit) * (salary <= r.highRateSalaryMax ? r.highRate : r.lowRate)) : 0;

  const scenario = (itemized: boolean) => {
    const base = Math.max(
      0,
      earnedIncome - personalDeduction - pensionPaid - (itemized ? insurancePaid : 0) - housingDeduction - cardAfterCap,
    );
    const calc = taxOnBase(base);
    const earned = earnedTaxCredit(calc, salary);
    const special = itemized ? insuranceCredit + medicalCredit + educationCredit + donationCredit + rentCredit : Y.standardCredit;
    const decided = Math.max(0, calc - earned - childCredit - birthCredit - marriageCredit - pensionCredit - special);
    return { base, calc, earned, decided };
  };
  const A = scenario(true);
  const B = scenario(false);
  const useStandard = B.decided < A.decided;
  const S = useStandard ? B : A;

  const decidedTax = floor10(S.decided);
  const decidedLocalTax = floor10(decidedTax * Y.localTaxRate);

  const prepaidEstimated = input.prepaidTax === undefined || input.prepaidTax === null || Number.isNaN(input.prepaidTax);
  const prepaidTax = prepaidEstimated
    ? monthlyIncomeTax(Math.floor(salary / 12), dependents, children9plus) * 12
    : Math.floor(n0(input.prepaidTax));
  const prepaidLocalTax = prepaidEstimated ? floor10(monthlyIncomeTax(Math.floor(salary / 12), dependents, children9plus) * Y.localTaxRate) * 12 : floor10(prepaidTax * Y.localTaxRate);

  return {
    valid: salary > 0,
    salary,
    earnedDeduction,
    earnedIncome,
    personalDeduction,
    pensionPaid,
    insurancePaid,
    pensionEstimated,
    insuranceEstimated,
    card: cardDetail,
    housingDeduction,
    taxBase: S.base,
    calculatedTax: S.calc,
    credits: {
      earned: S.earned,
      child: childCredit,
      birth: birthCredit,
      marriage: marriageCredit,
      pension: pensionCredit,
      insurance: useStandard ? 0 : insuranceCredit,
      medical: useStandard ? 0 : medicalCredit,
      education: useStandard ? 0 : educationCredit,
      donation: useStandard ? 0 : donationCredit,
      rent: useStandard ? 0 : rentCredit,
      standard: useStandard ? Y.standardCredit : 0,
    },
    method: useStandard ? 'standard' : 'itemized',
    decidedTax,
    decidedLocalTax,
    prepaidTax,
    prepaidEstimated,
    prepaidLocalTax,
    refund: prepaidTax + prepaidLocalTax - decidedTax - decidedLocalTax,
  };
}
