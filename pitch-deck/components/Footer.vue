<script setup lang="ts">
// useSlideContext() returns the slide-LOCAL number that ticks per slide in
// PDF export (every slide is its own render). useNav().currentPage returns
// the global router state, which in export mode is frozen on whatever slide
// was last visited — that's why the footer showed the same number across
// all pages in the previous build.
//
// $page is Ref<number>; Vue auto-unwraps refs at the top of a template
// expression, but NOT when passed into a function call like String(ref).
// We compute the padded strings explicitly with .value here so they always
// reflect the underlying number.
import { useNav, useSlideContext } from '@slidev/client'
import { computed } from 'vue'

const { total } = useNav()
const { $page } = useSlideContext()

const pageStr = computed(() => String($page.value).padStart(2, '0'))
const totalStr = computed(() => String(total.value).padStart(2, '0'))
</script>

<template>
  <footer>
    <span class="url">conduikt.com</span>
    <span class="page-num">{{ pageStr }} / {{ totalStr }}</span>
  </footer>
</template>
