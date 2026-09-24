import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        include: [
            'shared/tests/**/*.test.ts',
            'pages/tests/**/*.test.ts',
            'i18n/tests/**/*.test.ts',
        ],
    },
})
