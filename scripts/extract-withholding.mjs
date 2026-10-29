/**
 * 근로소득 간이세액표(pdftotext -layout 결과 텍스트)를 src/rates/withholding<연도>.ts 로 변환합니다.
 *
 * 사용법 (매년 세법 개정 시):
 *   pdftotext -layout 간이세액표.pdf table.txt
 *   node scripts/extract-withholding.mjs table.txt > src/rates/withholding2026.ts
 */
import { readFileSync } from 'node:fs';

const file = process.argv[2];
if (!file) {
  console.error('usage: node scripts/extract-withholding.mjs <table.txt>');
  process.exit(1);
}

const NUM = String.raw`(?:-|\d{1,3}(?:,\d{3})*)`;
const rowRe = new RegExp(String.raw`^\s*(\d{1,3}(?:,\d{3})*)\s+(\d{1,3}(?:,\d{3})*)\s+((?:${NUM})(?:\s+${NUM}){10})\s*$`);
const row10mRe = new RegExp(String.raw`^\s*10,000천원\s+((?:${NUM})(?:\s+${NUM}){10})\s*$`);

const toNum = (s) => (s === '-' ? 0 : Number(s.replace(/,/g, '')));

const rows = [];
let at10m = null;
for (const line of readFileSync(file, 'utf8').split('\n')) {
  const m10 = line.match(row10mRe);
  if (m10) {
    at10m = m10[1].trim().split(/\s+/).map(toNum);
    continue;
  }
  const m = line.match(rowRe);
  if (!m) continue;
  const low = toNum(m[1]);
  const high = toNum(m[2]);
  if (high <= low) continue; // 표 머리글 등 제외
  rows.push([low, high, ...m[3].trim().split(/\s+/).map(toNum)]);
}

// 검증: 구간이 끊김 없이 이어지는지
for (let i = 1; i < rows.length; i++) {
  if (rows[i][0] !== rows[i - 1][1]) {
    console.error(`구간 불연속: ${rows[i - 1][1]} -> ${rows[i][0]}`);
    process.exit(2);
  }
}
if (!at10m || at10m.length !== 11) {
  console.error('10,000천원 행을 찾지 못했습니다');
  process.exit(3);
}

console.error(`rows=${rows.length}, first=${rows[0][0]}, last=${rows.at(-1)[1]}`);

console.log(`// 자동 생성 파일 (scripts/extract-withholding.mjs). 직접 수정하지 마세요.
// 출처: 소득세법 시행령 [별표 2] 근로소득 간이세액표
// 행: [월급여 이상(천원), 미만(천원), 공제대상가족 1명 ~ 11명 세액(원)]
export const WITHHOLDING_ROWS: number[][] = [`);
for (const r of rows) console.log(`  [${r.join(',')}],`);
console.log(`];

/** 월급여 10,000천원인 경우의 세액 (가족 1~11명) */
export const WITHHOLDING_AT_10M: number[] = [${at10m.join(',')}];
`);
