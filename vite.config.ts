import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'; // Add this import

export default defineConfig({
  plugins: [react()],
  server: {
    port: 4000,
    host: true,
    watch: {
      usePolling: true
    }
  },
  resolve: {
    // TypeScript sources must win over the stale compiled `.js` artifacts that
    // sit next to them in src/ (one per .tsx). Vite's default order puts '.js'
    // ahead of '.tsx', so an extensionless import like
    // `./components/Admin/Tables/attendance` resolved to the outdated
    // attendance.js and every edit to attendance.tsx was silently ignored.
    // Listing the TS extensions first fixes that; '.js' stays in the list so
    // the genuinely-JS-only modules still resolve.
    extensions: ['.tsx', '.ts', '.jsx', '.mjs', '.js', '.mts', '.json'],
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name].js`,
        chunkFileNames: `assets/[name].js`,
        assetFileNames: `assets/[name].[ext]`
      }
    }
  },
})

