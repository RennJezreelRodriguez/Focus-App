import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/apple-touch-icon.png'],
      manifest: {
        name: 'Focus — Goal Tracker',
        short_name: 'Focus',
        description: 'Action-based goal tracker with streaks and daily checklists.',
        start_url: '/',
        display: 'standalone',
        background_color: '#F7F5F0',
        theme_color: '#F7F5F0',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Cache the app shell so it opens even with no signal.
        // Your data already lives in localStorage, so offline use
        // is fully supported once the app has loaded once.
        globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
      },
    }),
  ],
  server: {
    host: true, // lets you test on your phone via your computer's LAN IP
    port: 5173,
  },
});
