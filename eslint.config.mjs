import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      '.expo/**',
      'supabase/functions/**',
      'package-lock.json',
      'babel.config.js',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}', 'App.tsx'],
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      'no-unreachable': 'error',
      'no-undef': 'off',
      'no-empty': 'off',
      'prefer-const': 'off',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      'react-hooks/rules-of-hooks': 'warn',
      'react-hooks/exhaustive-deps': 'warn',
    },
  }
);
