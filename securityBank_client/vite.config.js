import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    // Escucha en todas las interfaces para que el navegador del host pueda
    // acceder al servidor de Vite que se ejecuta dentro del contenedor.
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    watch: {
      // En Docker sobre Windows los cambios de ficheros se detectan por sondeo.
      usePolling: process.env.CHOKIDAR_USEPOLLING === 'true',
    },
  },
})
