// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'dist-native/*', 'e2e/artifacts/*', 'src/features/viewer3d/viewer-html.generated.ts'],
  },
  {
    // Server code (API keys, provider SDKs) must never be bundled into the app.
    // Only API routes (src/app/api) and the server folder itself may import it.
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/server/**', 'src/app/api/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/server', '@/server/*', '**/server/*'],
              message: 'Código de servidor não pode ser importado pelo app (risco de expor credenciais).',
            },
          ],
        },
      ],
    },
  },
]);
