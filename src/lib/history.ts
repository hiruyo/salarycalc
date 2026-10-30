/**
 * 계산 결과 저장·이력 (브라우저 localStorage, 로그인 없음).
 * 저장소를 주입받아서 테스트할 수 있게 만든 순수 로직입니다.
 * 나중에 유료 클라우드 저장으로 바꿀 때 이 인터페이스를 서버 저장소로 교체하면 됩니다.
 */

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** [키, 라벨, 값] — 키는 입력 요소 id 또는 'radio:<name>' */
export type InputEntry = [key: string, label: string, value: string];
/** [라벨, 값] */
export type ResultEntry = [label: string, value: string];

export interface Snapshot {
  id: string;
  calc: string;
  title: string;
  savedAt: string; // ISO
  inputs: InputEntry[];
  results: ResultEntry[];
}

export const STORAGE_KEY = 'wolgeup:history:v1';
export const MAX_PER_CALC = 30;

function isSnapshot(x: unknown): x is Snapshot {
  const s = x as Snapshot;
  return (
    !!s &&
    typeof s.id === 'string' &&
    typeof s.calc === 'string' &&
    typeof s.savedAt === 'string' &&
    Array.isArray(s.inputs) &&
    Array.isArray(s.results)
  );
}

export function loadAll(store: StorageLike): Snapshot[] {
  try {
    const raw = store.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isSnapshot) : [];
  } catch {
    return [];
  }
}

function writeAll(store: StorageLike, all: Snapshot[]): boolean {
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(all));
    return true;
  } catch {
    return false;
  }
}

/** 최신순 */
export function listFor(store: StorageLike, calc: string): Snapshot[] {
  return loadAll(store)
    .filter((s) => s.calc === calc)
    .sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

/** 저장 후 저장된 스냅샷을 반환. 저장소를 쓸 수 없으면 null. 계산기별 최대 MAX_PER_CALC개 유지. */
export function save(
  store: StorageLike,
  data: Omit<Snapshot, 'id' | 'savedAt'>,
  now: Date = new Date(),
): Snapshot | null {
  const snap: Snapshot = {
    ...data,
    id: `${now.getTime().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    savedAt: now.toISOString(),
  };
  const all = loadAll(store);
  const mine = all.filter((s) => s.calc === data.calc).sort((a, b) => b.savedAt.localeCompare(a.savedAt));
  const keepIds = new Set(mine.slice(0, MAX_PER_CALC - 1).map((s) => s.id));
  const next = all.filter((s) => s.calc !== data.calc || keepIds.has(s.id));
  next.push(snap);
  return writeAll(store, next) ? snap : null;
}

export function remove(store: StorageLike, id: string): boolean {
  return writeAll(
    store,
    loadAll(store).filter((s) => s.id !== id),
  );
}

function csvCell(v: string): string {
  return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/** 한 계산기의 이력을 CSV로 (엑셀 한글 호환을 위해 BOM 포함). 열은 첫 등장 순서로 합칩니다. */
export function toCSV(snaps: Snapshot[]): string {
  const inputCols: string[] = [];
  const resultCols: string[] = [];
  for (const s of snaps) {
    for (const [, label] of s.inputs) if (!inputCols.includes(label)) inputCols.push(label);
    for (const [label] of s.results) if (!resultCols.includes(label)) resultCols.push(label);
  }
  const header = ['저장일시', ...inputCols, ...resultCols];
  const lines = [header.map(csvCell).join(',')];
  for (const s of snaps) {
    const inputs = new Map(s.inputs.map(([, l, v]) => [l, v]));
    const results = new Map(s.results);
    const row = [
      formatDate(s.savedAt),
      ...inputCols.map((c) => inputs.get(c) ?? ''),
      ...resultCols.map((c) => results.get(c) ?? ''),
    ];
    lines.push(row.map(csvCell).join(','));
  }
  return '﻿' + lines.join('\r\n');
}

/** 'YYYY-MM-DD HH:mm' (로컬 시간) */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
