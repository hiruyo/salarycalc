/**
 * 사이트 전역 설정. 배포 전에 TODO 항목을 채우세요.
 */
export const SITE = {
  name: '월급계산소',
  /** TODO: 문의 받을 이메일 주소 (문의 페이지·개인정보처리방침에 표시됨) */
  contactEmail: 'contact@example.com',
  /**
   * TODO: 애드센스 게시자 ID (예: 'ca-pub-1234567890123456').
   * 비워두면 광고 스크립트를 넣지 않습니다. 애드센스 신청 시 사이트 확인용으로 먼저 채워야 합니다.
   */
  adsenseClient: '',
  /** 개인정보처리방침·이용약관 시행일 */
  policyEffectiveDate: '2026-11-01',
} as const;
