<script setup lang="ts">
import { defineProps } from 'vue';
const { fileName, id, buttonText } = defineProps({
  fileName: String,
  id: String,
  buttonText: String,
  accept: String,
});
const emit = defineEmits(['handleFileUpload']);
const componentId = `upload-input-${id}`
const handleFileUpload = (event: Event) => {
  emit('handleFileUpload', event)
}
</script>

<template>
  <input type="file" :accept="accept" class="upload-input" :id="componentId" @change="handleFileUpload" />
  <label class="upload-input-label" :for="componentId">{{ buttonText }}</label>
  <div v-if="fileName">{{ fileName }}</div>
</template>

<style scoped>
.upload-input {
  width: 0.1px;
  height: 0.1px;
  opacity: 0;
  overflow: hidden;
  position: absolute;
  z-index: -1;
}

.upload-input-label {
  cursor: pointer;
  background: #0077ff;
  padding: 10px;
  border-radius: 10px;
  color: #fff;
  font-size: 1.2em;
}
</style>
