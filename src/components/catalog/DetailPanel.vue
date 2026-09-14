<template>
  <div
    v-if="catalog.selectedItem"
    class="overlay show"
    @click.self="ui.selectItem(null)"
  ></div>
  <div v-if="catalog.selectedItem" class="drawer show">
    <div class="drawer-head">
      <h3>物料详情</h3>
      <button class="drawer-close" @click="ui.selectItem(null)">×</button>
    </div>
    <div class="drawer-body">
      <div class="d-img">
        <img :src="catalog.selectedItem.img || PLACEHOLDER_IMG" alt="">
      </div>
      <div class="d-title">{{ catalog.selectedItem.title }}</div>
      <div class="d-meta">{{ displayCat(catalog.selectedItem.cat) }}</div>
      <p class="d-desc" v-if="catalog.selectedItem.desc">{{ catalog.selectedItem.desc }}</p>
      <div class="d-rows">
        <div class="d-row" v-if="catalog.selectedItem.orderNo">
          <span class="k">内部号</span>
          <span class="v">{{ catalog.selectedItem.orderNo }}</span>
        </div>
        <div class="d-row">
          <span class="k">品牌</span>
          <span class="v">{{ catalog.selectedItem.brand || '待补' }}</span>
        </div>
        <div class="d-row">
          <span class="k">型号</span>
          <span class="v">{{ catalog.selectedItem.model || '待补' }}</span>
        </div>
        <div class="d-row">
          <span class="k">单位</span>
          <span class="v">{{ catalog.selectedItem.unit }}</span>
        </div>
        <div class="d-row" v-if="catalog.selectedItem.priceLabel">
          <span class="k">参考价</span>
          <span class="v">{{ catalog.selectedItem.priceLabel }}</span>
        </div>
      </div>
      <div class="tags" style="margin: 12px 0 0">
        <span v-for="tag in catalog.selectedItem.tags" :key="tag" class="tag">{{ tag }}</span>
      </div>
    </div>
    <div class="drawer-foot" style="flex-direction: column; align-items: stretch;">
      <button class="btn-ghost" @click="ui.openEditForm(catalog.selectedItem.id)">编辑资料</button>
      <button
        class="btn-primary"
        v-if="!plan.inPlan(catalog.selectedItem.id)"
        @click="plan.togglePlan(catalog.selectedItem.id)"
      >加入方案</button>
      <button
        class="btn-ghost"
        v-else
        @click="plan.togglePlan(catalog.selectedItem.id)"
      >从方案移除</button>
    </div>
  </div>
</template>

<script setup>
import { useCatalogStore } from '../../stores/catalog.js'
import { usePlanStore } from '../../stores/plan.js'
import { useUiStore } from '../../stores/ui.js'
import { displayCat, PLACEHOLDER_IMG } from '../../domain/material.js'

const catalog = useCatalogStore()
const plan = usePlanStore()
const ui = useUiStore()
</script>
