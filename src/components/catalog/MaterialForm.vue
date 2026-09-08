<template>
  <div v-if="ui.formOpen" class="overlay show" @click.self="ui.closeForm()"></div>
  <div v-if="ui.formOpen" class="drawer show drawer-form">
    <div class="drawer-head">
      <h3>{{ ui.formMode === 'edit' ? '编辑物料' : '新增物料' }}</h3>
      <button class="drawer-close" @click="ui.closeForm()">×</button>
    </div>
    <div class="drawer-body">
      <p class="form-hint">
        内部订货号必须和公司物料表一致。名称、型号、参数、图片由这边自己补，不要用网上的订货号顶替内部号。
      </p>
      <label class="form-field">
        <span>内部订货号 <i>*</i></span>
        <input v-model="form.orderNo" placeholder="例如 SIE-000136" autocomplete="off">
      </label>
      <label class="form-field">
        <span>名称 <i>*</i></span>
        <input v-model="form.title" placeholder="给人看的名称">
      </label>
      <label class="form-field">
        <span>分类</span>
        <input v-model="form.cat" list="cat-options" placeholder="选择或输入分类">
        <datalist id="cat-options">
          <option v-for="c in catalog.categoryOptions" :key="c" :value="c"></option>
        </datalist>
      </label>
      <label class="form-field">
        <span>品牌</span>
        <input v-model="form.brand" placeholder="SIE / SCHNEIDER / FESTO">
      </label>
      <label class="form-field">
        <span>厂家型号</span>
        <input v-model="form.model" placeholder="可对照厂家手册填写">
      </label>
      <label class="form-field">
        <span>规格说明</span>
        <textarea v-model="form.desc" rows="3" placeholder="如 3P 63A 36kA C型，或一句话规格"></textarea>
      </label>
      <label class="form-field">
        <span>参数标签</span>
        <input v-model="form.tags" placeholder="用逗号分隔，如 3P, 63A, 36kA">
      </label>
      <div class="form-row">
        <label class="form-field">
          <span>单位</span>
          <input v-model="form.unit" placeholder="EA">
        </label>
        <label class="form-field">
          <span>参考价</span>
          <input v-model="form.price" placeholder="可不填">
        </label>
      </div>
      <label class="form-field">
        <span>图片网址</span>
        <input v-model="form.img" placeholder="http(s) 图片链接，可空">
      </label>
      <p v-if="error" class="form-error">{{ error }}</p>
    </div>
    <div class="drawer-foot form-foot">
      <button
        v-if="ui.formMode === 'edit'"
        class="btn-ghost danger"
        type="button"
        @click="onDelete"
      >删除</button>
      <div class="form-foot-right">
        <button class="btn-ghost" type="button" @click="ui.closeForm()">取消</button>
        <button class="btn-primary" type="button" @click="onSave">保存</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, watch } from 'vue'
import { useCatalogStore } from '../../stores/catalog.js'
import { usePlanStore } from '../../stores/plan.js'
import { useUiStore } from '../../stores/ui.js'

const catalog = useCatalogStore()
const plan = usePlanStore()
const ui = useUiStore()
const error = ref('')
const form = reactive(emptyForm())

function emptyForm() {
  return {
    orderNo: '',
    title: '',
    cat: '',
    brand: '',
    model: '',
    desc: '',
    tags: '',
    unit: 'EA',
    price: '',
    img: '',
  }
}

function fillForm() {
  error.value = ''
  if (ui.formMode === 'edit' && catalog.editingItem) {
    const item = catalog.editingItem
    Object.assign(form, {
      orderNo: item.orderNo || '',
      title: item.title || '',
      cat: item.cat || '',
      brand: item.brand || '',
      model: item.model || '',
      desc: item.desc || '',
      tags: (item.tags || []).join(', '),
      unit: item.unit || 'EA',
      price: item.priceNum > 0 ? String(item.priceNum) : '',
      img: item.img || '',
    })
    return
  }
  Object.assign(form, emptyForm())
  if (catalog.cat && catalog.cat !== '全部') form.cat = catalog.cat
}

watch(
  () => [ui.formOpen, ui.formMode, ui.formId],
  () => {
    if (ui.formOpen) fillForm()
  }
)

function onSave() {
  error.value = ''
  Promise.resolve(catalog.saveMaterial({ ...form })).then((result) => {
    if (!result.ok) error.value = result.error
    else if (result.item) plan.syncItem(result.item)
  })
}

function onDelete() {
  if (!catalog.editingItem) return
  if (window.confirm(`确定删除「${catalog.editingItem.title}」？内部订货号不会从公司表里消失。`)) {
    plan.removeFromPlan(catalog.editingItem.id)
    catalog.removeMaterial(catalog.editingItem.id)
  }
}
</script>
