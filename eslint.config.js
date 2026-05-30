const expo = require('eslint-config-expo/flat');

module.exports = [
  ...expo,
  {
    ignores: [
      'node_modules/',
      'dist/',
      '.expo/',
      '.gemini/',
      'supabase/',
      'src/components/__tests__/__snapshots__/',
    ],
  },
  {
    files: ['**/__tests__/**/*.js', '**/*.test.js', 'src/test/jest-setup.ts'],
    languageOptions: {
      globals: {
        it: 'readonly',
        expect: 'readonly',
        jest: 'readonly',
      },
    },
  },
  {
    rules: {
      'react-hooks/set-state-in-effect': 'off',
      'react/no-unescaped-entities': 'off',
      'react-hooks/immutability': 'off',
    },
  },
];
