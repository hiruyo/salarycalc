import test from 'node:test';
import assert from 'node:assert/strict';
import { calcNetPay } from '../src/lib/netpay.ts';
import { monthlyIncomeTax, childDeduction } from '../src/lib/withholding.ts';
import { calcWeeklyHolidayPay } from '../src/lib/weeklyHolidayPay.ts';
import { calcSeverance } from '../src/lib/severance.ts';
import { calcUnemployment } from '../src/lib/unemployment.ts';
import { freelancerFromGross, freelancerFromNet } from '../src/lib/freelancer.ts';
import { loadAll, listFor, save, remove, toCSV, MAX_PER_CALC, STORAGE_KEY, type StorageLike } from '../src/lib/history.ts';
import { period, addToDate, age, parseYMD } from '../src/lib/dateCalc.ts';
import { calcAnnualLeave, leaveDaysForYear, leaveHours } from '../src/lib/annualLeave.ts';
import { calcYearEnd, cardDeduction, earnedTaxCredit, childTaxCredit, earnedIncomeDeduction as yeEarnedDeduction } from '../src/lib/yearEndTax.ts';
import { calcEmployee, calcPayroll } from '../src/lib/payroll.ts';
import { legalConversionRate, jeonseToWolse, wolseToJeonse, impliedConversionRate } from '../src/lib/rentConversion.ts';

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

// ---- 실업급여 ----

test('실업급여: 하한액 = 10,320 × 80% × 8시간 = 66,048원', () => {
  const r = calcUnemployment({ lastWorkDate: '2026-09-30', last3MonthsPay: 6_000_000, age: 30, insuredPeriod: '1to3' });
  // 3개월(7/1~9/30) 92일, 평균임금 65,217 → 60% 39,130 → 하한 적용
  assert.equal(r.dailyMin, 66_048);
  assert.equal(r.limitApplied, 'min');
  assert.equal(r.dailyBenefit, 66_048);
  assert.equal(r.benefitDays, 150);
  assert.equal(r.totalBenefit, 66_048 * 150);
});

test('실업급여: 상한액 68,100원', () => {
  const r = calcUnemployment({ lastWorkDate: '2026-09-30', last3MonthsPay: 15_000_000, age: 40, insuredPeriod: '5to10' });
  assert.equal(r.limitApplied, 'max');
  assert.equal(r.dailyBenefit, 68_100);
  assert.equal(r.benefitDays, 210);
});

test('실업급여: 상·하한 사이 구간은 평균임금 × 60%', () => {
  // 92일 기준 평균임금 112,000원 → 60% = 67,200 (66,048 ~ 68,100 사이)
  const r = calcUnemployment({ lastWorkDate: '2026-09-30', last3MonthsPay: 112_000 * 92, age: 35, insuredPeriod: '3to5' });
  assert.equal(r.limitApplied, null);
  assert.equal(r.dailyBenefit, 67_200);
  assert.equal(r.monthlyBenefit, 67_200 * 30);
});

test('실업급여: 소정급여일수 (50세 이상·장애인 / 50세 미만)', () => {
  const base = { lastWorkDate: '2026-09-30', last3MonthsPay: 9_000_000 } as const;
  assert.equal(calcUnemployment({ ...base, age: 49, insuredPeriod: 'over10' }).benefitDays, 240);
  assert.equal(calcUnemployment({ ...base, age: 50, insuredPeriod: 'over10' }).benefitDays, 270);
  assert.equal(calcUnemployment({ ...base, age: 30, disabled: true, insuredPeriod: '1to3' }).benefitDays, 180);
  assert.equal(calcUnemployment({ ...base, age: 60, insuredPeriod: 'under1' }).benefitDays, 120);
});

test('실업급여: 단시간 근로자 하한액은 소정근로시간 비례, 8시간 초과는 8시간', () => {
  const base = { lastWorkDate: '2026-09-30', last3MonthsPay: 1_000_000, age: 30, insuredPeriod: '1to3' } as const;
  assert.equal(calcUnemployment({ ...base, dailyHours: 4 }).dailyMin, 33_024);
  assert.equal(calcUnemployment({ ...base, dailyHours: 10 }).dailyMin, 66_048);
});

test('실업급여: 잘못된 날짜', () => {
  const r = calcUnemployment({ lastWorkDate: '', last3MonthsPay: 1, age: 30, insuredPeriod: '1to3' });
  assert.equal(r.valid, false);
});

// ---- 프리랜서 3.3% ----

test('프리랜서: 100만원 → 소득세 30,000 + 지방세 3,000, 실수령 967,000', () => {
  const r = freelancerFromGross(1_000_000);
  assert.equal(r.incomeTax, 30_000);
  assert.equal(r.localIncomeTax, 3_000);
  assert.equal(r.taxTotal, 33_000);
  assert.equal(r.net, 967_000);
});

test('프리랜서: 10원 미만 절사', () => {
  const r = freelancerFromGross(123_456); // 3,703.68 → 3,700 / 370
  assert.equal(r.incomeTax, 3_700);
  assert.equal(r.localIncomeTax, 370);
  assert.equal(r.net, 123_456 - 4_070);
});

test('프리랜서: 실수령액 → 세전 역산은 목표 이상인 최소 금액', () => {
  for (const target of [967_000, 1_000_000, 2_500_000, 333_333, 50_000]) {
    const r = freelancerFromNet(target);
    assert.ok(r.net >= target, `${target}: net ${r.net}`);
    assert.ok(freelancerFromGross(r.gross - 1).net < target, `${target}: gross ${r.gross} 최소 아님`);
  }
  // 999,980원: 소득세 29,990 + 지방세 2,990 → 실수령 967,000 (절사 때문에 100만원보다 적어도 됨)
  assert.equal(freelancerFromNet(967_000).gross, 999_980);
});

// ---- 전월세 전환 ----

test('전월세: 법정 전환율 = min(10%, 기준금리 3.0% + 2%) = 5%', () => {
  assert.equal(legalConversionRate(), 0.05);
  assert.equal(legalConversionRate(0.09), 0.1);
});

test('전월세: 전세 3억 → 보증금 1억 + 월세 (2억 × 5% ÷ 12)', () => {
  const r = jeonseToWolse(300_000_000, 100_000_000, 0.05);
  assert.equal(r.valid, true);
  assert.equal(r.convertedDeposit, 200_000_000);
  assert.equal(r.monthlyRent, 833_333);
});

test('전월세: 월세 → 전세 환산과 역변환 일관성', () => {
  const r = wolseToJeonse(100_000_000, 833_333, 0.05);
  assert.equal(r.depositFromRent, 199_999_920);
  assert.equal(r.jeonseDeposit, 299_999_920);
  assert.equal(wolseToJeonse(50_000_000, 1_000_000, 0.05).jeonseDeposit, 290_000_000);
});

test('전월세: 실제 계약 전환율과 잘못된 입력', () => {
  assert.equal(impliedConversionRate(300_000_000, 100_000_000, 1_000_000), 0.06);
  assert.equal(impliedConversionRate(100_000_000, 100_000_000, 500_000), null);
  assert.equal(jeonseToWolse(100_000_000, 200_000_000, 0.05).valid, false);
});

// ---- 저장·이력 ----

function memStore(initial?: string): StorageLike & { data: Map<string, string> } {
  const data = new Map<string, string>();
  if (initial !== undefined) data.set(STORAGE_KEY, initial);
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };
}

const snapData = (calc: string, n: number) => ({
  calc,
  title: calc,
  inputs: [['salary', '세전 연봉 (만원)', String(n)]] as [string, string, string][],
  results: [['월 예상 실수령액', `${n}원`]] as [string, string][],
});

test('이력: 저장·조회·삭제, 계산기별 분리, 최신순', () => {
  const st = memStore();
  save(st, snapData('salary', 1), new Date('2026-10-01T00:00:00Z'));
  save(st, snapData('salary', 2), new Date('2026-10-02T00:00:00Z'));
  const other = save(st, snapData('severance-pay', 3), new Date('2026-10-03T00:00:00Z'))!;
  const list = listFor(st, 'salary');
  assert.deepEqual(list.map((s) => s.inputs[0][2]), ['2', '1']);
  assert.equal(listFor(st, 'severance-pay').length, 1);
  remove(st, other.id);
  assert.equal(listFor(st, 'severance-pay').length, 0);
  assert.equal(loadAll(st).length, 2);
});

test('이력: 계산기별 최대 개수 유지 (오래된 것부터 삭제)', () => {
  const st = memStore();
  for (let i = 0; i < MAX_PER_CALC + 5; i++) save(st, snapData('salary', i), new Date(Date.UTC(2026, 0, 1, 0, i)));
  save(st, snapData('rent-conversion', 99));
  const list = listFor(st, 'salary');
  assert.equal(list.length, MAX_PER_CALC);
  assert.equal(list[0].inputs[0][2], String(MAX_PER_CALC + 4));
  assert.equal(listFor(st, 'rent-conversion').length, 1);
});

test('이력: 깨진 데이터와 저장 실패에 안전', () => {
  assert.deepEqual(loadAll(memStore('not json')), []);
  assert.deepEqual(loadAll(memStore('{"a":1}')), []);
  assert.equal(loadAll(memStore('[{"id":1}]')).length, 0);
  const full: StorageLike = { getItem: () => null, setItem: () => { throw new Error('QuotaExceeded'); } };
  assert.equal(save(full, snapData('salary', 1)), null);
});

test('이력: CSV는 BOM·이스케이프·열 합치기', () => {
  const st = memStore();
  save(st, { calc: 'x', title: 'x', inputs: [['a', '메모', 'a,"b"']], results: [['결과', '1,000원']] }, new Date(2026, 9, 30, 9, 5));
  save(st, { calc: 'x', title: 'x', inputs: [['b', '기타', 'z']], results: [['결과', '2원']] }, new Date(2026, 9, 30, 9, 6));
  const csv = toCSV(listFor(st, 'x').reverse());
  assert.ok(csv.startsWith('\uFEFF'));
  const lines = csv.slice(1).split('\r\n');
  assert.equal(lines[0], '저장일시,메모,기타,결과');
  assert.equal(lines[1], '2026-10-30 09:05,"a,""b""",,"1,000원"');
  assert.equal(lines[2], '2026-10-30 09:06,,z,2원');
});

// ---- 날짜 계산 ----

test('날짜: 존재하지 않는 날짜는 거부', () => {
  assert.equal(parseYMD('2026-02-29'), null);
  assert.notEqual(parseYMD('2028-02-29'), null);
  assert.equal(parseYMD('2026-13-01'), null);
  assert.equal(period('2026-02-30', '2026-03-01').valid, false);
});

test('날짜: 기간 계산 (일수·포함 일수·주·년월일·요일)', () => {
  const r = period('2026-01-01', '2026-12-31');
  assert.equal(r.days, 364);
  assert.equal(r.daysInclusive, 365);
  assert.equal(r.weeks, 52);
  assert.equal(r.weekRemainder, 0);
  assert.equal(r.years, 0);
  assert.equal(r.months, 11);
  assert.equal(r.remainDays, 30);
  assert.equal(r.startWeekday, '목');
  assert.equal(r.endWeekday, '목');
  // 윤년 포함
  assert.equal(period('2028-01-01', '2029-01-01').days, 366);
  assert.equal(period('2028-01-01', '2029-01-01').years, 1);
});

test('날짜: 종료일이 빠르면 음수, 년월일은 절대값 기준', () => {
  const r = period('2026-11-05', '2026-10-05');
  assert.equal(r.days, -31);
  assert.equal(r.months, 1);
  assert.equal(r.remainDays, 0);
});

test('날짜: 평일 수 (주말 제외, 양 끝 포함)', () => {
  // 2026-11-02(월) ~ 2026-11-08(일): 평일 5일
  assert.equal(period('2026-11-02', '2026-11-08').weekdays, 5);
  // 2026-11-07(토) ~ 2026-11-08(일): 0일
  assert.equal(period('2026-11-07', '2026-11-08').weekdays, 0);
  // 같은 날(목)
  assert.equal(period('2026-11-05', '2026-11-05').weekdays, 1);
  // 4주 = 20일
  assert.equal(period('2026-11-02', '2026-11-29').weekdays, 20);
});

test('날짜: 더하기·빼기 (월말 보정 포함)', () => {
  assert.deepEqual(addToDate('2026-11-05', 100, 'day'), { valid: true, date: '2027-02-13', weekday: '토' });
  assert.equal(addToDate('2026-11-05', -5, 'day').date, '2026-10-31');
  assert.equal(addToDate('2026-11-05', 2, 'week').date, '2026-11-19');
  assert.equal(addToDate('2026-01-31', 1, 'month').date, '2026-02-28');
  assert.equal(addToDate('2028-01-31', 1, 'month').date, '2028-02-29');
  assert.equal(addToDate('2028-02-29', 1, 'year').date, '2029-02-28');
  assert.equal(addToDate('2026-03-31', -1, 'month').date, '2026-02-28');
  assert.equal(addToDate('', 1, 'day').valid, false);
});

test('날짜: 만 나이·연 나이·세는 나이, 다음 생일', () => {
  const r = age('1990-11-06', '2026-11-05');
  assert.equal(r.manAge, 35);
  assert.equal(r.yearAge, 36);
  assert.equal(r.koreanAge, 37);
  assert.equal(r.nextBirthday, '2026-11-06');
  assert.equal(r.daysToBirthday, 1);
  const today = age('1990-11-05', '2026-11-05');
  assert.equal(today.manAge, 36);
  assert.equal(today.daysToBirthday, 0);
  assert.equal(age('2026-11-05', '2026-11-05').daysSinceBirth, 1);
  assert.equal(age('2027-01-01', '2026-11-05').valid, false);
});

test('날짜: 2월 29일생은 평년에 3월 1일부터 나이 증가', () => {
  assert.equal(age('2000-02-29', '2027-02-28').manAge, 26);
  assert.equal(age('2000-02-29', '2027-03-01').manAge, 27);
  assert.equal(age('2000-02-29', '2028-02-29').manAge, 28);
  assert.equal(age('2000-02-29', '2026-11-05').nextBirthday, '2027-03-01');
});

// ---- 연차 ----

test('연차: 근속연수별 일수 (15일, 2년마다 1일 가산, 25일 상한)', () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6, 10, 20, 21, 30].map(leaveDaysForYear), [15, 15, 16, 16, 17, 17, 19, 24, 25, 25]);
  assert.equal(leaveDaysForYear(0), 0);
});

test('연차: 1년 미만은 1개월 근로를 마친 다음 날 1일씩 (1/1~7/31 개근 → 6일)', () => {
  const r = calcAnnualLeave({ startDate: '2026-01-01', refDate: '2026-07-31' });
  assert.equal(r.monthlyLeaveDays, 6);
  assert.equal(r.nextGrant?.date, '2026-08-01');
  assert.equal(r.totalAccruedDays, 6);
  assert.equal(r.latestYearGrant, null);
});

test('연차: 365일 근무 후 퇴사는 11일, 366일째 재직하면 15일 추가 (총 26일)', () => {
  const r365 = calcAnnualLeave({ startDate: '2026-01-01', refDate: '2026-12-31' });
  assert.equal(r365.tenureDays, 365);
  assert.equal(r365.monthlyLeaveDays, 11);
  assert.equal(r365.totalAccruedDays, 11);
  assert.equal(r365.nextGrant?.days, 15);
  assert.equal(r365.nextGrant?.date, '2027-01-01');
  const r366 = calcAnnualLeave({ startDate: '2026-01-01', refDate: '2027-01-01' });
  assert.equal(r366.yearsCompleted, 1);
  assert.equal(r366.latestYearGrant?.days, 15);
  assert.equal(r366.totalAccruedDays, 26);
});

test('연차: 3년차 16일, 일정은 25일 도달(21년)까지', () => {
  const r = calcAnnualLeave({ startDate: '2020-03-02', refDate: '2026-11-06' });
  assert.equal(r.yearsCompleted, 6);
  assert.equal(r.latestYearGrant?.days, 17); // 6년 근속 → 17일
  assert.equal(r.nextGrant?.date, '2027-03-02');
  assert.equal(r.nextGrant?.days, 18);
  assert.equal(r.schedule.length, 21);
  assert.equal(r.schedule.at(-1)?.days, 25);
  // 11 + 15 + 15 + 16 + 16 + 17 + 17
  assert.equal(r.totalAccruedDays, 107);
});

test('연차: 단시간 근로자는 시간 비례 (15일 × 20/40 × 8 = 60시간), 1시간 미만 올림', () => {
  assert.equal(leaveHours(15, 20), 60);
  assert.equal(leaveHours(1, 15), 3); // 1 × 15/40 × 8 = 3
  assert.equal(leaveHours(1, 17), 4); // 3.4 → 4
  assert.equal(leaveHours(1, 50), 8); // 40시간 초과는 40으로
  const r = calcAnnualLeave({ startDate: '2026-01-01', refDate: '2027-01-01', weeklyHours: 20 });
  assert.equal(r.hoursPerDay, 4);
});

test('연차: 주 15시간 미만은 미적용, 연차수당 계산', () => {
  const r = calcAnnualLeave({ startDate: '2025-01-01', refDate: '2026-11-06', weeklyHours: 14 });
  assert.equal(r.eligible, false);
  assert.equal(r.totalAccruedDays, 0);
  assert.equal(r.nextGrant, null);
  const pay = calcAnnualLeave({ startDate: '2025-01-01', refDate: '2026-11-06', hourlyWage: 15_000, unusedDays: 5 });
  assert.equal(pay.unusedHours, 40);
  assert.equal(pay.allowance, 600_000);
  assert.equal(calcAnnualLeave({ startDate: '2027-01-01', refDate: '2026-01-01' }).valid, false);
});

// ---- 연말정산 (2026년 귀속) ----

test('연말정산: 총급여 5,000만원 1인 가구, 공제 없음 (손계산과 일치)', () => {
  const r = calcYearEnd({ salary: 50_000_000, prepaidTax: 3_000_000 });
  assert.equal(r.earnedDeduction, 12_250_000);
  assert.equal(r.earnedIncome, 37_750_000);
  assert.equal(r.pensionPaid, 197_910 * 12);
  assert.equal(r.insurancePaid, (149_790 + 19_680 + 37_490) * 12);
  // 과세표준 37,750,000 - 1,500,000 - 2,374,920 - 2,483,520 = 31,391,560
  assert.equal(r.taxBase, 31_391_560);
  assert.equal(r.calculatedTax, 3_448_734);
  assert.equal(r.credits.earned, 660_000); // 총급여 5천: 한도 max(66만, 74만 - 1,700만×0.8%) = 66만
  assert.equal(r.method, 'itemized');
  assert.equal(r.decidedTax, 2_788_730);
  assert.equal(r.decidedLocalTax, 278_870);
  assert.equal(r.refund, 3_000_000 + 300_000 - 2_788_730 - 278_870);
});

test('연말정산: 근로소득공제·근로소득세액공제 한도', () => {
  assert.equal(yeEarnedDeduction(5_000_000), 3_500_000);
  assert.equal(yeEarnedDeduction(500_000_000), 20_000_000);
  assert.equal(earnedTaxCredit(1_000_000, 30_000_000), 550_000);
  assert.equal(earnedTaxCredit(3_000_000, 30_000_000), 740_000);
  assert.equal(earnedTaxCredit(10_000_000, 100_000_000), 500_000);
  assert.equal(earnedTaxCredit(30_000_000, 200_000_000), 200_000);
});

test('연말정산: 신용카드 공제 (최저사용금액은 신용카드부터 차감, 추가한도)', () => {
  const r = cardDeduction({ salary: 50_000_000, creditCard: 20_000_000, debitCash: 5_000_000, culture: 0, market: 1_000_000, transit: 1_000_000, childrenUnder20: 0 });
  // 신용 750만×15% + 체크 500만×30% + 시장 100만×40% + 교통 100만×40% = 342.5만
  assert.equal(r.minSpend, 12_500_000);
  assert.equal(r.baseLimit, 3_000_000);
  assert.equal(r.base, 3_000_000);
  assert.equal(r.extra, 425_000);
  assert.equal(r.deduction, 3_425_000);
  // 자녀 2명 → 기본한도 400만
  const k = cardDeduction({ salary: 50_000_000, creditCard: 20_000_000, debitCash: 5_000_000, culture: 0, market: 1_000_000, transit: 1_000_000, childrenUnder20: 2 });
  assert.equal(k.baseLimit, 4_000_000);
  assert.equal(k.extra, 0);
  assert.equal(k.deduction, 3_425_000);
  // 추가한도 풀은 전통시장·대중교통 공제분까지만
  const big = cardDeduction({ salary: 50_000_000, creditCard: 12_500_000, debitCash: 20_000_000, culture: 0, market: 500_000, transit: 0, childrenUnder20: 0 });
  assert.equal(big.base, 3_000_000);
  assert.equal(big.extra, 200_000);
});

test('연말정산: 총급여 7천 초과는 기본한도 250만(자녀 1명 275만), 문화체육은 신용카드로 계산', () => {
  const r = cardDeduction({ salary: 80_000_000, creditCard: 20_000_000, debitCash: 10_000_000, culture: 2_000_000, market: 0, transit: 0, childrenUnder20: 1 });
  // 최저 2,000만은 신용카드(문화 포함 2,200만)에서 차감 → 신용 200만×15% + 체크 1,000만×30% = 330만
  assert.equal(r.baseLimit, 2_750_000);
  assert.equal(r.base, 2_750_000);
  assert.equal(r.extra, 0);
});

test('연말정산: 세액공제 항목 (자녀·연금·의료·월세·결혼·출산)', () => {
  assert.deepEqual([0, 1, 2, 3, 4].map(childTaxCredit), [0, 250_000, 550_000, 950_000, 1_350_000]);
  const base = { salary: 40_000_000, prepaidTax: 0 };
  const none = calcYearEnd(base);
  const r = calcYearEnd({
    ...base, pensionSavings: 8_000_000, irp: 5_000_000, medicalOther: 1_000_000, medicalSelf: 2_000_000,
    rent: 6_000_000, married: true, birthOrder: 2,
  });
  assert.equal(r.credits.pension, 1_350_000); // min(600만,800만)+500만=1,100만 → 900만 × 15%
  assert.equal(r.credits.medical, 270_000); // 기준 120만: 기타 100만 소진, 본인 200만-20만=180만 × 15%
  assert.equal(r.credits.rent, 1_020_000); // 600만 × 17%
  assert.equal(r.credits.marriage, 500_000);
  assert.equal(r.credits.birth, 500_000);
  assert.ok(r.decidedTax < none.decidedTax);
  // 총급여 5,500만 초과면 연금 12%, 8천 초과면 월세 없음
  assert.equal(calcYearEnd({ salary: 60_000_000, irp: 9_000_000 }).credits.pension, 1_080_000);
  assert.equal(calcYearEnd({ salary: 90_000_000, rent: 6_000_000 }).credits.rent, 0);
});

test('연말정산: 특별공제가 적으면 표준세액공제와 비교해 유리한 쪽 선택', () => {
  for (const salary of [20_000_000, 35_000_000, 60_000_000, 100_000_000]) {
    const r = calcYearEnd({ salary, donation: 100_000 });
    assert.ok(['itemized', 'standard'].includes(r.method));
    assert.ok(r.decidedTax >= 0);
  }
  // 4대보험 공제를 직접 0으로 넣으면 특별소득공제가 없어 표준세액공제가 유리
  assert.equal(calcYearEnd({ salary: 50_000_000, insurancePaid: 0 }).method, 'standard');
});

test('연말정산: 결정세액은 음수가 되지 않고, 기납부 추정은 간이세액표 × 12', () => {
  const r = calcYearEnd({ salary: 20_000_000, dependents: 4, children9plus: 2, childrenUnder20: 2, pensionSavings: 6_000_000 });
  assert.equal(r.decidedTax, 0);
  assert.equal(r.prepaidEstimated, true);
  assert.ok(r.refund >= 0);
  assert.equal(calcYearEnd({ salary: 0 }).valid, false);
});

test('연말정산: 기부금은 근로소득금액 30%까지, 장애인 자녀는 20세 초과도 자녀공제', () => {
  const r = calcYearEnd({ salary: 30_000_000, donation: 50_000_000 });
  // 근로소득금액 = 3,000만 - (750만 + 1,500만×15%) = 2,025만 → 30% = 607.5만 × 15%
  assert.equal(r.earnedIncome, 20_250_000);
  // 표준세액공제가 선택될 수도 있으니 특별공제 적용 시 기부금 공제액만 직접 확인
  const itemized = calcYearEnd({ salary: 30_000_000, donation: 50_000_000, insurancePaid: 5_000_000 });
  assert.equal(itemized.credits.donation, Math.floor(6_075_000 * 0.15));
  const disabledAdult = calcYearEnd({ salary: 60_000_000, childrenUnder20: 0, children9plus: 1 });
  assert.equal(disabledAdult.credits.child, 250_000);
});

// ---- 인건비 (사업주) ----

test('인건비: 월급 300만원(식대 20만), 150인 미만, 산재 1.47%', () => {
  const opt = { companySize: 'u150' as const, industrialRate: 0.0147 };
  const r = calcEmployee({ payType: 'monthly', monthlyPay: 3_000_000, nonTaxable: 200_000 }, opt);
  // 기준 보수 280만원
  assert.equal(r.taxable, 2_800_000);
  assert.equal(r.employer.pension, Math.floor((2_800_000 * 0.0475) / 10) * 10); // 133,000
  assert.equal(r.employer.health, Math.floor((2_800_000 * 0.03595) / 10) * 10); // 100,660
  assert.equal(r.employer.employment, Math.floor((2_800_000 * 0.0115) / 10) * 10); // 0.9% + 0.25%
  assert.equal(r.employer.industrial, Math.floor((2_800_000 * 0.0147) / 10) * 10);
  assert.equal(r.severanceReserve, 250_000);
  assert.equal(r.totalCost, 3_000_000 + r.employer.total + 250_000);
  // 근로자 실수령액은 실수령액 계산기와 같아야 함
  const np = calcNetPay({ annualSalary: 36_000_000, nonTaxableMonthly: 200_000 });
  assert.equal(r.net, np.netMonthly);
});

test('인건비: 회사 규모별 고용보험 사업주 부담', () => {
  const base = { payType: 'monthly' as const, monthlyPay: 4_000_000 };
  const rate = (size: 'u150' | 'p150' | 'm1000' | 'o1000') => calcEmployee(base, { companySize: size, industrialRate: 0 }).employer.employment;
  assert.equal(rate('u150'), 46_000); // 1.15%
  assert.equal(rate('p150'), 54_000); // 1.35%
  assert.equal(rate('m1000'), 62_000); // 1.55%
  assert.equal(rate('o1000'), 70_000); // 1.75%
});

test('인건비: 시급제는 주휴수당 포함 월급, 주 15시간 미만은 산재만', () => {
  const opt = { companySize: 'u150' as const, industrialRate: 0.0147 };
  const full = calcEmployee({ payType: 'hourly', hourlyWage: 10_320, weeklyHours: 40 }, opt);
  assert.equal(full.gross, 2_156_880);
  assert.equal(full.insured, true);
  const short = calcEmployee({ payType: 'hourly', hourlyWage: 12_000, weeklyHours: 14 }, opt);
  assert.equal(short.insured, false);
  assert.equal(short.employer.pension + short.employer.health + short.employer.employment, 0);
  assert.ok(short.employer.industrial > 0);
});

test('인건비: 여러 명 합계', () => {
  const opt = { companySize: 'u150' as const, industrialRate: 0.0147 };
  const list = [
    { payType: 'monthly' as const, monthlyPay: 3_000_000, nonTaxable: 200_000 },
    { payType: 'hourly' as const, hourlyWage: 11_000, weeklyHours: 20 },
  ];
  const r = calcPayroll(list, opt);
  assert.equal(r.employees.length, 2);
  assert.equal(r.gross, r.employees[0].gross + r.employees[1].gross);
  assert.equal(r.totalCost, r.gross + r.employer.total + r.severanceReserve);
  assert.ok(r.extraRatio > 0.15 && r.extraRatio < 0.25, `ratio ${r.extraRatio}`);
  assert.equal(calcPayroll([], opt).totalCost, 0);
});

test('반올림: 부동소수점 오차로 10원이 덜 나오지 않음', () => {
  // 1,340,000 × 0.9% = 12,060 (오차로 12059.999… → 12,050이 되면 안 됨)
  const r = calcNetPay({ annualSalary: 1_340_000 * 12 });
  assert.equal(r.employment, 12_060);
  for (let m = 1_000_000; m <= 10_000_000; m += 10_000) {
    const e = calcNetPay({ annualSalary: m * 12 }).employment;
    assert.equal(e, Math.floor(Math.round(m * 9) / 10000) * 10, `${m}`);
  }
});
