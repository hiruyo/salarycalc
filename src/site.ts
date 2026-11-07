/**
 * 사이트 전역 설정. 배포 전에 TODO 항목을 채우세요.
 */
export const SITE = {
  name: '바로계산소',
  /** 사이트 주소 (astro.config.mjs의 site와 같게 유지) */
  url: 'https://barogyesanso.com',
  /** 문의 받을 이메일 주소 (문의 페이지·개인정보처리방침에 표시됨) */
  contactEmail: 'site.support.kr@gmail.com',
  /**
   * TODO: 애드센스 게시자 ID (예: 'ca-pub-1234567890123456').
   * 비워두면 광고 스크립트를 넣지 않습니다. 애드센스 신청 시 사이트 확인용으로 먼저 채워야 합니다.
   */
  adsenseClient: 'ca-pub-6312236457001645',
  /**
   * 카카오 JavaScript 키 (developers.kakao.com → 내 애플리케이션 → 앱 키).
   * 비워두면 카카오톡 공유는 휴대폰 기본 공유창으로 대신합니다.
   * 카카오 앱 설정 → 플랫폼 → Web에 https://barogyesanso.com 등록 필요.
   */
  kakaoJsKey: '0d38585ecb250b1b2b3b3bcf51fbfe65',
  /** 개인정보처리방침·이용약관 시행일 */
  policyEffectiveDate: '2026-11-07',
  /** 네이버 서치어드바이저 사이트 소유 확인 (HTML 태그 content 값) */
  naverSiteVerification: '138612baa4fe510cc66fb605dfd28cab9cdb9efb',
  /** 구글 서치콘솔 HTML 태그 인증을 쓸 경우 content 값 (도메인 TXT 인증이면 비워둠) */
  googleSiteVerification: '',
  /** Google 애널리틱스(GA4) 측정 ID. 비우면 추적 코드를 넣지 않음 */
  gaMeasurementId: 'G-NJVRTTD03F',
} as const;
