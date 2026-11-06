import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// 사이트 주소 (sitemap, canonical에 사용됨). 바꾸면 src/site.ts의 url과 public/robots.txt도 함께 수정
export default defineConfig({
  site: 'https://barogyesanso.com',
  // 주소를 /salary 처럼 끝 슬래시 없이 통일 (내부 링크·canonical·sitemap 일치)
  // build.format 'file' → salary.html 생성, Cloudflare Pages가 /salary 로 제공
  trailingSlash: 'never',
  build: { format: 'file' },
  integrations: [
    sitemap({
      // 사이트맵 주소도 끝 슬래시 없이 (홈 '/'는 유지)
      serialize(item) {
        const u = new URL(item.url);
        if (u.pathname !== '/') u.pathname = u.pathname.replace(/\/+$/, '');
        item.url = u.toString();
        return item;
      },
    }),
  ],
});
