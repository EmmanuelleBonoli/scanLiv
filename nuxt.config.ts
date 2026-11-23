// https://nuxt.com/docs/api/configuration/nuxt-config
import { fileURLToPath } from 'node:url'

export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui'
  ],

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  ui: {
    // Pas de bascule clair/sombre : l'appli tourne en réserve, sous éclairage fixe
    colorMode: false,
    eslint: {
      rules: {
        'no-unknown-classes': 'error',
        'no-conflicting-classes': 'error',
        'no-palette-colors': 'error'
      }
    }
  },

  // Alias vers les couches hors de app/ : le métier ne vit pas dans le dossier Nuxt,
  // pour qu'il reste du TypeScript pur, testable et réutilisable sans le framework.
  alias: {
    '#domain': fileURLToPath(new URL('./domain', import.meta.url)),
    '#application': fileURLToPath(new URL('./application', import.meta.url)),
    '#infrastructure': fileURLToPath(new URL('./infrastructure', import.meta.url))
  },

  compatibilityDate: '2026-06-30',

  typescript: {
    strict: true
  },

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  }
})
