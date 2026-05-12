import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  // Drop console.log + debugger in production builds (~395 logs were running in prod).
  esbuild: {
    drop: mode === 'production' ? ['console', 'debugger'] : [],
  },
  plugins: [
    react(), 
    mode === "development" && componentTagger(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'prompt',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name: 'RoomQc - Quản lý khách sạn',
        short_name: 'RoomQc',
        description: 'Hệ thống quản lý khách sạn toàn diện',
        theme_color: '#1a202c',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          { src: '/icon-72x72.png', sizes: '72x72', type: 'image/png' },
          { src: '/icon-96x96.png', sizes: '96x96', type: 'image/png' },
          { src: '/icon-128x128.png', sizes: '128x128', type: 'image/png' },
          { src: '/icon-144x144.png', sizes: '144x144', type: 'image/png' },
          { src: '/icon-152x152.png', sizes: '152x152', type: 'image/png' },
          { src: '/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: '/icon-384x384.png', sizes: '384x384', type: 'image/png' },
          { src: '/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        globIgnores: [
          '**/wasm-*.js',
          '**/*.wasm',
          '**/changelog.json',
          '**/qr-vendor-*.js',
          '**/vendor-*.js',
          '**/pdf-vendor-*.js',
          '**/excel-vendor-*.js',
          '**/mermaid-vendor-*.js',
          '**/charts-vendor-*.js',
        ],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
      },
      devOptions: {
        enabled: false,
        type: 'module',
      }
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    cssCodeSplit: true,
    target: 'es2020',
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Split heavy libs into dedicated chunks so route lazy-loading actually
        // benefits — landing/auth no longer pull in PDF/Excel/Charts/QR vendors.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;

          // Heaviest, route-specific libs — lazy-loaded only, keep isolated
          if (id.includes('/exceljs/')) return 'excel-vendor';
          if (id.includes('/jspdf') || id.includes('/html2canvas')) return 'pdf-vendor';
          if (id.includes('/mermaid/')) return 'mermaid-vendor';
          if (id.includes('/recharts/') || id.includes('/d3-')) return 'charts-vendor';
          if (
            id.includes('/html5-qrcode') ||
            id.includes('/qr-scanner-wechat') ||
            id.includes('/qr-code-styling') ||
            id.includes('/qrcode.react')
          ) return 'qr-vendor';
          if (
            id.includes('/react-markdown') ||
            id.includes('/rehype-') ||
            id.includes('/remark-') ||
            id.includes('/highlight.js') ||
            id.includes('/refractor')
          ) return 'markdown-vendor';

          // Everything else — including React, Radix, framer-motion, react-hook-form,
          // @tanstack, @supabase, lucide, i18next, date-fns, zod — goes into ONE
          // vendor chunk. Splitting React from libs that do `import * as React from 'react'`
          // (Radix, etc.) caused `Cannot read properties of undefined (reading 'forwardRef')`
          // in production due to ESM namespace interop across split chunks.
          return 'vendor';
        },
      },
    },
  },
}));
