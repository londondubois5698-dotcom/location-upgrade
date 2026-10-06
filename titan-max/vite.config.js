import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins:[react()],
  base:'/location-upgrade/',
  build:{target:'es2022'}
});
