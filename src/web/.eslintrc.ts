// ESLint configuration for enterprise-grade React TypeScript application
// Dependencies:
// eslint ^8.0.0
// @typescript-eslint/parser ^6.0.0
// @typescript-eslint/eslint-plugin ^6.0.0
// eslint-plugin-react ^7.33.0
// eslint-plugin-react-hooks ^4.6.0
// eslint-config-prettier ^9.0.0
// eslint-plugin-import ^2.28.0

import type { Linter } from 'eslint';

const config: Linter.Config = {
  // TypeScript parser configuration
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
    project: './tsconfig.json',
    tsconfigRootDir: '.',
  },

  // Extended configurations
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:import/typescript',
    'prettier', // Must be last to properly override other configs
  ],

  // Required plugins
  plugins: ['@typescript-eslint', 'react', 'react-hooks', 'import'],

  // Customized rule configurations
  rules: {
    // TypeScript-specific rules
    '@typescript-eslint/explicit-function-return-type': 'error',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/strict-boolean-expressions': 'error',
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/no-unsafe-assignment': 'error',
    '@typescript-eslint/prefer-nullish-coalescing': 'error',
    '@typescript-eslint/no-non-null-assertion': 'error',
    '@typescript-eslint/consistent-type-imports': 'error',

    // React-specific rules
    'react/react-in-jsx-scope': 'off', // Not needed in React 18+
    'react/prop-types': 'off', // TypeScript handles prop validation
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'error',
    'react/jsx-no-leaked-render': 'error',
    'react/jsx-key': ['error', {
      checkFragmentShorthand: true,
    }],

    // Import organization rules
    'import/order': ['error', {
      groups: [
        'builtin',
        'external',
        'internal',
        'parent',
        'sibling',
        'index',
        'type'
      ],
      'newlines-between': 'always',
      alphabetize: {
        order: 'asc',
        caseInsensitive: true,
      },
    }],
    'import/no-cycle': 'error',
    'import/no-self-import': 'error',
    'import/no-unresolved': 'error',

    // General code quality rules
    'no-console': 'warn',
    'eqeqeq': 'error',
    'no-unused-vars': 'off', // Handled by @typescript-eslint/no-unused-vars
    'complexity': ['error', 10],
    'max-lines': ['error', {
      max: 300,
      skipBlankLines: true,
    }],
    'max-depth': ['error', 3],
  },

  // Environment and global settings
  settings: {
    react: {
      version: 'detect',
    },
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
        project: './tsconfig.json',
      },
    },
  },

  // Environment configuration
  env: {
    browser: true,
    es2022: true,
    node: true,
  },

  // Files to ignore
  ignorePatterns: [
    'dist',
    'coverage',
    'node_modules',
    '**/*.test.ts',
    '**/*.test.tsx',
    'vite.config.ts',
  ],

  // Performance and reporting options
  cache: true,
  reportUnusedDisableDirectives: true,
};

export default config;