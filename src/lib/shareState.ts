/**
 * 계산기 입력값 ↔ URL 해시(#) 변환 (순수 로직, 테스트 가능)
 *
 * 입력값은 쿼리(?) 대신 해시(#)에 담습니다. 해시는 서버·Google 애널리틱스로 전송되지 않아
 * "입력값은 기기 밖으로 나가지 않는다"는 원칙을 지킬 수 있습니다.
 * 키: 입력 요소 id, 라디오 그룹은 '@그룹이름'
 */

export type FormState = Record<string, string>;

const MAX_LEN = 1500;

export function encodeState(state: FormState): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(state)) {
    if (k && v !== undefined && v !== null) p.set(k, String(v));
  }
  const s = p.toString();
  return s.length > MAX_LEN ? s.slice(0, MAX_LEN) : s;
}

export function decodeState(hash: string): FormState {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  if (!raw || raw.length > MAX_LEN * 2) return {};
  const out: FormState = {};
  try {
    for (const [k, v] of new URLSearchParams(raw)) {
      // id·라디오 이름으로 쓸 수 있는 키만 허용
      if (/^@?[A-Za-z][\w-]{0,40}$/.test(k) && v.length <= 200) out[k] = v;
    }
  } catch {
    return {};
  }
  return out;
}

export function shareUrl(origin: string, pathname: string, state: FormState): string {
  const h = encodeState(state);
  return `${origin}${pathname}${h ? `#${h}` : ''}`;
}
