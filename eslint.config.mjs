import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
  // The Next.js app is a workspace, not the repo root.
  { settings: { next: { rootDir: 'frontend' } } },
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    // Build output and generated files, wherever a workspace puts them.
    '**/.next/**',
    '**/out/**',
    '**/build/**',
    '**/next-env.d.ts',
    '**/playwright-report/**',
    '**/test-results/**',
    // Generated SQL and snapshots — not ours to lint.
    'backend/src/db/migrations/**',
    'backend/.generated/**',
  ]),
  {
    rules: {
      // A leading underscore marks an argument a signature forces on us but the body does
      // not use — `useActionState` always passes prevState, whether the action wants it or
      // not. Without this the codebase carries permanent warnings for correct code.
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
]);

export default eslintConfig;
