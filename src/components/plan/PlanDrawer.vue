<template>
  <div v-if="ui.planDrawerOpen" class="overlay show" @click.self="ui.closePlanDrawer()"></div>
  <div v-if="ui.planDrawerOpen" class="drawer show">
    <div class="drawer-head">
      <h3>我的方案</h3>
      <button class="drawer-close" @click="ui.closePlanDrawer()">×</button>
    </div>
    <div class="drawer-summary" v-if="plan.planSize > 0">
      <span>种类 <b>{{ plan.planSize }}</b></span>
      <span>数量 <b>{{ plan.planTotalQty }}</b></span>
    </div>
    <div class="drawer-project">
      <div>
        <div class="drawer-project-kicker">导出表头</div>
        <div>{{ session.projectReady ? `${session.project.name} · 版本 ${session.project.version}` : '还没填项目信息' }}</div>
        <div class="drawer-project-sub">电气设计工程师：{{ session.user.name }}</div>
      </div>
      <button class="btn-ghost" type="button" @click="ui.openProjectDrawer()">{{ session.projectReady ? '改项目' : '填写项目' }}</button>
    </div>
    <div class="drawer-import">
      <input
        ref="fileInput"
        class="hidden-file"
        type="file"
        accept=".xlsx,.xlsm,.csv"
        @change="onPickFile"
      >
      <button class="btn-ghost" type="button" :disabled="plan.importing" @click="pickFile">
        {{ plan.importing ? '正在导入…' : '导入已有 BOM' }}
      </button>
      <span class="export-label">公司模板 xlsx，或本软件导出的 CSV</span>
    </div>
    <div v-if="plan.lastImport" class="import-miss" :class="{ ok: plan.lastImport.total > 0 }">
      <template v-if="plan.lastImport.total === 0">
        没读到物料行。请用公司电气 BOM 的 xlsx（工作表 Equipment Innovation Center BOM，第 6 行起填订货号）。
      </template>
      <template v-else>
        上次导入 {{ plan.lastImport.fileName }}：{{ plan.lastImport.total }} 种，库内 {{ plan.lastImport.matched }}
        <span v-if="plan.lastImport.missing.length">，库外 {{ plan.lastImport.missing.length }} 条已留在方案里</span>
      </template>
    </div>
    <div class="drawer-body">
      <div v-if="plan.importing" class="plan-empty">正在读 BOM…</div>
      <div v-else-if="plan.planItems.length === 0" class="plan-empty">
        还没有选料。可先导入已有 BOM，或在卡片上点「加入方案」。
      </div>
      <div v-else>
        <div v-for="item in plan.planItems" :key="item.id" class="plan-item">
          <div class="pi-thumb">
            <img v-if="item.img" :src="item.img" alt="">
          </div>
          <div class="pi-body">
            <div class="pi-cat">
              {{ displayCat(item.cat) }}
              <span v-if="item.fromBom" class="pi-ext">库外</span>
            </div>
            <div class="pi-title">{{ item.title }}</div>
            <div class="pi-sku">{{ item.orderNo }} · {{ item.model || '型号待补' }}</div>
            <div class="qty">
              <button type="button" @click="plan.setPlanQty(item.id, item.qty - 1)">−</button>
              <input
                :value="item.qty"
                type="number"
                min="1"
                @change="onQty(item.id, $event)"
              >
              <button type="button" @click="plan.setPlanQty(item.id, item.qty + 1)">+</button>
              <span class="qty-unit">{{ item.unit }}</span>
            </div>
          </div>
          <button class="pi-remove" title="移除" @click="plan.togglePlan(item.id)">×</button>
        </div>
      </div>
    </div>
    <div class="drawer-foot" v-if="plan.planItems.length > 0">
      <div class="export-group">
        <div class="export-label">可在目录里继续加料，再按公司模板导出新版本</div>
        <div class="export-btns">
          <button class="btn-primary" type="button" :disabled="exporting" @click="onExportBom">
            {{ exporting ? '正在导出…' : `导出电气 BOM ${session.project.version || 'A'}` }}
          </button>
          <button class="btn-ghost" type="button" @click="plan.exportPlan('csv')">CSV</button>
          <button class="btn-ghost danger" type="button" @click="plan.clearPlan()">清空</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { usePlanStore } from '../../stores/plan.js'
import { useSessionStore } from '../../stores/session.js'
import { useUiStore } from '../../stores/ui.js'
import { displayCat } from '../../domain/material.js'

const plan = usePlanStore()
const session = useSessionStore()
const ui = useUiStore()
const exporting = ref(false)
const fileInput = ref(null)

function onQty(id, e) {
  plan.setPlanQty(id, e.target.value)
}

function pickFile() {
  fileInput.value?.click()
}

async function onPickFile(e) {
  const file = e.target.files?.[0]
  e.target.value = ''
  if (file) await plan.importBom(file)
}

async function onExportBom() {
  if (exporting.value) return
  exporting.value = true
  try {
    await plan.exportCompanyBom()
  } finally {
    exporting.value = false
  }
}
</script>
