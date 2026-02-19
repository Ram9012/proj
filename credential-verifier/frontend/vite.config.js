import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    nodePolyfills({
      // Polyfill Buffer, process, and other Node globals needed by algosdk
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
    react(),
  ],
})
