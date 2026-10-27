<script setup lang="ts">
defineProps<{ name: string }>()
</script>

<template>
  <article data-test="shop-card">{{ name }}</article>
</template>
