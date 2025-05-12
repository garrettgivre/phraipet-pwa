import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Phraipets',
        short_name: 'Phraipets',
        description: 'Take care of your virtual pets!',
        theme_color: '#ffd966',
        background_color: '#f0f8ff',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/assets/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/assets/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ]
});
