import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Custom plugin to serve YML feed
    {
      name: 'yandex-feed',
      configureServer(server) {
        server.middlewares.use('/yandex-feed.yml', async (req, res, next) => {
          console.log('🔥 YML Feed middleware triggered!', req.method, req.url);
          if (req.method === 'GET') {
            try {
              console.log('📦 Importing ymlFeedGenerator...');
              const { generateYandexFeed } = await import('./src/utils/ymlFeedGenerator');
              console.log('⚡ Generating YML content...');
              const ymlContent = await generateYandexFeed();
              console.log('✅ YML content generated successfully:', ymlContent.length, 'characters');
              
              res.setHeader('Content-Type', 'application/xml; charset=utf-8');
              res.setHeader('Cache-Control', 'public, max-age=300');
              res.setHeader('Content-Disposition', 'inline; filename="yandex-feed.yml"');
              res.end(ymlContent);
            } catch (error) {
              console.error('❌ Error serving Yandex feed:', error);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'text/plain');
              res.end('Error generating feed: ' + error.message);
            }
          } else {
            next();
          }
        });
      },
    },
  ],
  server: {
    proxy: {
      '/wp-json': {
        target: 'https://leahcation.ru/wp',
        changeOrigin: true,
        secure: true,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      },
    },
  },
}); 