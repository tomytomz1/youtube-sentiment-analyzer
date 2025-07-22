// Modern ESLint flat config
export default [
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'module',
    },
    rules: {
      'no-unused-vars': 'warn',
      'no-console': 'off',
      'prefer-const': 'warn',
    },
  },
  {
    // Ignore patterns
    ignores: [
      'node_modules/**',
      'dist/**',
      '.astro/**',
      '.vercel/**',
      'public/**',
      'src/types/**', // TypeScript declaration files
      'src/lib/**', // TypeScript files that need special handling
      'src/pages/api/**', // API files that use Astro types
    ],
  },
];
