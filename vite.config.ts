
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // The third parameter '' means load ALL env vars, not just VITE_ ones.
  const env = loadEnv(mode, (process as any).cwd(), '');

  // Helper to get value from process.env (Vercel/System) OR .env file
  // We fallback to '' (empty string) to avoid 'undefined' in the client bundle
  const getEnv = (key: string) => process.env[key] || env[key] || "";

  return {
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(getEnv('API_KEY')),
      'process.env.VITE_FIREBASE_API_KEY': JSON.stringify(getEnv('VITE_FIREBASE_API_KEY')),
      'process.env.VITE_FIREBASE_AUTH_DOMAIN': JSON.stringify(getEnv('VITE_FIREBASE_AUTH_DOMAIN')),
      'process.env.VITE_FIREBASE_PROJECT_ID': JSON.stringify(getEnv('VITE_FIREBASE_PROJECT_ID')),
      'process.env.VITE_FIREBASE_STORAGE_BUCKET': JSON.stringify(getEnv('VITE_FIREBASE_STORAGE_BUCKET')),
      'process.env.VITE_FIREBASE_MESSAGING_SENDER_ID': JSON.stringify(getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID')),
      'process.env.VITE_FIREBASE_APP_ID': JSON.stringify(getEnv('VITE_FIREBASE_APP_ID')),
      'process.env.VITE_FIREBASE_MEASUREMENT_ID': JSON.stringify(getEnv('VITE_FIREBASE_MEASUREMENT_ID')),
    },
  };
});
