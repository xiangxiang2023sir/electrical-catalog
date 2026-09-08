<template>
  <aside class="sidebar">
    <div class="side-label">分类</div>
    <div id="cats">
      <button
        class="side-item"
        :class="{ active: catalog.cat === '全部' }"
        @click="onAll"
      >
        <span class="side-name">全部</span>
        <span class="count">{{ categoryCount('全部') }}</span>
      </button>

      <div v-for="group in groups" :key="group.name" class="side-group">
        <button
          class="side-item"
          :class="{ active: catalog.cat === group.name }"
          @click="onMajor(group.name)"
        >
          <span class="side-caret" :class="{ open: isOpen(group.name) }">▸</span>
          <span class="side-name">{{ group.name }}</span>
          <span class="count">{{ categoryCount(group.name) }}</span>
        </button>
        <button
          v-for="child in group.children"
          v-show="isOpen(group.name)"
          :key="child.name"
          class="side-item child"
          :class="{ active: catalog.cat === child.name }"
          @click="catalog.filterByCategory(child.name)"
        >
          <span class="side-name">{{ child.label }}</span>
          <span class="count">{{ categoryCount(child.name) }}</span>
        </button>
      </div>
    </div>
  </aside>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useCatalogStore } from '../../stores/catalog.js'

const MAJORS = ['电气', '机械', '未定义']
const catalog = useCatalogStore()
const openMajors = ref([])

const groups = computed(() =>
  MAJORS.map((major) => ({
    name: major,
    children: catalog.categories
      .filter((name) => name.startsWith(`${major} / `))
      .map((name) => ({
        name,
        label: name.slice(major.length + 3),
      })),
  })).filter((group) => categoryCount(group.name) > 0 || group.children.length)
)

function categoryCount(category) {
  if (category === '全部') return catalog.categoryCounts['全部'] ?? catalog.totalCount
  return catalog.categoryCounts[category] || 0
}

function isOpen(major) {
  return openMajors.value.includes(major)
}

function parentOf(category) {
  if (!category || category === '全部') return ''
  if (MAJORS.includes(category)) return category
  const cut = category.indexOf(' / ')
  return cut > 0 ? category.slice(0, cut) : ''
}

function onAll() {
  openMajors.value = []
  catalog.filterByCategory('全部')
}

function onMajor(major) {
  if (isOpen(major)) {
    openMajors.value = openMajors.value.filter((name) => name !== major)
  } else {
    openMajors.value = [...openMajors.value, major]
  }
  catalog.filterByCategory(major)
}

watch(
  () => catalog.cat,
  (category) => {
    const parent = parentOf(category)
    if (parent && !isOpen(parent)) openMajors.value = [...openMajors.value, parent]
  },
  { immediate: true }
)
</script>
