/** 계산기 목록 (메뉴·홈·소개 페이지에서 공통 사용). 새 계산기를 만들면 여기에 추가하세요. */
export type CalcIcon = 'banknote' | 'receipt' | 'clock' | 'briefcase' | 'sun' | 'umbrella' | 'percent' | 'house' | 'calendar' | 'store';

export interface CalcMeta {
  href: string;
  name: string;
  /** 한 줄 설명 */
  desc: string;
  icon: CalcIcon;
  /** 검색용 동의어 (띄어쓰기로 구분) */
  keywords: string;
}

export interface CalcGroup {
  name: string;
  items: CalcMeta[];
}

export const CALC_GROUPS: CalcGroup[] = [
  {
    name: '월급과 세금',
    items: [
      { href: '/salary', name: '연봉 실수령액', desc: '4대보험·소득세를 뺀 월 실수령액', icon: 'banknote', keywords: '월급 세후 연봉계산기 4대보험 소득세 실수령 급여 공제' },
      { href: '/year-end-tax', name: '연말정산 환급', desc: '2026년 귀속 환급액 미리 계산', icon: 'receipt', keywords: '13월의월급 환급 연말정산계산기 신용카드공제 연금저축 irp 월세공제 의료비 교육비 자녀세액공제' },
      { href: '/freelancer-tax', name: '프리랜서 3.3%', desc: '원천징수 후 실수령액·청구 금액', icon: 'percent', keywords: '3.3 프리랜서 원천징수 사업소득 외주 세후 종합소득세' },
      { href: '/weekly-holiday-pay', name: '주휴수당', desc: '시급·근무시간으로 주휴수당과 월급', icon: 'clock', keywords: '주휴 알바 아르바이트 시급 최저시급 월급환산 최저임금' },
      { href: '/payroll', name: '인건비 (사장님용)', desc: '회사 4대보험·퇴직 적립 포함 총 인건비', icon: 'store', keywords: '인건비 사장님 사업주 4대보험 회사부담 급여대장 직원 알바 고용' },
    ],
  },
  {
    name: '퇴사와 휴가',
    items: [
      { href: '/severance-pay', name: '퇴직금', desc: '재직기간·최근 3개월 급여로 계산', icon: 'briefcase', keywords: '퇴직금계산기 퇴사 평균임금 퇴직' },
      { href: '/unemployment-benefit', name: '실업급여', desc: '받는 금액과 기간', icon: 'umbrella', keywords: '실업급여계산기 구직급여 실업 권고사직 계약만료 고용보험' },
      { href: '/annual-leave', name: '연차', desc: '발생 연차와 미사용 연차수당', icon: 'sun', keywords: '연차계산기 연차수당 휴가 월차 연차휴가' },
    ],
  },
  {
    name: '집과 날짜',
    items: [
      { href: '/rent-conversion', name: '전월세 전환', desc: '전세↔월세 환산과 법정 상한', icon: 'house', keywords: '전월세 전세 월세 전환율 보증금 임대차' },
      { href: '/date-calculator', name: '날짜 계산', desc: 'D-day, 날짜 더하기, 만 나이', icon: 'calendar', keywords: '디데이 d-day 날짜 일수 만나이 나이 100일 기념일' },
    ],
  },
];

export const ALL_CALCS: CalcMeta[] = CALC_GROUPS.flatMap((g) => g.items);
