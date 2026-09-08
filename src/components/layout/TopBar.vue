<template>
  <div class="topbar">
    <label class="search" :class="{ focus: searchFocus }">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>
      </svg>
      <input
        type="text"
        placeholder="搜索名称 / 型号 / 内部订货号"
        v-model="keyword"
        @input="onSearch"
        @focus="searchFocus = true"
        @blur="searchFocus = false"
      >
      <button
        class="search-clear"
        :hidden="!keyword"
        @click="clearSearch"
        title="清空"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M6 6l12 12M18 6L6 18"/>
        </svg>
      </button>
    </label>

    <div class="grow"></div>

    <button class="btn-outline" :class="{ warn: !session.projectReady }" @click="ui.openProjectDrawer()">
      {{ session.projectLabel }}
    </button>

    <button class="btn-user" @click="ui.openProfileDrawer()">
      {{ session.user.name }}
    </button>

    <button class="btn-outline" @click="ui.openAddForm()">新增物料</button>

    <button class="btn-plan" @click="ui.openPlanDrawer()">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
        <path d="M5 7h14M5 12h14M5 17h9"/>
      </svg>
      方案
      <span class="badge" :class="{ zero: plan.planSize === 0 }">{{ plan.planSize }}</span>
    </button>

    <div class="seg">
      <button :class="{ active: ui.viewMode === 'grid' }" @click="ui.viewMode = 'grid'">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="8" height="8" rx="1.5"/>
          <rect x="13" y="3" width="8" height="8" rx="1.5"/>
          <rect x="3" y="13" width="8" height="8" rx="1.5"/>
          <rect x="13" y="13" width="8" height="8" rx="1.5"/>
        </svg>
        网格
      </button>
      <button :class="{ active: ui.viewMode === 'list' }" @click="ui.viewMode = 'list'">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M4 6h16M4 12h16M4 18h16"/>
        </svg>
        列表
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useCatalogStore } from '../../stores/catalog.js'
import { usePlanStore } from '../../stores/plan.js'
import { useSessionStore } from '../../stores/session.js'
import { useUiStore } from '../../stores/ui.js'

const catalog = useCatalogStore()
const plan = usePlanStore()
const session = useSessionStore()
const ui = useUiStore()
const keyword = ref('')
const searchFocus = ref(false)

let searchTimer
function onSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => catalog.search(keyword.value), 300)
}

function clearSearch() {
  keyword.value = ''
  catalog.search('')
}
</script>
