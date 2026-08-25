import js from '@eslint/js'
import svelte from 'eslint-plugin-svelte'
import prettier from 'eslint-config-prettier'
import globals from 'globals'
import typescript from 'typescript-eslint'
import svelteConfig from './svelte.config.js'

export default typescript.config(
  js.configs.recommended,
  typescript.configs.recommended,
  svelte.configs.recommended,
  prettier,
  svelte.configs.prettier,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      'no-console': 'error',
      // Stops a 700-line component growing back. A .svelte file carries its
      // markup and its styles too, so it gets the looser cap.
      'max-lines': ['error', { max: 300 }],
    },
  },
  {
    files: ['**/*.svelte'],
    rules: {
      'max-lines': ['error', { max: 400 }],
    },
  },
  {
    // A long spec file is a well-covered subject, not a clumped one.
    files: ['**/*.test.ts', '**/*.test.svelte.ts', 'e2e/**/*.spec.ts'],
    rules: {
      'max-lines': 'off',
    },
  },
  {
    files: ['**/*.svelte', '**/*.svelte.ts'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        extraFileExtensions: ['.svelte'],
        parser: typescript.parser,
        svelteConfig,
      },
    },
  },
  {
    ignores: ['dist/', 'test-results/', 'playwright-report/'],
  },
)
