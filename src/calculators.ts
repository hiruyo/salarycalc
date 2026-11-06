/** 계산기 목록 (메뉴·홈·소개 페이지에서 공통 사용). 새 계산기를 만들면 여기에 추가하세요. */
export type CalcIcon = 'banknote' | 'receipt' | 'clock' | 'briefcase' | 'sun' | 'umbrella' | 'percent' | 'house' | 'calendar' | 'store';

export interface CalcMeta {
  href: string;
  name: string;
  /** 한 줄 설명 */
  desc: string;
  icon: CalcIcon;
}

export interface CalcGroup {
  name: string;
  items: CalcMeta[];
}

export const CALC_GROUPS: CalcGroup[] = [
  {
    name: '월급과 세금',
    items: [
      { href: '/salary', name: '연봉 실수령액', desc: '4대보험·소득세를 뺀 월 실수령액', icon: 'banknote' },
      { href: '/year-end-tax', name: '연말정산 환급', desc: '2026년 귀속 환급액 미리 계산', icon: 'receipt' },
      { href: '/freelancer-tax', name: '프리랜서 3.3%', desc: '원천징수 후 실수령액·청구 금액', icon: 'percent' },
      { href: '/weekly-holiday-pay', name: '주휴수당', desc: '시급·근무시간으로 주휴수당과 월급', icon: 'clock' },
      { href: '/payroll', name: '인건비 (사장님용)', desc: '회사 4대보험·퇴직 적립 포함 총 인건비', icon: 'store' },
    ],
  },
  {
    name: '퇴사와 휴가',
    items: [
      { href: '/severance-pay', name: '퇴직금', desc: '재직기간·최근 3개월 급여로 계산', icon: 'briefcase' },
      { href: '/unemployment-benefit', name: '실업급여', desc: '받는 금액과 기간', icon: 'umbrella' },
      { href: '/annual-leave', name: '연차', desc: '발생 연차와 미사용 연차수당', icon: 'sun' },
    ],
  },
  {
    name: '집과 날짜',
    items: [
      { href: '/rent-conversion', name: '전월세 전환', desc: '전세↔월세 환산과 법정 상한', icon: 'house' },
      { href: '/date-calculator', name: '날짜 계산', desc: 'D-day, 날짜 더하기, 만 나이', icon: 'calendar' },
    ],
  },
];

export const ALL_CALCS: CalcMeta[] = CALC_GROUPS.flatMap((g) => g.items);
