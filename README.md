# 월급계산소 (salary-calc)

Astro 기반 정적 사이트. 연봉 실수령액 계산기와 주휴수당 계산기가 들어 있습니다.
계산은 모두 브라우저에서 실행되므로 서버 비용이 없습니다.

## 시작하기

```bash
npm install
npm run dev      # http://localhost:4321
npm test         # 계산 로직 단위 테스트 (Node 22+)
npm run build    # dist/ 생성 → Cloudflare Pages / Vercel에 배포
```

## 구조

```
src/
  rates/2026.ts          연도별 4대보험 요율 상수 (매년 갱신)
  rates/withholding2026.ts 근로소득 간이세액표 데이터 (PDF에서 자동 생성)
  lib/netpay.ts          실수령액 계산
  lib/withholding.ts     간이세액표 조회
  lib/weeklyHolidayPay.ts 주휴수당 계산
  layouts/Base.astro     공통 레이아웃 (SEO 메타, 푸터 고지)
  lib/severance.ts       퇴직금 계산
  pages/                 index, salary, weekly-holiday-pay, severance-pay
tests/calc.test.ts       계산 로직 테스트
```

## 배포 전 TODO

- [ ] `astro.config.mjs`의 `site`, `public/robots.txt`의 Sitemap을 실제 도메인으로 교체
- [x] 소득세: 국세청 근로소득 간이세액표(2026.2.27 개정) 조회 방식으로 구현, 원본 값과 테스트 대조 완료
- [ ] 건강보험 월 보험료 상한/하한 적용 여부 확인 (현재 미반영)
- [ ] 4대보험 요율을 국민연금공단·건강보험공단 공식 고시로 재확인
- [ ] 서치콘솔·네이버 서치어드바이저 등록, sitemap 제출
- [ ] 계산기마다 설명 글(예시, FAQ) 추가 후 애드센스 신청

## 매년 갱신 체크리스트

1. `src/rates/2026.ts`를 복사해 `2027.ts` 생성 후 값 갱신
   - 국민연금 요율(2027년 10.0% 예정) · 기준소득월액 상·하한 (**매년 7월** 변경)
   - 건강보험 요율, 장기요양 요율, 고용보험 요율
   - 최저시급
2. 간이세액표가 개정되면 새 PDF로 데이터 재생성 (시행령 별표 2)
   ```bash
   pdftotext -layout 간이세액표.pdf table.txt
   node scripts/extract-withholding.mjs table.txt > src/rates/withholding2027.ts
   ```
   자녀 공제액(`src/lib/withholding.ts`의 `childDeduction`)과 10,000천원 초과 공식도 새 표와 비교
2-1. `import`를 새 연도 파일로 교체, 페이지의 `기준 연도` 확인
3. `npm test` 후 배포

## 국민연금 상·하한 (연 2회 구간 주의)

| 기간 | 상한 | 하한 |
|---|---|---|
| 2025.7 ~ 2026.6 | 6,370,000 | 400,000 |
| 2026.7 ~ 2027.6 | 6,590,000 | 410,000 |

현재 `2026.ts`에는 2026.7 이후 값이 들어 있습니다.
