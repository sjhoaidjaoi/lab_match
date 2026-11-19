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
        changeOrigin: true,
        // 后端 node --watch 热重启时会短暂关闭端口，http-proxy 默认回一个空 body 的 500，
        // 前端只能弹出 "Request failed with status code 500"。这里改成 503 + 可读 JSON，
        // 配合 request.ts 的 GET 自动重试，用户基本感知不到这次抖动。
        configure: (proxy) => {
          proxy.on('error', (_err, _req, res) => {
            const response = res as unknown as import('node:http').ServerResponse
            if (!response || typeof response.writeHead !== 'function' || response.headersSent) return
            response.writeHead(503, { 'Content-Type': 'application/json; charset=utf-8' })
            response.end(JSON.stringify({
              code: 'BACKEND_UNAVAILABLE',
              message: '后端服务正在重启，请稍后重试',
              data: null
            }))
          })
        }
      },
      '/uploads': {
        target: 'http://localhost:8080',
        changeOrigin: true
      }
    }
  }
})
