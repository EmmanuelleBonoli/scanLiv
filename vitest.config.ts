import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// Les couches domain/ et application/ sont du TypeScript pur :
// elles se testent dans Node, sans démarrer Nuxt, donc en quelques millisecondes.
export default defineConfig({
  resolve: {
    alias: {
      '#domain': fileURLToPath(new URL('./domain', import.meta.url)),
      '#application': fileURLToPath(new URL('./application', import.meta.url)),
      '#infrastructure': fileURLToPath(new URL('./infrastructure', import.meta.url))
    }
  },
  test: {
    include: ['tests/unit/**/*.spec.ts'],
    environment: 'node',
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      include: ['domain/**', 'application/**']
    }
  }
})
