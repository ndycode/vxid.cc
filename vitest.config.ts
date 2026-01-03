import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
    plugins: [react()],
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: ['./vitest.setup.ts'],
        include: ['**/*.test.{ts,tsx}'],
        env: {
            FEATURE_UPLOAD_ENABLED: 'true',
            FEATURE_DOWNLOAD_ENABLED: 'true',
            FEATURE_SHARE_ENABLED: 'true',
            FEATURE_CRON_ENABLED: 'true',
        },
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './'),
        },
    },
})
