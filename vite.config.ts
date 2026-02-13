import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const isGitHubPages = process.env.GITHUB_ACTIONS === 'true';
    
    return {
      base: isGitHubPages ? '/XCLIPPER/' : '/',
      server: {
        port: 5500,
        host: '0.0.0.0',
      },
      plugins: [react()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        rollupOptions: {
          input: {
            main: path.resolve(__dirname, 'index.html'),
            signin: path.resolve(__dirname, 'signin.html'),
            workspace: path.resolve(__dirname, 'workspace.html')
          }
        }
      }
    };
});
