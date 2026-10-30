# 월급계산소 (salary-calc)

Astro 기반 정적 사이트. 연봉 실수령액·주휴수당·퇴직금·실업급여·프리랜서 3.3%·전월세 전환 계산기가 들어 있습니다.
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
  site.ts                사이트 설정 (이메일, 애드센스 ID)
  guides.ts              가이드 글 목록
  rates/2026.ts          연도별 4대보험 요율 상수 (매년 갱신)
  rates/withholding2026.ts 근로소득 간이세액표 데이터 (PDF에서 자동 생성)
  lib/netpay.ts          실수령액 계산
  lib/withholding.ts     간이세액표 조회
  lib/weeklyHolidayPay.ts 주휴수당 계산
  layouts/Base.astro     공통 레이아웃 (SEO 메타, 푸터 링크, 애드센스 코드)
  layouts/Article.astro  가이드 글 레이아웃
  lib/severance.ts       퇴직금 계산
  lib/unemployment.ts    실업급여(구직급여) 계산
  lib/freelancer.ts      프리랜서 3.3% 원천징수
  lib/rentConversion.ts  전월세 전환
  lib/history.ts         계산 결과 저장·이력·CSV (저장소 교체 가능한 순수 로직)
  lib/historyUi.ts       저장 UI (입력·결과 자동 수집, 불러오기)
  components/SaveHistory.astro 계산기에 붙이는 '내 계산 기록' 영역
  pages/                 계산기 6종, about, privacy, terms, contact
  pages/guide/           가이드 글
tests/calc.test.ts       계산 로직 테스트
```

## 배포 전 TODO

- [ ] `astro.config.mjs`의 `site`, `public/robots.txt`의 Sitemap을 실제 도메인으로 교체
- [x] 소득세: 국세청 근로소득 간이세액표(2026.2.27 개정) 조회 방식으로 구현, 원본 값과 테스트 대조 완료
- [ ] 건강보험 월 보험료 상한/하한 적용 여부 확인 (현재 미반영)
- [ ] 4대보험 요율을 국민연금공단·건강보험공단 공식 고시로 재확인
- [ ] 서치콘솔·네이버 서치어드바이저 등록, sitemap 제출
- [x] 계산기마다 설명 글(예시, FAQ) 추가 → `src/pages/guide/` 7편
- [x] `src/site.ts`의 `contactEmail` 실제 이메일로 교체

## 애드센스 신청 체크리스트

### 사이트에 이미 준비된 것
- [x] 필수 페이지: 소개(`/about`), 개인정보처리방침(`/privacy`, 쿠키·Google 광고·맞춤광고 해제 안내 포함), 이용약관·면책(`/terms`), 문의(`/contact`)
- [x] 모든 페이지 푸터에 위 페이지 링크
- [x] 가이드 글 7편 + 목록(`/guide`), 계산기 ↔ 가이드 상호 링크
- [x] sitemap, robots.txt, canonical, Article 구조화 데이터
- [x] 애드센스 코드 자리 (`src/site.ts`의 `adsenseClient`에 ID를 넣으면 모든 페이지 `<head>`에 자동 삽입)

### 직접 해야 하는 것 (순서대로)
1. **도메인 구매** (예: 가비아, Cloudflare Registrar). `*.pages.dev`, `*.vercel.app` 같은 무료 주소로는 승인이 어렵습니다.
2. **배포**: Cloudflare Pages 또는 Vercel에 이 저장소 연결 → 커스텀 도메인 연결 (HTTPS 자동)
3. `astro.config.mjs`의 `site`, `public/robots.txt`의 Sitemap 주소, `src/site.ts`의 `contactEmail` 수정
4. **구글 서치콘솔·네이버 서치어드바이저** 등록, `/sitemap-index.xml` 제출 → 페이지가 검색에 색인되는지 확인
5. **글을 더 쌓기**: 2~4주 동안 가이드 글을 꾸준히 추가 (업계에서는 15~20편을 권장하는 경우가 많음 · 공식 기준은 아님)
6. **애드센스 가입** → 사이트 추가 → 발급된 `ca-pub-...` ID를 `src/site.ts`의 `adsenseClient`에 넣고 배포 → 검토 요청
7. **승인 후**: 애드센스가 안내하는 `ads.txt` 내용을 `public/ads.txt`로 추가하고 배포

### 거절되는 흔한 이유
- "가치가 별로 없는 콘텐츠": 글 수가 적거나, 계산기만 있고 설명이 부족할 때 → 가이드 글 보강
- "사이트 다운 또는 사용할 수 없음": 도메인 연결·HTTPS 문제, 깨진 링크
- 승인 전 다른 광고 네트워크 코드가 있거나, 복사한 글이 있을 때

## 유료화 로드맵

1. **지금 (무료)**: 로그인 없이 브라우저에 저장·이력·CSV 내보내기 (`SaveHistory` 컴포넌트, 계산기 6종에 적용)
2. **수요 측정**: GA4를 붙이면 `history_save` / `history_load` / `history_export` 이벤트가 자동 전송됨 (`historyUi.ts`의 `track`)
3. **유료 전환 판단**: 저장 사용자가 충분하면 로그인 + 클라우드 저장(기기 간 동기화), 무제한 이력, PDF 내보내기 등을 유료로
   - `history.ts`의 `StorageLike`를 서버 저장소 구현으로 바꾸면 UI는 그대로 재사용 가능
   - 국내 정기결제(토스페이먼츠 등)는 사업자등록과 결제사 심사가 필요
4. 보류: 쿠팡 로켓그로스 정산 계산기 (공식 요금표 확보 후)

## 매년 갱신 체크리스트

1. `src/rates/2026.ts`를 복사해 `2027.ts` 생성 후 값 갱신
   - 국민연금 요율(2027년 10.0% 예정) · 기준소득월액 상·하한 (**매년 7월** 변경)
   - 건강보험 요율, 장기요양 요율, 고용보험 요율
   - 최저시급 (실업급여 하한액도 자동으로 바뀜)
   - 실업급여 1일 상한액 (`unemployment.dailyMax`, 고용보험법 시행령)
   - **기준금리** (`rentConversion.baseRate`): 연중 금통위 결정 때마다 갱신
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
