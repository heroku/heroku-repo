import oclif from 'eslint-config-oclif'

export default [
  ...oclif,
  {
    ignores: [
      './dist',
      './lib',
      '**/*.js',
    ],
  },
  {
    files: [
      '**/*.ts',
    ],
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          modules: true,
        },
        ecmaVersion: 6,
        sourceType: 'module',
      },
    },
    rules: {
      '@stylistic/comma-dangle': 'warn',
      '@stylistic/indent': 'warn',
      '@stylistic/lines-between-class-members': 'warn',
      '@stylistic/object-curly-newline': 'warn',
      '@stylistic/object-curly-spacing': 'warn',
      '@typescript-eslint/ban-ts-comment': 'warn',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-require-imports': 'warn',
      '@typescript-eslint/no-unused-expressions': 'warn',
      'arrow-body-style': 'warn',
      camelcase: 'off',
      'getter-return': 'warn',
      'import/namespace': 'warn',
      'mocha/no-exports': 'warn',
      'mocha/no-mocha-arrows': 'warn',
      'n/no-deprecated-api': 'warn',
      'n/shebang': 'warn',
      'no-promise-executor-return': 'warn',
      'node/no-missing-import': 'off',
      'object-shorthand': 'warn',
      'perfectionist/sort-classes': 'warn',
      'perfectionist/sort-imports': 'warn',
      'perfectionist/sort-intersection-types': 'warn',
      'perfectionist/sort-named-imports': 'warn',
      'perfectionist/sort-objects': 'warn',
      'prefer-arrow-callback': 'warn',
      'unicorn/no-anonymous-default-export': 'warn',
      'unicorn/no-array-for-each': 'off',
      'unicorn/no-useless-undefined': 'warn',
      'unicorn/prefer-event-target': 'warn',
      'unicorn/prefer-node-protocol': 'warn',
      'unicorn/prefer-number-properties': 'warn',
      'unicorn/prefer-string-replace-all': 'warn',
    },
  },
]
