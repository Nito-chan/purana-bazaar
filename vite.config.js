import { fileURLToPath, URL } from 'node:url';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const useMockSetting = process.env.VITE_USE_MOCK ?? env.VITE_USE_MOCK;
  const useMock = useMockSetting !== 'false';
  const adapter = useMock ? 'src/api/mock/adapter.js' : 'src/api/supabase/adapter.js';

  return {
    resolve: {
      alias: {
        '@api-adapter': fileURLToPath(new URL(adapter, import.meta.url)),
      },
    },
    server: {
      port: 5173,
      strictPort: true,
    },
    preview: {
      port: 4173,
      strictPort: true,
    },
    build: {
      target: 'es2019',
      manifest: true,
      sourcemap: false,
    },
  };
});
