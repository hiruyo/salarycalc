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
    slug: 'stock-tax-guide',
    title: '2026년 주식 세금 총정리: 거래세·배당세·양도세',
    description: '국내 주식 증권거래세(코스피·코스닥 0.20%), 배당소득세 15.4%, 대주주·해외주식 양도소득세를 한 번에 정리했습니다.',
    published: '2026-11-07',
    updated: '2026-11-07',
    calculator: { href: '/stock-profit', label: '수수료·세금 뺀 수익 계산하기' },
  },
  {
    slug: 'overseas-stock-tax-guide',
    title: '해외주식 양도소득세 신고 방법: 250만원 공제·5월 신고',
    description: '미국 주식 등 해외주식 양도세 계산법(결제일 기준환율, 손익 합산, 250만원 공제 후 22%), 신고 기간과 절세 방법을 예시로 정리했습니다.',
    published: '2026-11-07',
    updated: '2026-11-07',
    calculator: { href: '/overseas-stock-tax', label: '내 해외주식 양도세 계산하기' },
  },
  {
    slug: 'employer-insurance-guide',
    title: '직원 한 명 뽑으면 얼마? 사업주 4대보험·인건비 정리',
    description: '월급 외에 회사가 내는 국민연금·건강·고용·산재보험과 퇴직금 적립을 예시로 계산하고, 알바 4대보험 기준까지 정리했습니다.',
    published: '2026-11-07',
    updated: '2026-11-07',
    calculator: { href: '/payroll', label: '우리 가게 인건비 계산하기' },
  },
  {
    slug: 'parental-leave-guide',
    title: '2026년 육아휴직 급여 총정리: 월 최대 250만원·6+6',
    description: '육아휴직 기간과 급여(1~3개월 250만원, 4~6개월 200만원, 이후 160만원 상한), 6+6 특례, 신청 방법을 정리했습니다.',
    published: '2026-11-07',
    updated: '2026-11-07',
    calculator: { href: '/salary', label: '복직 후 실수령액 계산하기' },
  },
  {
    slug: 'part-time-pay-guide',
    title: '알바 급여 계산법: 주휴수당·야간·연장·휴일 수당까지',
    description: '아르바이트 급여를 시급, 주휴수당, 야간·연장·휴일 가산수당으로 나눠 예시와 함께 계산하는 방법을 정리했습니다.',
    published: '2026-11-07',
    updated: '2026-11-07',
    calculator: { href: '/weekly-holiday-pay', label: '주휴수당 계산하기' },
  },
  {
    slug: 'raise-net-pay-guide',
    title: '연봉 5%·10% 오르면 실수령액은 얼마나 늘까',
    description: '연봉 인상률별로 월 실수령액이 실제로 얼마나 늘어나는지 표로 비교하고, 인상분보다 덜 늘어나는 이유를 설명합니다.',
    published: '2026-11-07',
    updated: '2026-11-07',
    calculator: { href: '/salary', label: '내 연봉으로 계산하기' },
  },
  {
    slug: 'year-end-tax-guide',
    title: '2026년 귀속 연말정산 총정리: 달라진 점과 환급 늘리는 법',
    description: '2027년 1월 연말정산 일정, 신용카드 자녀별 한도 상향·자녀세액공제 9세 등 달라진 점, 연말까지 환급을 늘리는 방법을 정리했습니다.',
    published: '2026-11-07',
    updated: '2026-11-07',
    calculator: { href: '/year-end-tax', label: '내 연말정산 환급액 미리 계산하기' },
  },
  {
    slug: 'annual-leave-guide',
    title: '연차 발생 기준과 계산법 총정리 (1년 미만·퇴사·알바)',
    description: '입사 1년 미만 월 연차, 1년 뒤 15일, 근속연수별 가산, 퇴사 시 연차, 단시간 근로자 연차와 연차수당을 예시로 설명합니다.',
    published: '2026-11-07',
    updated: '2026-11-07',
    calculator: { href: '/annual-leave', label: '내 연차 계산하기' },
  },
  {
    slug: 'freelancer-tax-guide',
    title: '프리랜서 3.3% 세금과 5월 종합소득세 신고 정리',
    description: '프리랜서 대금에서 떼는 3.3%의 의미, 금액별 실수령액 표, 5월 종합소득세 신고로 환급받거나 더 내는 이유를 정리했습니다.',
    published: '2026-11-07',
    updated: '2026-11-07',
    calculator: { href: '/freelancer-tax', label: '3.3% 실수령액 계산하기' },
  },
  {
    slug: 'rent-conversion-guide',
    title: '전월세 전환율 계산법과 법정 상한 (전세 vs 월세 비교)',
    description: '전세를 월세로 바꿀 때 쓰는 전환율, 법정 상한(기준금리 + 2%), 계산 예시와 전세대출 이자와 비교하는 법을 정리했습니다.',
    published: '2026-11-07',
    updated: '2026-11-07',
    calculator: { href: '/rent-conversion', label: '전월세 전환 계산하기' },
  },
  {
    slug: 'age-and-date-guide',
    title: '만 나이 계산법과 D-day·날짜 계산 쉽게 하는 법',
    description: '만 나이 통일 이후 나이 세는 법, 연 나이가 여전히 쓰이는 경우, D-day와 100일·계약 만료일 계산 방법을 정리했습니다.',
    published: '2026-11-07',
    updated: '2026-11-07',
    calculator: { href: '/date-calculator', label: '날짜 계산기 열기' },
  },
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
