import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Serves src/renderer/preview.html on its own, so the template chrome can be
// screenshotted and diffed against the reference scan. Not used by the app.
export default defineConfig({
  root: 'src/renderer',
  plugins: [react()],
  server: { port: 5199, strictPort: true },
})
