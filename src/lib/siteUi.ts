/**
 * 모든 페이지 공통 기능 (브라우저 전용): 사이트 검색, 맨 위로 버튼, 최근 본 계산기·즐겨찾기.
 * 데이터는 Base 레이아웃의 <script type="application/json" id="site-data">에서 읽습니다.
 */
import { search, type SearchItem } from './search';

interface CalcLite {
  href: string;
  name: string;
  desc: string;
  icon: string;
  keywords: string;
}
interface SiteData {
  calcs: CalcLite[];
  guides: { href: string; title: string; desc: string }[];
}

const RECENT_KEY = 'barogyesanso:recent:v1';
const FAV_KEY = 'barogyesanso:favorites:v1';

function track(event: string, params: Record<string, string | number>) {
  try {
    (window as unknown as { gtag?: (...a: unknown[]) => void }).gtag?.('event', event, params);
  } catch {
    /* 무시 */
  }
}

function readList(key: string): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(key) ?? '[]');
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}
function writeList(key: string, list: string[]) {
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch {
    /* 저장 불가 환경 */
  }
}

const currentPath = () => location.pathname.replace(/\.html$/, '').replace(/(.)\/$/, '$1');

function iconNode(name: string): Node | null {
  const tpl = document.getElementById('calc-icons') as HTMLTemplateElement | null;
  const src = tpl?.content.querySelector(`[data-icon="${name}"] svg`);
  return src ? src.cloneNode(true) : null;
}

// ---------- 검색 ----------

function setupSearch(data: SiteData) {
  const dialog = document.getElementById('search-dialog') as HTMLDialogElement | null;
  const input = document.getElementById('search-input') as HTMLInputElement | null;
  const list = document.getElementById('search-results') as HTMLUListElement | null;
  if (!dialog || !input || !list) return;

  const items: SearchItem[] = [
    ...data.calcs.map((c) => ({ href: c.href, title: c.name, desc: c.desc, keywords: c.keywords, kind: 'calc' as const })),
    ...data.guides.map((g) => ({ href: g.href, title: g.title, desc: g.desc, kind: 'guide' as const })),
  ];
  let active = -1;

  const render = () => {
    const q = input.value;
    const hits = search(items, q);
    list.innerHTML = '';
    active = -1;
    if (!q.trim()) {
      const li = document.createElement('li');
      li.className = 'search-hint';
      li.textContent = '예: 퇴직금, 연차 수당, 알바 야간, 13월의 월급';
      list.append(li);
      return;
    }
    if (!hits.length) {
      const li = document.createElement('li');
      li.className = 'search-hint';
      li.textContent = `'${q.trim()}'에 맞는 계산기나 글이 없어요. 다른 단어로 찾아보세요.`;
      list.append(li);
      return;
    }
    hits.forEach((h, i) => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = h.href;
      a.id = `search-hit-${i}`;
      a.setAttribute('role', 'option');
      const kind = document.createElement('span');
      kind.className = 'search-kind';
      kind.textContent = h.kind === 'calc' ? '계산기' : '가이드';
      const t = document.createElement('strong');
      t.textContent = h.title;
      const d = document.createElement('span');
      d.className = 'search-desc';
      d.textContent = h.desc;
      a.append(kind, t, d);
      a.addEventListener('click', () => track('search_select', { kind: h.kind }));
      li.append(a);
      list.append(li);
    });
  };

  const open = () => {
    if (!dialog.open) dialog.showModal();
    input.select();
    render();
    track('search_open', { page: currentPath() });
  };

  document.querySelectorAll('[data-open-search]').forEach((b) => b.addEventListener('click', open));
  document.addEventListener('keydown', (e) => {
    const typing = (e.target as HTMLElement)?.closest?.('input, textarea, select, [contenteditable]');
    if ((e.key === '/' && !typing) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) {
      e.preventDefault();
      open();
    }
  });
  input.addEventListener('input', render);
  input.addEventListener('keydown', (e) => {
    const links = Array.from(list.querySelectorAll<HTMLAnchorElement>('a'));
    if (!links.length) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      active = (active + (e.key === 'ArrowDown' ? 1 : -1) + links.length) % links.length;
      links.forEach((l, i) => l.classList.toggle('active', i === active));
      links[active].scrollIntoView({ block: 'nearest' });
      input.setAttribute('aria-activedescendant', links[active].id);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      (links[Math.max(active, 0)]).click();
    }
  });
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close(); // 바깥(배경) 클릭 시 닫기
  });
  document.getElementById('search-close')?.addEventListener('click', () => dialog.close());
}

// ---------- 맨 위로 ----------

function setupBackToTop() {
  const btn = document.getElementById('to-top');
  if (!btn) return;
  const onScroll = () => btn.classList.toggle('show', window.scrollY > 700);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  btn.addEventListener('click', () => {
    const smooth = !matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: smooth ? 'smooth' : 'auto' });
    (document.querySelector('main h1') as HTMLElement | null)?.focus?.({ preventScroll: true });
  });
}

// ---------- 최근 본 계산기·즐겨찾기 ----------

function setupRecentAndFavorites(data: SiteData) {
  const byHref = new Map(data.calcs.map((c) => [c.href, c]));
  const path = currentPath();
  const current = byHref.get(path);

  // 계산기 페이지: 최근 본 목록에 기록 + 제목 옆 즐겨찾기 버튼
  if (current) {
    writeList(RECENT_KEY, [path, ...readList(RECENT_KEY).filter((h) => h !== path)].slice(0, 6));
    const h1 = document.querySelector('main h1');
    if (h1 && !document.getElementById('fav-toggle')) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.id = 'fav-toggle';
      btn.className = 'fav-toggle';
      const update = () => {
        const on = readList(FAV_KEY).includes(path);
        btn.setAttribute('aria-pressed', String(on));
        btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="${on ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/></svg><span>${on ? '즐겨찾기됨' : '즐겨찾기'}</span>`;
      };
      btn.addEventListener('click', () => {
        const favs = readList(FAV_KEY);
        const on = favs.includes(path);
        writeList(FAV_KEY, on ? favs.filter((h) => h !== path) : [path, ...favs].slice(0, 12));
        update();
        renderMenuFavorites();
        track(on ? 'favorite_remove' : 'favorite_add', { calc: path });
      });
      update();
      const wrap = document.createElement('div');
      wrap.className = 'title-row';
      h1.parentNode!.insertBefore(wrap, h1);
      wrap.append(h1, btn);
    }
  }

  // 메뉴 맨 위에 즐겨찾기 묶음
  function renderMenuFavorites() {
    const panel = document.querySelector('.menu-panel');
    if (!panel) return;
    panel.querySelector('.menu-group.favs')?.remove();
    const favs = readList(FAV_KEY).map((h) => byHref.get(h)).filter(Boolean) as CalcLite[];
    if (!favs.length) {
      panel.classList.remove('has-favs');
      return;
    }
    const group = document.createElement('div');
    group.className = 'menu-group favs';
    const title = document.createElement('p');
    title.className = 'menu-title';
    title.textContent = '즐겨찾기';
    const ul = document.createElement('ul');
    for (const c of favs) {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = c.href;
      const ic = iconNode(c.icon);
      if (ic) a.append(ic);
      a.append(c.name);
      li.append(a);
      ul.append(li);
    }
    group.append(title, ul);
    panel.prepend(group);
    panel.classList.add('has-favs');
  }
  renderMenuFavorites();

  // 홈: 내 계산기 (즐겨찾기 → 최근 본 순)
  const mine = document.getElementById('my-calcs');
  if (mine) {
    const favs = readList(FAV_KEY);
    const recent = readList(RECENT_KEY).filter((h) => !favs.includes(h));
    const entries = [...favs.map((h) => ({ h, fav: true })), ...recent.map((h) => ({ h, fav: false }))]
      .filter((e) => byHref.has(e.h))
      .slice(0, 6);
    const ul = mine.querySelector('ul')!;
    ul.innerHTML = '';
    for (const { h, fav } of entries) {
      const c = byHref.get(h)!;
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = c.href;
      const icon = document.createElement('span');
      icon.className = 'calc-icon';
      const ic = iconNode(c.icon);
      if (ic) icon.append(ic);
      const text = document.createElement('span');
      text.className = 'calc-text';
      const strong = document.createElement('strong');
      strong.textContent = c.name;
      const small = document.createElement('span');
      small.textContent = fav ? '즐겨찾기' : '최근 사용';
      text.append(strong, small);
      a.append(icon, text);
      li.append(a);
      ul.append(li);
    }
    mine.hidden = entries.length === 0;
  }
}

export function mountSiteUi() {
  let data: SiteData = { calcs: [], guides: [] };
  try {
    data = JSON.parse(document.getElementById('site-data')?.textContent ?? '{}');
  } catch {
    /* 무시 */
  }
  setupSearch(data);
  setupBackToTop();
  setupRecentAndFavorites(data);
}
