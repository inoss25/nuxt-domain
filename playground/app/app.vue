<template>
  <NuxtLayout>
    <nav>
      <NuxtLink to="/">Accueil</NuxtLink> ·
      <NuxtLink to="/login">Connexion</NuxtLink> ·
      <NuxtLink to="/boutique">Boutique</NuxtLink> ·
      <NuxtLink to="/boutique/cart">Panier</NuxtLink> ·
      <NuxtLink to="/dashboard/stats">Statistiques</NuxtLink>
    </nav>
    <NuxtPage />
  </NuxtLayout>
</template>
