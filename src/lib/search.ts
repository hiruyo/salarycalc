/**
 * 사이트 검색 (계산기·가이드). 순수 로직.
 * "알바 야간수당"처럼 띄어 써도, "알바야간수당"처럼 붙여 써도 찾을 수 있게
 * 단어별 포함 여부와 붙여 쓴 전체 검색어 포함 여부를 함께 봅니다.
 */
export interface SearchItem {
  href: string;
  title: string;
  desc: string;
  keywords?: string;
  kind: 'calc' | 'guide';
}

export interface SearchHit extends SearchItem {
  score: number;
}

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFC')
    .replace(/[\s·.,()/\-–—'"!?%~:]+/g, '');
}

export function search(items: SearchItem[], query: string, limit = 8): SearchHit[] {
  const q = query.trim();
  if (!q) return [];
  const compact = normalize(q);
  if (!compact) return [];
  const tokens = q.split(/\s+/).map(normalize).filter(Boolean);

  const hits: SearchHit[] = [];
  for (const it of items) {
    const title = normalize(it.title);
    const all = normalize(`${it.title} ${it.keywords ?? ''} ${it.desc}`);
    const tokenMatch = tokens.every((t) => all.includes(t));
    const compactMatch = all.includes(compact);
    if (!tokenMatch && !compactMatch) continue;
    let score = 1;
    if (title.includes(compact)) score += 4;
    else if (tokens.every((t) => title.includes(t))) score += 3;
    else if (tokens.some((t) => title.includes(t))) score += 1;
    if (title.startsWith(compact)) score += 1;
    // 계산기 동의어에 딱 맞으면 계산기를 위로 ("디데이" → 날짜 계산기)
    if (it.kind === 'calc' && it.keywords && it.keywords.split(/\s+/).map(normalize).some((k) => k === compact || k.includes(compact))) score += 4;
    if (it.kind === 'calc') score += 0.5; // 같은 점수면 계산기를 먼저
    hits.push({ ...it, score });
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, limit);
}
