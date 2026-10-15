/**
 * ESLint flat config: recommended JS + TypeScript rules, with formatting delegated to Prettier.
 */
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  { ignores: ['dist/**', 'coverage/**', 'node_modules/**', 'src/generated/**'] },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': 'error',
      eqeqeq: 'error',
      'no-console': 'error',
    },
  },
  {
    files: ['src/shared/logging/**', 'src/infrastructure/database/scripts/**', 'scripts/**'],
    rules: { 'no-console': 'off' },
  },
  {
    files: ['tests/**'],
    rules: { '@typescript-eslint/no-explicit-any': 'off' },
  },
  {
    files: ['scripts/**/*.mjs', '*.config.js'],
    languageOptions: { globals: { console: 'readonly', process: 'readonly', module: 'writable' } },
  },
);
