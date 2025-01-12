import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  base: process.env.ELECTRON == 'true' ? './' : '/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    minify: 'terser',
    chunkSizeWarningLimit: 1000,
    terserOptions: {
      compress: {
        drop_console: false, // Keep console logs
        drop_debugger: true,
      },
      format: {
        comments: false,
      },
      mangle: {
        keep_fnames: true, // Helps with debugging
        keep_classnames: true,
      },
    },
    sourcemap: false,
    rollupOptions: {
      output: {
        format: 'es',
        generatedCode: {
          constBindings: true,
          arrowFunctions: true,
        },
        manualChunks: {
          vendor: ['vue', '@vueup/vue-quill', 'pinia', 'vue-router'],
          ffmpeg: ['fluent-ffmpeg', 'ffmpeg-static'],
        },
        external: [
          'path',
          'fs',
          'child_process',
          'stream',
          'os',
          'util',
          'events',
          'ffmpeg-static',
          'fluent-ffmpeg',
        ],
      },
    },
  },
  optimizeDeps: {
    exclude: [
      'ffmpeg-static',
      'fluent-ffmpeg',
      '@ffmpeg-installer/ffmpeg',
      '@ffprobe-installer/ffprobe',
    ],
  },
  server: {
    port: 5173,
    strictPort: true,
    headers: {
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline'",
        "connect-src 'self' https://api.openai.com https://*.openai.com",
        "img-src 'self' data:",
        "font-src 'self' data:",
      ].join('; '),
    },
  },
})
