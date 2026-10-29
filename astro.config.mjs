import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// TODO: 실제 도메인으로 교체하세요 (sitemap, canonical에 사용됨)
export default defineConfig({
  site: 'https://example.com',
  integrations: [sitemap()],
});
