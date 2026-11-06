import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// 사이트 주소 (sitemap, canonical에 사용됨). 바꾸면 src/site.ts의 url과 public/robots.txt도 함께 수정
export default defineConfig({
  site: 'https://barogyesanso.com',
  integrations: [sitemap()],
});
