<template>
  <Transition name="fade">
    <div v-if="ui.toast" class="toast">
      {{ ui.toast }}
    </div>
  </Transition>
</template>

<script setup>
import { useUiStore } from '../../stores/ui.js'
const ui = useUiStore()
</script>

<style scoped>
.toast {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  background: #333;
  color: #fff;
  padding: 10px 20px;
  border-radius: 6px;
  font-size: 13px;
  z-index: 1000;
}
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
