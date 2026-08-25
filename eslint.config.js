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
