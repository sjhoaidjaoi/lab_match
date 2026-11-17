import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  build: {
    // 首屏体积优化：把体积大且更新频率低的依赖拆成独立 chunk，
    // 业务代码变更时这些 chunk 的 hash 不变，可长期命中浏览器缓存。
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-vue': ['vue', 'vue-router', 'pinia'],
          'vendor-element': ['element-plus', '@element-plus/icons-vue'],
          'vendor-livekit': ['livekit-client'],
          'vendor-three': ['three'],
          'vendor-xlsx': ['xlsx']
        }
      }
    },
    // 会议页依赖 LiveKit + Three，单 chunk 天然偏大，放宽告警阈值到 800KB
    chunkSizeWarningLimit: 800
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true
      },
      '/uploads': {
        target: 'http://localhost:8080',
        changeOrigin: true
      }
    }
  }
})
