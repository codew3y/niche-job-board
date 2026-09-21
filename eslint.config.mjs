import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    // Generated SQL and snapshots — not ours to lint.
    'lib/db/migrations/**',
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
