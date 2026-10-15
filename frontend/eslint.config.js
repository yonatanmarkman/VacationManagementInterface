/**
 * ESLint flat config for the Vue app: TypeScript + Vue recommended rules,
 * with formatting delegated to Prettier (configured at the repository root).
 */
import eslint from '@eslint/js';
import prettier from 'eslint-config-prettier';
import pluginVue from 'eslint-plugin-vue';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**'] },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  {
    files: ['**/*.vue'],
    languageOptions: { parserOptions: { parser: tseslint.parser } },
  },
  {
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      'vue/multi-word-component-names': 'off',
      eqeqeq: 'error',
      // TypeScript already reports undefined names (including DOM types such as KeyboardEvent).
      'no-undef': 'off',
    },
  },
  prettier,
);
