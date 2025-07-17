// @ts-check
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import node from '@astrojs/node';
import vercel from '@astrojs/vercel';

// Check if we're in development mode
const isDev = process.env.NODE_ENV === 'development';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: isDev ? node({
    mode: 'standalone'
  }) : vercel({
    webAnalytics: {
      enabled: true
    }
  }),
  integrations: [tailwind()],
  site: 'https://www.senti-meter.com',
  server: {
    port: 4321,
    host: 'localhost'
  }
});