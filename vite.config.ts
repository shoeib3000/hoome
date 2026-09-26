import './crypto-polyfill';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        allowedHosts: true,
        hmr: false,
      },
      plugins: [
        react(),
        VitePWA({
          registerType: 'autoUpdate',
          includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icon.svg'],
          manifest: {
            id: '/',
            name: 'آگهی هوشمند ملک',
            short_name: 'ملک هوشمند',
            description: 'پلتفرم هوشمند ثبت و جستجوی املاک با پنل پیشرفته مدیریت',
            theme_color: '#4F46E5',
            background_color: '#0F172A',
            display: 'standalone',
            orientation: 'portrait-primary',
            start_url: '/',
            scope: '/',
            icons: [
              {
                src: '/pwa-192x192.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'any',
              },
              {
                src: '/pwa-512x512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any',
              },
              {
                src: '/icon.svg',
                sizes: '192x192 512x512',
                type: 'image/svg+xml',
                purpose: 'any',
              },
              {
                src: '/icon.svg',
                sizes: '512x512',
                type: 'image/svg+xml',
                purpose: 'maskable',
              },
            ],
            shortcuts: [
              {
                name: 'پنل مدیریت املاک',
                short_name: 'مدیریت',
                description: 'دسترسی مستقیم و فوری به پنل مدیریت املاک',
                url: '/?page=admin',
                icons: [{ src: '/pwa-192x192.png', sizes: '192x192' }]
              },
              {
                name: 'ثبت آگهی ملک',
                short_name: 'ثبت آگهی',
                description: 'ثبت سریع آگهی ملک جدید با هوش مصنوعی',
                url: '/?page=create',
                icons: [{ src: '/pwa-192x192.png', sizes: '192x192' }]
              },
              {
                name: 'حساب کاربری',
                short_name: 'پنل من',
                description: 'مدیریت آگهی‌ها و پیام‌های کاربر',
                url: '/?page=user',
                icons: [{ src: '/pwa-192x192.png', sizes: '192x192' }]
              },
              {
                name: 'اپلیکیشن موبایل',
                short_name: 'اپلیکیشن',
                description: 'مشاهده نمای کاربری موبایل',
                url: '/?page=pwa',
                icons: [{ src: '/pwa-192x192.png', sizes: '192x192' }]
              }
            ],
          },
          workbox: {
            globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
            runtimeCaching: [
              {
                urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'google-fonts-cache',
                  expiration: {
                    maxEntries: 10,
                    maxAgeSeconds: 60 * 60 * 24 * 365,
                  },
                  cacheableResponse: {
                    statuses: [0, 200],
                  },
                },
              },
              {
                urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'gstatic-fonts-cache',
                  expiration: {
                    maxEntries: 10,
                    maxAgeSeconds: 60 * 60 * 24 * 365,
                  },
                  cacheableResponse: {
                    statuses: [0, 200],
                  },
                },
              },
            ],
          },
          devOptions: {
            enabled: false,
          },
        }),
      ],

      resolve: {
        alias: {
          '@': path.resolve(__dirname, './src'),
        }
      },
      build: {
        target: 'esnext',
        cssCodeSplit: true,
        minify: false,
        sourcemap: false,
        chunkSizeWarningLimit: 2500,
        rollupOptions: {
          output: {
            manualChunks: {
              'vendor-react': ['react', 'react-dom'],
              'vendor-icons': ['lucide-react'],
              'vendor-motion': ['motion'],
              'vendor-charts': ['recharts'],
            }
          }
        }
      }
    };
});
