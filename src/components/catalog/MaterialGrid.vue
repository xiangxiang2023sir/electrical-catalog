<template>
  <div class="grid-wrapper">
    <div class="toolbar">
      <span>{{ catalog.resultCountText }}</span>
      <span class="toolbar-right" v-html="plan.planHintHtml"></span>
    </div>
    <div class="content" @scroll="handleScroll">
      <div :class="gridClass" id="cards">
        <div v-if="catalog.filteredItems.length === 0 && !catalog.loading" class="empty">
          该分类下暂无内容
        </div>

        <article
          v-for="item in catalog.filteredItems"
          :key="item.id"
          class="card"
          :class="{ selected: ui.selectedId === item.id, 'in-plan': plan.inPlan(item.id) }"
          @click="ui.selectItem(item.id)"
        >
          <span class="mark">已加入</span>
          <div class="thumb">
            <img
              :src="thumbSrc(item)"
              alt=""
              @error="onImageError"
            >
          </div>
          <div class="cbody">
            <div class="kind">{{ displayCat(item.cat) }}</div>
            <div class="ctitle">{{ item.title }}</div>
            <div class="cmeta">
              <span v-if="item.brand">{{ item.brand }}</span>
              <span v-if="item.brand && item.model"> · </span>
              <span v-if="item.model">{{ item.model }}</span>
              <span v-if="!item.brand && !item.model">资料待补</span>
            </div>
            <p class="cdesc" v-if="item.orderNo">内部订货号 {{ item.orderNo }}</p>
            <div class="tags">
              <span v-for="(tag, idx) in item.tags.slice(0, 4)" :key="idx" class="tag">{{ tag }}</span>
              <span v-if="item.priceLabel" class="tag price">{{ item.priceLabel }}</span>
            </div>
          </div>
          <button
            class="card-add"
            :class="{ on: plan.inPlan(item.id) }"
            @click.stop="plan.togglePlan(item.id)"
          >
            {{ plan.inPlan(item.id) ? '移出方案' : '加入方案' }}
          </button>
        </article>
      </div>

      <div v-if="catalog.loading" class="loading-more">正在加载...</div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useCatalogStore } from '../../stores/catalog.js'
import { usePlanStore } from '../../stores/plan.js'
import { useUiStore } from '../../stores/ui.js'
import { displayCat, PLACEHOLDER_IMG } from '../../domain/material.js'

const catalog = useCatalogStore()
const plan = usePlanStore()
const ui = useUiStore()

const gridClass = computed(() => 'grid' + (ui.viewMode === 'list' ? ' list' : ''))

function thumbSrc(item) {
  return item.img || PLACEHOLDER_IMG
}

function onImageError(e) {
  e.target.src = PLACEHOLDER_IMG
}

let scrollTimer = null
function handleScroll(e) {
  if (scrollTimer) return
  scrollTimer = setTimeout(() => {
    scrollTimer = null
    const el = e.target
    const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 300
    if (nearBottom && catalog.hasMore && !catalog.loading) catalog.loadMore()
  }, 200)
}
</script>

<style scoped>
.grid-wrapper { flex: 1; display: flex; flex-direction: column; min-height: 0; overflow: hidden; }
.loading-more { text-align: center; padding: 16px; color: #888; font-size: 13px; }
</style>
