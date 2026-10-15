import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins:[react()],
  base:'/location-upgrade/titan-live/',
  build:{target:'es2022'}
});
