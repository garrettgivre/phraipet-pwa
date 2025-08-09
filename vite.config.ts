import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt', 'logo.png'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,json}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30
              }
            }
          },
          {
            urlPattern: /\.(?:json)$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'json-cache',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 7
              }
            }
          }
        ],
        navigateFallback: 'index.html',
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024
      },
      manifest: {
        name: 'Phraipets',
        short_name: 'Phraipets',
        description: 'Take care of your virtual pets!',
        theme_color: '#ffd966',
        background_color: '#f0f8ff',
        display: 'standalone',
        start_url: '.',
        scope: '.',
        icons: [
          { src: 'assets/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'assets/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'assets/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      }
    })
  ],
  server: {
    host: true,
    port: 5173
  },
  preview: {
    host: true,
    port: 5173
  }
});
