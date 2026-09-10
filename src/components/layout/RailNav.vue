<template>
  <nav class="rail">
    <div class="rail-top">
      <button
        class="rail-btn"
        :class="{ active: ui.mainView === 'catalog' }"
        type="button"
        title="物料库"
        @click="ui.showCatalog()"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <path d="M3 9h18M9 21V9"/>
        </svg>
      </button>
      <button
        class="rail-btn"
        :class="{ active: ui.mainView === 'assistant' }"
        type="button"
        title="助手"
        @click="ui.showAssistant()"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H8l-4 4V5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2z"/>
        </svg>
      </button>
    </div>
  </nav>
</template>

<script setup>
import { useUiStore } from '../../stores/ui.js'

const ui = useUiStore()
</script>
