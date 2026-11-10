import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        // The app shipped as one 778 kB chunk, so any change to app code
        // invalidated the whole bundle in every browser cache. Splitting the
        // heavyweight vendor groups out keeps them cached across deploys.
        // React itself is not listed: Chakra and Emotion pull it in, so naming
        // it separately produced an empty 0.07 kB chunk rather than splitting
        // it out. It rides along in `ui`, which is equally cacheable.
        manualChunks: {
          ui: ['@chakra-ui/react', '@emotion/react', '@emotion/styled', 'framer-motion'],
          map: ['leaflet', 'react-leaflet'],
          realtime: ['socket.io-client', '@supabase/supabase-js', 'axios'],
        },
      },
    },
  },
  server: {
    port: 5173,
    // Dev server stays on localhost; use `npm run dev -- --host` to share on your LAN.
    host: 'localhost',
  },
});
