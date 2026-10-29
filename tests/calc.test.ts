import test from 'node:test';
import assert from 'node:assert/strict';
import { calcNetPay } from '../src/lib/netpay.ts';
import { monthlyIncomeTax, childDeduction } from '../src/lib/withholding.ts';
import { calcWeeklyHolidayPay } from '../src/lib/weeklyHolidayPay.ts';
import { calcSeverance } from '../src/lib/severance.ts';

// ---- 간이세액표 (소득세법 시행령 별표 2, 2026.2.27 개정) 원본 값과 대조 ----

test('간이세액표: 월 770천원 미만은 세액 없음', () => {
  assert.equal(monthlyIncomeTax(700_000, 1, 0), 0);
  assert.equal(monthlyIncomeTax(769_999, 1, 0), 0);
});

test('간이세액표: 3,000~3,020천원 행 (가족 1·2·3명)', () => {
  assert.equal(monthlyIncomeTax(3_000_000, 1, 0), 74_350);
  assert.equal(monthlyIncomeTax(3_019_999, 1, 0), 74_350);
  assert.equal(monthlyIncomeTax(3_010_000, 2, 0), 56_850);
  assert.equal(monthlyIncomeTax(3_010_000, 3, 0), 31_940);
});

test('간이세액표: 구간 경계 (미만 규칙)', () => {
  // 3,020천원부터는 다음 행이므로 값이 달라야 함
  assert.notEqual(monthlyIncomeTax(3_020_000, 1, 0), monthlyIncomeTax(3_019_999, 1, 0));
  assert.equal(monthlyIncomeTax(4_000_000, 1, 0), 195_960);
  assert.equal(monthlyIncomeTax(4_000_000, 11, 0), 23_070);
});

test('간이세액표: 10,000천원 행과 초과 공식', () => {
  assert.equal(monthlyIncomeTax(9_990_000, 1, 0), 1_503_990);
  assert.equal(monthlyIncomeTax(10_000_000, 1, 0), 1_507_400);
  // 10,000천원 + 2,000천원 초과: 1,507,400 + 2,000,000×0.98×0.35 + 25,000 = 2,218,400
  assert.equal(monthlyIncomeTax(12_000_000, 1, 0), 2_218_400);
  // 14,000천원 초과 구간
  const t = monthlyIncomeTax(20_000_000, 1, 0);
  assert.equal(t, Math.floor((1_507_400 + 1_397_000 + 6_000_000 * 0.98 * 0.38) / 10) * 10);
});

test('간이세액표: 8세 이상 20세 이하 자녀 공제', () => {
  assert.equal(childDeduction(1), 20_830);
  assert.equal(childDeduction(2), 45_830);
  assert.equal(childDeduction(3), 79_160);
  // 3,000~3,020천원, 가족 3명: 31,940 - 20,830 = 11,110
  assert.equal(monthlyIncomeTax(3_010_000, 3, 1), 11_110);
  // 공제 후 음수면 0원
  assert.equal(monthlyIncomeTax(3_010_000, 3, 2), 0);
});

test('간이세액표: 공제대상가족 11명 초과 (표 주석 4)', () => {
  // 4,000천원: 11명 23,070, 10명 28,320 → 12명 = 23,070 - 5,250 = 17,820
  assert.equal(monthlyIncomeTax(4_000_000, 12, 0), 17_820);
});

// ---- 실수령액 ----

test('연봉 5,000만원 (비과세 0): 4대보험이 공개 자료와 일치', () => {
  const r = calcNetPay({ annualSalary: 50_000_000 });
  // 공개 예시: 국민연금 약 197,917 / 건강 약 149,792 / 장기요양 약 19,683 / 고용 약 37,500
  assert.ok(Math.abs(r.pension - 197_917) <= 10, `pension ${r.pension}`);
  assert.ok(Math.abs(r.health - 149_792) <= 10, `health ${r.health}`);
  assert.ok(Math.abs(r.longTermCare - 19_683) <= 10, `ltc ${r.longTermCare}`);
  assert.ok(Math.abs(r.employment - 37_500) <= 10, `employment ${r.employment}`);
});

test('연봉 3,600만원 (식대 20만): 합계 정합성', () => {
  const r = calcNetPay({ annualSalary: 36_000_000, nonTaxableMonthly: 200_000 });
  assert.equal(r.grossMonthly, 3_000_000);
  assert.equal(r.taxableMonthly, 2_800_000);
  assert.equal(r.deductionTotal, r.insuranceTotal + r.taxTotal);
  assert.equal(r.netMonthly, r.grossMonthly - r.deductionTotal);
  assert.ok(r.netMonthly > 2_500_000 && r.netMonthly < 2_800_000, `net ${r.netMonthly}`);
});

test('소득세는 비과세를 뺀 월급여로 간이세액표 조회', () => {
  const r = calcNetPay({ annualSalary: 48_000_000, nonTaxableMonthly: 200_000, familyCount: 1 });
  // 월 4,000,000 - 200,000 = 3,800,000 → 표 값과 같아야 함
  assert.equal(r.incomeTax, monthlyIncomeTax(3_800_000, 1, 0));
  assert.equal(r.localIncomeTax, Math.floor((r.incomeTax * 0.1) / 10) * 10);
});

test('국민연금 상한 적용 (월 1,000만원)', () => {
  const r = calcNetPay({ annualSalary: 120_000_000 });
  assert.equal(r.pension, Math.floor((6_590_000 * 0.0475) / 10) * 10);
});

test('국민연금 하한 적용 (월 30만원)', () => {
  const r = calcNetPay({ annualSalary: 3_600_000 });
  assert.equal(r.pension, Math.floor((410_000 * 0.0475) / 10) * 10);
});

test('부양가족·자녀가 많을수록 소득세 감소', () => {
  const a = calcNetPay({ annualSalary: 60_000_000, familyCount: 1 });
  const b = calcNetPay({ annualSalary: 60_000_000, familyCount: 3, children: 2 });
  assert.ok(b.incomeTax < a.incomeTax);
});

test('연봉이 높을수록 소득세가 줄어드는 역전 없음', () => {
  let prev = 0;
  for (let k = 800; k <= 15_000; k += 7) {
    const t = monthlyIncomeTax(k * 1000, 1, 0);
    assert.ok(t >= prev, `${k}천원에서 역전: ${t} < ${prev}`);
    prev = t;
  }
});

test('연봉이 높을수록 실수령액도 증가 (역전 없음)', () => {
  let prev = 0;
  for (let man = 2000; man <= 20000; man += 100) {
    const r = calcNetPay({ annualSalary: man * 10_000, nonTaxableMonthly: 200_000 });
    assert.ok(r.netMonthly >= prev, `${man}만원에서 역전`);
    prev = r.netMonthly;
  }
});

// ---- 주휴수당 ----

test('주휴수당: 시급 10,320원, 주 40시간', () => {
  const r = calcWeeklyHolidayPay({ hourlyWage: 10_320, weeklyHours: 40 });
  assert.equal(r.holidayHours, 8);
  assert.equal(r.weeklyHolidayPay, 82_560);
  assert.equal(r.meetsMinWage, true);
  // 2026 최저임금 월 환산액 2,156,880원 (209시간 기준)
  assert.equal(r.monthlyPaidHours, 209);
  assert.equal(r.monthlyTotal, 2_156_880);
});

test('주휴수당: 주 15시간 미만은 지급 대상 아님', () => {
  const r = calcWeeklyHolidayPay({ hourlyWage: 10_320, weeklyHours: 14 });
  assert.equal(r.eligible, false);
  assert.equal(r.weeklyHolidayPay, 0);
});

// ---- 퇴직금 ----

test('퇴직금: 2022-01-01 ~ 2025-12-31 (윤년 포함 1,461일)', () => {
  const r = calcSeverance({ startDate: '2022-01-01', endDate: '2025-12-31', last3MonthsPay: 9_000_000 });
  assert.equal(r.valid, true);
  assert.equal(r.tenureDays, 1461);
  // 퇴직 전 3개월: 2025-10-01 ~ 2025-12-31 = 92일
  assert.equal(r.last3MonthsDays, 92);
  assert.equal(r.eligible, true);
  assert.equal(r.severancePay, Math.floor(((9_000_000 / 92) * 30 * 1461) / 365));
});

test('퇴직금: 상여금·연차수당은 3/12만 평균임금에 반영', () => {
  const base = calcSeverance({ startDate: '2022-01-01', endDate: '2025-12-31', last3MonthsPay: 9_000_000 });
  const withBonus = calcSeverance({
    startDate: '2022-01-01',
    endDate: '2025-12-31',
    last3MonthsPay: 9_000_000,
    annualBonus: 4_000_000, // 3/12 = 1,000,000
    annualLeavePay: 800_000, // 3/12 = 200,000
  });
  assert.ok(withBonus.severancePay > base.severancePay);
  assert.equal(withBonus.averageDailyWage, Math.floor(10_200_000 / 92));
});

test('퇴직금: 1년 미만은 지급 대상 아님, 365일은 대상', () => {
  const short = calcSeverance({ startDate: '2025-01-02', endDate: '2025-12-31', last3MonthsPay: 9_000_000 });
  assert.equal(short.tenureDays, 364);
  assert.equal(short.eligible, false);
  assert.equal(short.severancePay, 0);
  const exact = calcSeverance({ startDate: '2025-01-01', endDate: '2025-12-31', last3MonthsPay: 9_000_000 });
  assert.equal(exact.tenureDays, 365);
  assert.equal(exact.eligible, true);
});

test('퇴직금: 월말 날짜 보정 및 잘못된 입력', () => {
  // 마지막 근무일 5/31 → 기간 끝 6/1, 3개월 전 3/1 → 92일
  const r = calcSeverance({ startDate: '2020-01-01', endDate: '2025-05-31', last3MonthsPay: 1 });
  assert.equal(r.last3MonthsDays, 92);
  assert.equal(calcSeverance({ startDate: '', endDate: '2025-01-01', last3MonthsPay: 1 }).valid, false);
  assert.equal(calcSeverance({ startDate: '2025-02-01', endDate: '2025-01-01', last3MonthsPay: 1 }).valid, false);
});
