/** 계산기 목록 (메뉴·홈·소개 페이지에서 공통 사용). 새 계산기를 만들면 여기에 추가하세요. */
export type CalcIcon = 'banknote' | 'receipt' | 'clock' | 'briefcase' | 'sun' | 'umbrella' | 'percent' | 'house' | 'calendar' | 'store' | 'trend' | 'layers' | 'globe' | 'coins' | 'bank' | 'piggy' | 'swap';

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
      { href: '/year-end-tax', name: '연말정산 환급', desc: '2026년 귀속 환급액 미리 계산', icon: 'receipt', keywords: '13월의월급 환급 연말정산계산기 신용카드공제 연금저축 irp 월세공제 의료비 교육비 자녀세액공제 미리보기 체크카드 연말 절세 시뮬레이션' },
      { href: '/freelancer-tax', name: '프리랜서 3.3%', desc: '원천징수 후 실수령액·청구 금액', icon: 'percent', keywords: '3.3 프리랜서 원천징수 사업소득 외주 세후 종합소득세' },
      { href: '/weekly-holiday-pay', name: '주휴수당', desc: '시급·근무시간으로 주휴수당과 월급', icon: 'clock', keywords: '주휴 알바 아르바이트 시급 최저시급 월급환산 최저임금' },
      { href: '/payroll', name: '인건비 (사장님용)', desc: '회사 4대보험·퇴직 적립 포함 총 인건비', icon: 'store', keywords: '인건비 사장님 사업주 4대보험 회사부담 급여대장 직원 알바 고용' },
    ],
  },
  {
    name: '주식과 투자',
    items: [
      { href: '/stock-average', name: '물타기·평단가', desc: '추가 매수 후 평균단가와 목표 평단 수량', icon: 'layers', keywords: '물타기 불타기 평단 평균단가 평단가계산기 추가매수 주식 본전' },
      { href: '/stock-profit', name: '주식 수익률', desc: '수수료·거래세 뺀 실현손익과 본전 매도가', icon: 'trend', keywords: '주식수익률 수익률계산기 실현손익 증권거래세 거래세 수수료 매도 손익분기 코스피 코스닥' },
      { href: '/overseas-stock-tax', name: '해외주식 양도세', desc: '250만원 공제 후 22%, 환율 반영', icon: 'globe', keywords: '해외주식 미국주식 양도소득세 양도세 서학개미 250만원 22% 5월신고 환율 손익통산' },
      { href: '/dividend-calculator', name: '배당금', desc: '세후 배당금과 월배당에 필요한 투자금', icon: 'coins', keywords: '배당 배당금계산기 배당소득세 15.4% 월배당 배당수익률 금융소득종합과세 미국배당' },
    ],
  },
  {
    name: '대출과 저축',
    items: [
      { href: '/loan-interest', name: '대출 이자', desc: '원리금균등·원금균등·만기일시 월 상환액과 총이자', icon: 'bank', keywords: '대출이자 대출계산기 이자계산기 원리금균등 원금균등 만기일시 주택담보대출 주담대 신용대출 전세대출 월상환액 상환스케줄 거치' },
      { href: '/savings-interest', name: '예금·적금 이자', desc: '세후 이자와 만기 수령액, 적금 실제 수익률', icon: 'piggy', keywords: '예금이자 적금이자 이자계산기 만기수령액 이자소득세 15.4% 비과세 세금우대 단리 복리 월복리 정기예금 정기적금 파킹통장' },
      { href: '/loan-refinance', name: '대출 갈아타기', desc: '중도상환수수료·비용 빼고 이득인지 계산', icon: 'swap', keywords: '대출갈아타기 대환대출 대환 중도상환수수료 중도상환 금리인하 갈아타기계산기 인지세 손익분기' },
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
