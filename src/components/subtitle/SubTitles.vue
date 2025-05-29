<script setup lang="ts">
import { useDraggable } from '@vueuse/core';
import { useTemplateRef, defineProps } from 'vue';
const subtitleRef = useTemplateRef<HTMLElement>('subtitleRef');
const { style } = useDraggable(subtitleRef, {
  //@ts-expect-error: x position not initially passed in, as the position of the subtitle to be
  //center via flex box
  initialValue: { y: window.innerHeight - 200 },
})

const { currentSubtitle } = defineProps(['currentSubtitle'])
</script>

<template>
  <div ref="subtitleRef" class="subtitle-container"
    :style="[style, { 'display': currentSubtitle.length > 0 ? 'block' : 'none' }]">
    <p class="subtitle" v-for="subtitle in currentSubtitle" :key="subtitle">{{ subtitle }}</p>
  </div>
</template>

<style scoped>
.subtitle-container {
  position: absolute;
  margin-top: 10px;
  font-size: 1.2em;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 5px 10px;
  display: inline-block;
  min-height: 2rem;
  cursor: grab;
}

.subtitle {
  margin-bottom: 0px;
}
</style>
