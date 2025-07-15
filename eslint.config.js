import astro from 'eslint-plugin-astro';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import importPlugin from 'eslint-plugin-import';
import astroParser from 'astro-eslint-parser'; // <-- import parser object

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
  {
    ignores: [
      '**/.astro/**',
      '**/.vercel/**',
      '**/dist/**',
      '**/node_modules/**',
    ],
  },
  {
    files: ['**/*.astro'],
    plugins: { astro },
    languageOptions: {
      parser: astroParser, // <-- parser object here!
      parserOptions: {
        parser: tsParser,   // for <script lang="ts"> support
        ecmaVersion: 2021,
        sourceType: 'module',
        extraFileExtensions: ['.astro'],
      },
    },
    rules: {
      ...astro.configs.recommended.rules,
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    plugins: { '@typescript-eslint': tseslint, import: importPlugin },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2021,
        sourceType: 'module',
      },
    },
    rules: {
      semi: ['error', 'always'],
      quotes: ['error', 'single'],
      '@typescript-eslint/no-unused-vars': ['warn'],
      'import/order': ['warn', { alphabetize: { order: 'asc' } }],
    },
  },
];
