/** 가이드 글 목록. 새 글을 추가하면 여기에 등록하세요 (목록·관련 글에 사용). */
export interface GuideMeta {
  slug: string;
  title: string;
  description: string;
  /** 작성일 (YYYY-MM-DD) */
  published: string;
  /** 수정일 (YYYY-MM-DD) */
  updated: string;
  /** 관련 계산기 경로 */
  calculator: { href: string; label: string };
}

export const GUIDES: GuideMeta[] = [
  {
    slug: 'salary-table-2026',
    title: '2026년 연봉별 실수령액 표 (2,400만원 ~ 1억원)',
    description: '2026년 4대보험 요율과 근로소득 간이세액표를 적용한 연봉별 월 실수령액 표입니다. 공제 항목별 금액을 함께 보여드려요.',
    published: '2026-10-30',
    updated: '2026-10-30',
    calculator: { href: '/salary', label: '내 연봉으로 실수령액 계산하기' },
  },
  {
    slug: 'social-insurance-2026',
    title: '2026년 4대보험 요율 정리와 계산 방법',
    description: '2026년 국민연금 9.5%, 건강보험 7.19% 등 4대보험 요율과 근로자 부담분, 월급별 공제액 계산법을 정리했습니다.',
    published: '2026-10-30',
    updated: '2026-10-30',
    calculator: { href: '/salary', label: '실수령액 계산기로 공제액 확인하기' },
  },
  {
    slug: 'withholding-tax',
    title: '근로소득 간이세액표로 월급 소득세 계산하는 법',
    description: '월급에서 빠지는 소득세는 간이세액표로 정해집니다. 공제대상가족 수, 자녀 공제, 원천징수 비율 선택까지 설명합니다.',
    published: '2026-10-30',
    updated: '2026-10-30',
    calculator: { href: '/salary', label: '실수령액 계산기에서 소득세 확인하기' },
  },
  {
    slug: 'minimum-wage-2026',
    title: '2026년 최저임금 월급 환산액과 실수령액',
    description: '2026년 최저시급 10,320원의 월급 환산액(209시간 기준)과 4대보험·세금을 뺀 실수령액을 계산했습니다.',
    published: '2026-10-30',
    updated: '2026-10-30',
    calculator: { href: '/weekly-holiday-pay', label: '내 근무시간으로 월급 계산하기' },
  },
  {
    slug: 'weekly-holiday-pay-guide',
    title: '주휴수당 지급 조건과 계산 방법 (주 15시간 기준)',
    description: '주휴수당을 받을 수 있는 조건과 계산 공식, 주 근로시간별 주휴수당 금액표를 정리했습니다.',
    published: '2026-10-30',
    updated: '2026-10-30',
    calculator: { href: '/weekly-holiday-pay', label: '주휴수당 계산하기' },
  },
  {
    slug: 'severance-pay-guide',
    title: '퇴직금 지급 조건과 계산 방법 총정리',
    description: '퇴직금을 받을 수 있는 조건, 평균임금과 계산 공식, 지급 기한, 퇴직연금과의 차이를 예시와 함께 설명합니다.',
    published: '2026-10-30',
    updated: '2026-10-30',
    calculator: { href: '/severance-pay', label: '내 퇴직금 계산하기' },
  },
  {
    slug: 'unemployment-benefit-guide',
    title: '2026년 실업급여 조건과 금액, 받는 기간',
    description: '2026년 실업급여(구직급여) 수급 조건, 1일 상한액 68,100원·하한액, 나이와 가입기간별 받는 기간을 정리했습니다.',
    published: '2026-10-30',
    updated: '2026-10-30',
    calculator: { href: '/unemployment-benefit', label: '내 실업급여 계산하기' },
  },
];

export function getGuide(slug: string): GuideMeta {
  const g = GUIDES.find((x) => x.slug === slug);
  if (!g) throw new Error(`Unknown guide: ${slug}`);
  return g;
}
