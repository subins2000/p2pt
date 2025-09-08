import { defineConfig } from "vite"
import path from "path"

export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/p2pt.js'),
      name: 'P2PT',
      fileName: 'p2pt',
      formats: ['umd', 'cjs', 'es', 'iife']
    },
    rollupOptions: {
      // Externalize deps that shouldn't be bundled
      external: []
    }
  },
  server: {
    // Firefox requires 127.0.0.1 for WebRTC connections to work
    host: '127.0.0.1'
  }
})
