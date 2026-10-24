import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    ignores: [
      'dist/**',
      'legacy/**',
      'node_modules/**',
      'playwright-report/**',
      'test-results/**',
      'android/app/src/main/assets/**',
      'android/app/build/**',
      'android/.gradle/**',
      '.playwright-mcp/**',
    ],
  },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      'no-alert': 'error',
      'no-restricted-globals': [
        'error',
        { name: 'alert', message: 'Use toast() instead of alert().' },
        { name: 'confirm', message: 'Use a confirmation sheet instead of confirm().' },
        { name: 'prompt', message: 'Use a form instead of prompt().' },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "AssignmentExpression[left.property.name='innerHTML']",
          message:
            'Use textContent or the h() helper. Trusted SVG constants are the only exception.',
        },
        {
          selector: "CallExpression[callee.name='insertAdjacentHTML']",
          message: 'Use h() and append() instead of insertAdjacentHTML().',
        },
      ],
      'no-var': 'error',
      'prefer-const': 'error',
      eqeqeq: ['error', 'always'],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['src/ui/icons.js', 'src/api/mock/placeholder.js'],
    rules: {
      'no-restricted-syntax': 'off',
    },
  },
  {
    files: ['scripts/**/*.mjs', 'tests/**/*.js', 'playwright.config.js'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
];
