<script setup lang="ts">
// Vérifie que les types générés ne cassent pas `vue-router` (bug de la 0.3.0).
import { useRouter } from 'vue-router'

const router = useRouter()
const next: DomainPagesRouteName = 'home'

function goHome() {
  router.push({ name: next })
}
</script>

<template>
  <div>
    <h1 data-test="login">{{ $t('auth.title') }}</h1>
    <button type="button" @click="goHome">OK</button>
  </div>
</template>
