/**
 * 결과 공유 링크 + 명세서 이미지 저장 (브라우저 전용). ResultActions.astro에서 사용.
 */
import { decodeState, shareUrl, type FormState } from './shareState';

function track(event: string, params: Record<string, string>) {
  try {
    (window as unknown as { gtag?: (...a: unknown[]) => void }).gtag?.('event', event, params);
  } catch {
    /* 무시 */
  }
}

// ---------- 입력값 수집·복원 ----------

function collectState(form: HTMLFormElement): FormState {
  const state: FormState = {};
  for (const el of Array.from(form.elements)) {
    if (el instanceof HTMLInputElement) {
      if (el.type === 'radio') {
        if (el.checked && !el.defaultChecked && el.name) state[`@${el.name}`] = el.value;
        continue;
      }
      if (!el.id) continue;
      if (el.type === 'checkbox') {
        if (el.checked !== el.defaultChecked) state[el.id] = el.checked ? '1' : '0';
      } else if (el.value !== el.defaultValue || el.type === 'date') {
        // 기본값이 있는 칸을 비운 경우도 빈 값으로 전달 (받는 쪽에서 기본값이 되살아나지 않도록)
        if (el.value !== '' || el.defaultValue !== '') state[el.id] = el.value;
      }
    } else if (el instanceof HTMLSelectElement && el.id) {
      const def = Array.from(el.options).find((o) => o.defaultSelected)?.value ?? el.options[0]?.value;
      if (el.value !== def) state[el.id] = el.value;
    }
  }
  return state;
}

function applyState(form: HTMLFormElement, state: FormState): boolean {
  let applied = false;
  // 라디오 먼저 (계산 방향에 따라 입력칸이 바뀜)
  for (const [k, v] of Object.entries(state)) {
    if (!k.startsWith('@')) continue;
    form.querySelectorAll<HTMLInputElement>(`input[type="radio"][name="${CSS.escape(k.slice(1))}"]`).forEach((r) => {
      r.checked = r.value === v;
      applied = true;
    });
  }
  if (applied) form.dispatchEvent(new Event('change', { bubbles: true }));
  for (const [k, v] of Object.entries(state)) {
    if (k.startsWith('@')) continue;
    const el = form.querySelector<HTMLInputElement | HTMLSelectElement>(`#${CSS.escape(k)}`);
    if (!el) continue;
    if (el instanceof HTMLInputElement && el.type === 'checkbox') el.checked = v === '1';
    else if (el instanceof HTMLSelectElement) {
      if (Array.from(el.options).some((o) => o.value === v)) el.value = v;
    } else el.value = v;
    applied = true;
  }
  if (applied) {
    form.dispatchEvent(new Event('input', { bubbles: true }));
    form.dispatchEvent(new Event('change', { bubbles: true }));
  }
  return applied;
}

// ---------- 명세서 이미지 ----------

interface Row {
  label: string;
  value: string;
  total: boolean;
}

function readReceipt(receipt: HTMLElement) {
  const label = receipt.querySelector('.result-main .label')?.textContent?.trim() ?? '';
  const value = receipt.querySelector('.result-main .big')?.textContent?.trim() ?? '';
  const rows: Row[] = [];
  receipt.querySelectorAll<HTMLTableRowElement>('table tr').forEach((tr) => {
    if (tr.hidden) return;
    const th = tr.querySelector('th')?.textContent?.trim();
    const td = tr.querySelector('td')?.textContent?.trim();
    if (th && td) rows.push({ label: th, value: td, total: tr.classList.contains('total') });
  });
  return { label, value, rows };
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const ch of Array.from(text)) {
    const test = line + ch;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = ch;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

async function drawReceipt(receipt: HTMLElement, title: string): Promise<HTMLCanvasElement> {
  try {
    await document.fonts?.ready;
  } catch {
    /* 무시 */
  }
  const family = getComputedStyle(document.body).fontFamily || 'sans-serif';
  const { label, value, rows } = readReceipt(receipt);
  const W = 480;
  const PAD = 28;
  const scale = 2;
  const ink = '#1f2a37';
  const muted = '#5a6575';
  const line = '#d4dbe3';
  const seal = '#c8312a';
  const inner = W - PAD * 2;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  const font = (size: number, weight = 400) => `${weight} ${size}px ${family}`;

  // 1차: 높이 계산
  ctx.font = font(18, 700);
  const titleLines = wrapText(ctx, title, inner);
  const rowLayout = rows.map((r) => {
    ctx.font = font(14, r.total ? 700 : 400);
    const lw = ctx.measureText(r.label).width;
    ctx.font = font(15, r.total ? 700 : 400);
    const vw = ctx.measureText(r.value).width;
    const twoLine = lw + vw + 24 > inner;
    const valueLines = twoLine ? wrapText(ctx, r.value, inner) : [r.value];
    return { ...r, twoLine, valueLines, height: (twoLine ? 22 + valueLines.length * 20 : 30) + (r.total ? 8 : 0) };
  });
  let H = 0;
  H += 52; // 머리 띠
  H += 18 + titleLines.length * 26;
  H += 14 + 20 + 46 + 14; // 라벨 + 큰 숫자 + 여백
  H += rowLayout.reduce((a, r) => a + r.height, 0);
  H += 28 + 40 + 16; // 바닥 + 절취선

  canvas.width = W * scale;
  canvas.height = H * scale;
  ctx.scale(scale, scale);

  // 바탕
  ctx.fillStyle = '#eef2f6';
  ctx.fillRect(0, 0, W, H);
  const paperBottom = H - 16;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, paperBottom);
  // 절취선 (톱니)
  for (let x = 0; x < W; x += 10) {
    ctx.beginPath();
    ctx.moveTo(x, paperBottom);
    ctx.lineTo(x + 5, paperBottom + 6);
    ctx.lineTo(x + 10, paperBottom);
    ctx.fill();
  }

  let y = 0;
  // 머리 띠
  ctx.fillStyle = ink;
  ctx.font = font(13, 700);
  ctx.textBaseline = 'middle';
  ctx.fillText('계산 명세', PAD, 26);
  // 도장 로고
  const sx = W - PAD - 34;
  ctx.save();
  ctx.translate(sx + 17, 26);
  ctx.rotate((-6 * Math.PI) / 180);
  ctx.strokeStyle = seal;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect?.(-15, -15, 30, 30, 6);
  if (!ctx.roundRect) ctx.rect(-15, -15, 30, 30);
  ctx.stroke();
  ctx.fillStyle = seal;
  ctx.font = font(10, 700);
  ctx.textAlign = 'center';
  ctx.fillText('바로', 0, 1);
  ctx.restore();
  ctx.textAlign = 'left';
  ctx.fillStyle = ink;
  ctx.fillRect(0, 51, W, 2);
  y = 52;

  // 제목
  y += 18;
  ctx.textBaseline = 'top';
  ctx.font = font(18, 700);
  for (const t of titleLines) {
    ctx.fillText(t, PAD, y);
    y += 26;
  }

  // 큰 결과
  y += 14;
  ctx.fillStyle = muted;
  ctx.font = font(13);
  ctx.fillText(label, PAD, y);
  y += 20;
  ctx.fillStyle = ink;
  ctx.font = font(34, 700);
  ctx.fillText(value, PAD, y);
  y += 46;
  // 점선
  ctx.strokeStyle = line;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(PAD, y);
  ctx.lineTo(W - PAD, y);
  ctx.stroke();
  ctx.setLineDash([]);
  y += 14;

  // 항목
  for (const r of rowLayout) {
    if (r.total) {
      ctx.fillStyle = ink;
      ctx.fillRect(PAD, y, inner, 1);
      y += 8;
    }
    ctx.textBaseline = 'top';
    ctx.font = font(14, r.total ? 700 : 400);
    ctx.fillStyle = r.total ? ink : muted;
    ctx.fillText(r.label, PAD, y + 6);
    const lw = ctx.measureText(r.label).width;
    ctx.font = font(15, r.total ? 700 : 400);
    ctx.fillStyle = ink;
    ctx.textAlign = 'right';
    if (!r.twoLine) {
      const vw = ctx.measureText(r.value).width;
      ctx.fillText(r.value, W - PAD, y + 5);
      // 점선 리더
      ctx.strokeStyle = line;
      ctx.setLineDash([1, 3]);
      ctx.beginPath();
      ctx.moveTo(PAD + lw + 8, y + 18);
      ctx.lineTo(W - PAD - vw - 8, y + 18);
      ctx.stroke();
      ctx.setLineDash([]);
    } else {
      let vy = y + 26;
      for (const v of r.valueLines) {
        ctx.fillText(v, W - PAD, vy);
        vy += 20;
      }
    }
    ctx.textAlign = 'left';
    y += r.height - (r.total ? 8 : 0);
  }

  // 바닥: 날짜와 사이트 주소
  y += 16;
  ctx.fillStyle = line;
  ctx.fillRect(PAD, y, inner, 1);
  y += 12;
  const d = new Date();
  const p2 = (n: number) => String(n).padStart(2, '0');
  ctx.fillStyle = muted;
  ctx.font = font(12);
  ctx.fillText(`${d.getFullYear()}.${p2(d.getMonth() + 1)}.${p2(d.getDate())} 계산 (참고용 예상치)`, PAD, y);
  ctx.textAlign = 'right';
  ctx.fillStyle = ink;
  ctx.font = font(12, 700);
  ctx.fillText(`${location.host || 'barogyesanso.com'}`, W - PAD, y);
  ctx.textAlign = 'left';
  return canvas;
}

// ---------- 연결 ----------

export function mountResultActions(root: HTMLElement) {
  const calc = root.dataset.calc ?? location.pathname.replace(/\W/g, '') ?? 'calc';
  const form = document.getElementById('calc-form') as HTMLFormElement | null;
  const receipt = root.closest<HTMLElement>('.receipt') ?? document.querySelector<HTMLElement>('.receipt');
  const msg = root.querySelector<HTMLElement>('[data-msg]')!;
  const shareBtn = root.querySelector<HTMLButtonElement>('[data-act="share"]');
  const imageBtn = root.querySelector<HTMLButtonElement>('[data-act="image"]');
  const title = (document.querySelector('main h1')?.textContent ?? document.title).trim();
  const say = (t: string) => {
    msg.textContent = t;
  };

  // 공유 링크로 들어온 경우 입력값 복원
  if (form && location.hash.length > 1) {
    const state = decodeState(location.hash);
    if (Object.keys(state).length && applyState(form, state)) say('공유받은 값으로 계산했어요.');
  }

  shareBtn?.addEventListener('click', async () => {
    if (!form) return;
    const url = shareUrl(location.origin, location.pathname, collectState(form));
    const canNativeShare = typeof navigator.share === 'function' && matchMedia('(pointer: coarse)').matches;
    try {
      if (canNativeShare) {
        await navigator.share({ title, url });
        say('공유했어요.');
      } else {
        await navigator.clipboard.writeText(url);
        say('링크를 복사했어요. 카톡이나 메신저에 붙여 넣으세요.');
      }
      track('share_link', { calc });
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') return;
      // 클립보드 권한이 없으면 주소창에 표시
      history.replaceState(null, '', url);
      say('주소창의 링크를 복사해서 공유하세요.');
    }
  });

  // 오류 제보: 페이지·입력값(공유 링크)·결과를 담은 메일 작성 창을 엶 (서버로 전송하지 않음)
  root.querySelector('[data-act="report"]')?.addEventListener('click', () => {
    const email = root.dataset.email;
    if (!email) return;
    const link = form ? shareUrl(location.origin, location.pathname, collectState(form)) : location.href;
    const r = receipt ? readReceipt(receipt) : { label: '', value: '', rows: [] as Row[] };
    const lines = [
      `페이지: ${title}`,
      `입력값이 담긴 링크: ${link}`,
      '',
      '[사이트 계산 결과]',
      `${r.label}: ${r.value}`,
      ...r.rows.map((x) => `- ${x.label}: ${x.value}`),
      '',
      '[실제 금액이나 이상한 점을 적어 주세요]',
      '',
    ];
    const subject = `[바로계산소] 계산 오류 제보: ${title}`;
    location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n').slice(0, 1200))}`;
    track('report_open', { calc });
  });

  imageBtn?.addEventListener('click', async () => {
    if (!receipt) return;
    imageBtn.disabled = true;
    say('이미지를 만드는 중이에요…');
    try {
      const canvas = await drawReceipt(receipt, title);
      const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, 'image/png'));
      if (!blob) throw new Error('blob');
      const d = new Date();
      const name = `barogyesanso-${calc}-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}.png`;
      const file = new File([blob], name, { type: 'image/png' });
      const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean };
      if (matchMedia('(pointer: coarse)').matches && nav.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title });
        say('이미지를 공유했어요.');
      } else {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = name;
        document.body.append(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        say('명세서 이미지를 저장했어요.');
      }
      track('save_image', { calc });
    } catch (e) {
      if ((e as Error)?.name !== 'AbortError') say('이미지를 만들지 못했어요. 다시 시도해 주세요.');
      else say('');
    } finally {
      imageBtn.disabled = false;
    }
  });
}

// 테스트용
export { collectState, applyState };
