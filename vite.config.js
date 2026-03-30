import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [
        laravel({
            input: 'resources/js/app.jsx',
            refresh: true,
        }),
        react(),
    ],
    build: {
        rollupOptions: {
            external: [
                '@tauri-apps/api/window',
                '@tauri-apps/plugin-updater',
                '@tauri-apps/plugin-process',
            ],
        },
    },
});
