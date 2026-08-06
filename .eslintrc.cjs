const path = require('node:path');

module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: [
      path.join(__dirname, 'gateway/tsconfig.json'),
      path.join(__dirname, 'services/identity/tsconfig.json'),
      path.join(__dirname, 'services/catalog/tsconfig.json'),
      path.join(__dirname, 'services/notifications/tsconfig.json'),
      path.join(__dirname, 'frontend/tsconfig.json'),
    ],
  },
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  env: { browser: true, node: true, es2022: true },
  ignorePatterns: ['node_modules/', 'dist/'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
  },
};
