import { fileURLToPath } from 'node:url'

export default defineNuxtConfig({
  extends: ['@1001-digital/layers.evm'],
  css: [fileURLToPath(new URL('./app/assets/css/index.css', import.meta.url))],

  compatibilityDate: '2026-04-12',
})
