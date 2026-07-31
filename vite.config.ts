import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Each group is cached independently — only re-downloaded when that group changes.
          if (id.includes('gsap')) return 'gsap'
          if (id.includes('@supabase')) return 'supabase'
          if (id.includes('posthog')) return 'posthog'
          if (id.includes('react-router') || id.includes('react-dom') || id.includes('/react/')) return 'react'
          if (id.includes('zustand')) return 'zustand'
          if (id.includes('node_modules')) return 'vendor'
        },
      },
    },
  },
})
