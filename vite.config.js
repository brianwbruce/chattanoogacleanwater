import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main:          resolve(__dirname, 'index.html'),
        admin:         resolve(__dirname, 'admin.html'),
        learn:         resolve(__dirname, 'learn/index.html'),
        post1:         resolve(__dirname, 'learn/is-chattanooga-tap-water-safe/index.html'),
        post2:         resolve(__dirname, 'learn/hard-water-chattanooga/index.html'),
        post3:         resolve(__dirname, 'learn/chattanooga-water-quality-report-2026/index.html'),
        post4:         resolve(__dirname, 'learn/whole-home-water-filtration/index.html'),
      }
    }
  }
})
