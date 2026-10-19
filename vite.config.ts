import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    chunkSizeWarningLimit: 260,
    // Vite 8 ships rolldown as its bundler — vendor chunks come from
    // advancedChunks. Keeps heavy deps long-cached across app updates.
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'react', test: /node_modules\/react(-dom|-router|-router-dom)?[/-]|node_modules\/scheduler\//, priority: 20 },
            { name: 'supabase', test: /node_modules\/@supabase[/-]/, priority: 10 },
          ],
        },
      },
    },
  },
})
