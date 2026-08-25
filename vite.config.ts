/// <reference types="vitest/config" />
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { svelteTesting } from '@testing-library/svelte/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  base: './',
  plugins: [svelte(), svelteTesting()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    // Tests that need reactive fixtures live in .test.svelte.ts so they can use $state.
    include: ['src/**/*.test.ts', 'src/**/*.test.svelte.ts'],
  },
})
