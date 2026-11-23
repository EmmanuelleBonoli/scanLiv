<script setup lang="ts">
useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1' }
  ],
  link: [
    { rel: 'icon', href: '/favicon.ico' }
  ],
  htmlAttrs: {
    lang: 'fr'
  }
})

useSeoMeta({
  title: 'scanLiv · Réception magasin',
  description: 'Prototype de réception de marchandises en magasin'
})
</script>

<template>
  <UApp>
    <NuxtPage />
  </UApp>
</template>
