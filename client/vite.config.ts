import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Escucha en todas las interfaces (no solo localhost) para poder probar
    // desde el celular en la misma wifi durante el desarrollo.
    host: true,
  },
})
