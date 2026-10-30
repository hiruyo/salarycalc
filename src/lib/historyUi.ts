/**
 * 저장·이력 UI (브라우저 전용). SaveHistory.astro 컴포넌트에서 사용합니다.
 * - 입력값: 페이지의 #calc-form 안의 입력 요소를 자동으로 수집
 * - 결과값: [data-history-results] 영역의 큰 숫자와 표(th/td)를 자동으로 수집
 */
import { listFor, save, remove, toCSV, formatDate, type InputEntry, type ResultEntry, type StorageLike } from './history';

/** 사용량 측정 훅. GA4(gtag)를 붙이면 자동으로 이벤트가 전송됩니다. */
function track(event: string, params: Record<string, string>) {
  const w = window as unknown as { gtag?: (...args: unknown[]) => void };
  try {
    w.gtag?.('event', event, params);
  } catch {
    /* 무시 */
  }
}

function getStore(): StorageLike | null {
  try {
    const s = window.localStorage;
    const k = '__wolgeup_test__';
    s.setItem(k, '1');
    s.removeItem(k);
    return s;
  } catch {
    return null;
  }
}

function labelFor(form: HTMLFormElement, el: HTMLInputElement | HTMLSelectElement): string {
  if (el.id) {
    const l = form.querySelector<HTMLLabelElement>(`label[for="${el.id}"]`);
    if (l) return l.textContent!.trim();
  }
  const parent = el.closest('label');
  return (parent?.textContent ?? el.id ?? el.name).trim();
}

function collectInputs(form: HTMLFormElement): InputEntry[] {
  const out: InputEntry[] = [];
  const seenRadio = new Set<string>();
  for (const el of Array.from(form.elements)) {
    if (!(el instanceof HTMLInputElement || el instanceof HTMLSelectElement)) continue;
    const wrapper = el.closest('[hidden]');
    if (wrapper) continue; // 숨겨진 입력(다른 계산 방향)은 제외
    if (el instanceof HTMLInputElement && el.type === 'radio') {
      if (seenRadio.has(el.name) || !el.checked) continue;
      seenRadio.add(el.name);
      out.push([`radio:${el.name}`, '계산 방향', labelFor(form, el)]);
      continue;
    }
    if (!el.id) continue;
    if (el instanceof HTMLInputElement && el.type === 'checkbox') {
      out.push([el.id, labelFor(form, el), el.checked ? '예' : '아니오']);
      continue;
    }
    if (el instanceof HTMLSelectElement) {
      out.push([el.id, labelFor(form, el), el.options[el.selectedIndex]?.text ?? el.value]);
      continue;
    }
    out.push([el.id, labelFor(form, el), el.value]);
  }
  return out;
}

function collectResults(root: HTMLElement): ResultEntry[] {
  const out: ResultEntry[] = [];
  const mainLabel = root.querySelector('.result-main .label')?.textContent?.trim();
  const mainValue = root.querySelector('.result-main .big')?.textContent?.trim();
  if (mainLabel && mainValue) out.push([mainLabel, mainValue]);
  root.querySelectorAll('tr').forEach((tr) => {
    const th = tr.querySelector('th')?.textContent?.trim();
    const td = tr.querySelector('td')?.textContent?.trim();
    if (th && td && !out.some(([l]) => l === th)) out.push([th, td]);
  });
  return out;
}

function restore(form: HTMLFormElement, inputs: InputEntry[]) {
  // 라디오(계산 방향)를 먼저 복원해야 해당 입력 칸이 보임
  const ordered = [...inputs].sort((a, b) => Number(b[0].startsWith('radio:')) - Number(a[0].startsWith('radio:')));
  for (const [key, , value] of ordered) {
    if (key.startsWith('radio:')) {
      const name = key.slice(6);
      form.querySelectorAll<HTMLInputElement>(`input[type="radio"][name="${name}"]`).forEach((r) => {
        r.checked = labelFor(form, r) === value;
      });
      form.dispatchEvent(new Event('change', { bubbles: true }));
      continue;
    }
    const el = form.querySelector<HTMLInputElement | HTMLSelectElement>(`#${CSS.escape(key)}`);
    if (!el) continue;
    if (el instanceof HTMLInputElement && el.type === 'checkbox') el.checked = value === '예';
    else if (el instanceof HTMLSelectElement) {
      const opt = Array.from(el.options).find((o) => o.text === value || o.value === value);
      if (opt) el.value = opt.value;
    } else el.value = value;
  }
  form.dispatchEvent(new Event('input', { bubbles: true }));
  form.dispatchEvent(new Event('change', { bubbles: true }));
}

function download(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function mountHistory(section: HTMLElement) {
  const calc = section.dataset.calc!;
  const title = section.dataset.title ?? calc;
  const form = document.getElementById('calc-form') as HTMLFormElement | null;
  const resultsRoot = document.querySelector<HTMLElement>('[data-history-results]');
  const list = section.querySelector<HTMLUListElement>('[data-list]')!;
  const msg = section.querySelector<HTMLElement>('[data-msg]')!;
  const store = getStore();

  if (!form || !resultsRoot) return;
  if (!store) {
    msg.textContent = '이 브라우저에서는 저장 기능을 쓸 수 없어요 (개인정보 보호 모드 등).';
    section.querySelectorAll('button').forEach((b) => (b.disabled = true));
    return;
  }

  const say = (text: string) => {
    msg.textContent = text;
  };

  function render() {
    const items = listFor(store!, calc);
    list.innerHTML = '';
    section.querySelector<HTMLButtonElement>('[data-act="csv"]')!.disabled = items.length === 0;
    if (items.length === 0) {
      const li = document.createElement('li');
      li.className = 'history-empty';
      li.textContent = '저장한 계산이 없어요. 결과를 저장하면 여기에 쌓여요.';
      list.append(li);
      return;
    }
    for (const s of items) {
      const li = document.createElement('li');
      const info = document.createElement('div');
      const date = document.createElement('span');
      date.className = 'history-date';
      date.textContent = formatDate(s.savedAt);
      const main = document.createElement('strong');
      main.textContent = s.results[0] ? `${s.results[0][0]} ${s.results[0][1]}` : '';
      const sub = document.createElement('span');
      sub.className = 'history-sub';
      sub.textContent = s.inputs
        .slice(0, 3)
        .map(([, l, v]) => `${l.replace(/\s*\(.*?\)\s*/g, '')} ${v}`)
        .join(' · ');
      info.append(date, main, sub);

      const actions = document.createElement('div');
      actions.className = 'history-item-actions';
      const load = document.createElement('button');
      load.type = 'button';
      load.textContent = '불러오기';
      load.addEventListener('click', () => {
        restore(form!, s.inputs);
        say('저장한 값을 불러왔어요.');
        form!.scrollIntoView({ behavior: 'smooth', block: 'start' });
        track('history_load', { calc });
      });
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'ghost';
      del.textContent = '삭제';
      del.addEventListener('click', () => {
        remove(store!, s.id);
        render();
        say('삭제했어요.');
      });
      actions.append(load, del);
      li.append(info, actions);
      list.append(li);
    }
  }

  section.querySelector('[data-act="save"]')!.addEventListener('click', () => {
    const snap = save(store, { calc, title, inputs: collectInputs(form), results: collectResults(resultsRoot) });
    if (!snap) {
      say('저장 공간이 부족해서 저장하지 못했어요.');
      return;
    }
    render();
    say('저장했어요. 이 브라우저에만 보관돼요.');
    track('history_save', { calc });
  });

  section.querySelector('[data-act="csv"]')!.addEventListener('click', () => {
    const items = listFor(store, calc);
    if (items.length === 0) return;
    const d = new Date();
    const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    // 한글 파일명은 일부 브라우저에서 무시되어 'download'로 저장되므로 영문 id 사용
    download(`wolgeup-${calc}-${stamp}.csv`, toCSV([...items].reverse()));
    say('CSV 파일을 내려받았어요. 엑셀에서 열 수 있어요.');
    track('history_export', { calc });
  });

  render();
}
