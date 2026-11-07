/**
 * 공유: 카카오톡(카카오 키가 있으면 SDK, 없으면 휴대폰 기본 공유창), 네이버, 링크 복사.
 * 입력값이 담긴 링크는 사용자가 버튼을 눌렀을 때만 만들어 공유합니다.
 */

const KAKAO_SDK = 'https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js';

interface KakaoGlobal {
  isInitialized(): boolean;
  init(key: string): void;
  Share: { sendDefault(settings: unknown): void };
}

let sdk: Promise<KakaoGlobal | null> | null = null;

export function kakaoKey(): string {
  return document.body.dataset.kakaoKey ?? '';
}

/** 휴대폰처럼 기본 공유창(navigator.share)을 쓸 수 있는지 */
export function canNativeShare(): boolean {
  return typeof navigator.share === 'function' && matchMedia('(pointer: coarse)').matches;
}

/** 카카오톡 공유 버튼을 보여줄 수 있는지 */
export function kakaoAvailable(): boolean {
  return Boolean(kakaoKey()) || canNativeShare();
}

/** 카카오 SDK 미리 불러오기 (키가 있을 때만) */
export function loadKakao(): Promise<KakaoGlobal | null> {
  const key = kakaoKey();
  if (!key) return Promise.resolve(null);
  if (sdk) return sdk;
  sdk = new Promise((resolve) => {
    const done = () => {
      const K = (window as unknown as { Kakao?: KakaoGlobal }).Kakao;
      if (!K) return resolve(null);
      try {
        if (!K.isInitialized()) K.init(key);
        resolve(K);
      } catch {
        resolve(null);
      }
    };
    const s = document.createElement('script');
    s.src = KAKAO_SDK;
    s.async = true;
    s.crossOrigin = 'anonymous';
    s.onload = done;
    s.onerror = () => resolve(null);
    document.head.appendChild(s);
  });
  return sdk;
}

export interface ShareContent {
  title: string;
  description: string;
  url: string;
  /** 카카오 메시지 버튼 문구 */
  buttonTitle?: string;
}

/** 카카오톡 공유. 성공(공유창이 열림)하면 'kakao' | 'native', 사용자가 취소하면 'cancel', 불가능하면 null */
export async function shareKakao(c: ShareContent): Promise<'kakao' | 'native' | 'cancel' | null> {
  const K = await loadKakao();
  if (K) {
    try {
      K.Share.sendDefault({
        objectType: 'feed',
        content: {
          title: c.title,
          description: c.description,
          imageUrl: new URL('/og.png', location.origin).toString(),
          imageWidth: 1200,
          imageHeight: 630,
          link: { mobileWebUrl: c.url, webUrl: c.url },
        },
        buttons: [{ title: c.buttonTitle ?? '계산해 보기', link: { mobileWebUrl: c.url, webUrl: c.url } }],
      });
      return 'kakao';
    } catch {
      /* 아래 기본 공유로 */
    }
  }
  if (canNativeShare()) {
    try {
      await navigator.share({ title: c.title, text: c.description, url: c.url });
      return 'native';
    } catch (e) {
      return (e as Error)?.name === 'AbortError' ? 'cancel' : null;
    }
  }
  return null;
}

/** 네이버 공유 (블로그·카페 등으로 보내기) 창 열기 */
export function shareNaver(url: string, title: string): void {
  const u = `https://share.naver.com/web/shareView?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;
  window.open(u, 'naver-share', 'width=520,height=640,noopener');
}

/** 링크 복사. 실패하면 false */
export async function copyLink(url: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    return false;
  }
}

export function track(event: string, params: Record<string, string>) {
  try {
    (window as unknown as { gtag?: (...a: unknown[]) => void }).gtag?.('event', event, params);
  } catch {
    /* 무시 */
  }
}
