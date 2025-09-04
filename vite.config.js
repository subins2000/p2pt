import { defineConfig } from "vite"

export default defineConfig({
  optimizeDeps: {
    include: [
      'get-browser-rtc',
      'streamx',
      'bittorrent-tracker',
      'queue-microtask',
      'err-code',
      'clone'
    ],
    force: true
  },
  define: {
    global: 'globalThis',
    process: {
      env: {}
    }
  }
})