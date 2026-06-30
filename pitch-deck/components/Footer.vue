<script setup lang="ts">
import { useNav } from '@slidev/client'
const { currentPage, total } = useNav()
</script>

<template>
  <footer>
    <span class="url">conduikt.com</span>
    <span class="page-num">{{ currentPage }} / {{ total }}</span>
  </footer>
</template>
