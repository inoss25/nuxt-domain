<script setup lang="ts">
const { count } = useCart()
</script>

<template>
  <div>
    <h1 data-test="shop">{{ $t('shop.title', { count }) }}</h1>
    <img src="/domains/shop/logo.svg" alt="logo">
    <ShopCard name="Café" />
    <p data-test="price">{{ formatPrice(4) }}</p>
  </div>
</template>
