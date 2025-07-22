// Update ESLint config to avoid deprecated FlatConfig usage
// Use recommended config for latest ESLint
module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:astro/recommended',
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'astro'],
  rules: {
    // Add or override rules here
  },
};
