<template>
  <div v-if="ui.projectDrawerOpen" class="overlay show" @click.self="ui.closeProjectDrawer()"></div>
  <div v-if="ui.projectDrawerOpen" class="drawer show drawer-form">
    <div class="drawer-head">
      <h3>项目信息</h3>
      <button class="drawer-close" type="button" @click="ui.closeProjectDrawer()">×</button>
    </div>
    <div class="drawer-body">
      <p class="form-hint">
        对应公司电气 BOM 表头：项目名称、项目编号、工作令。版本从 A 起，每次导出后自动往后顺延。
      </p>
      <label class="form-field">
        <span>项目名称 <i>*</i></span>
        <input v-model="form.name" type="text" placeholder="例如 AGV小车负载600kg">
      </label>
      <div class="form-row">
        <label class="form-field">
          <span>项目编号 <i>*</i></span>
          <input v-model="form.number" type="text">
        </label>
        <label class="form-field">
          <span>工作令 <i>*</i></span>
          <input v-model="form.workOrder" type="text">
        </label>
      </div>
      <label class="form-field">
        <span>机械设计工程师</span>
        <input v-model="form.mechEngineer" type="text" placeholder="选填">
      </label>
      <div class="form-row">
        <label class="form-field">
          <span>本次版本</span>
          <input v-model="form.version" type="text" placeholder="A">
        </label>
        <label class="form-field">
          <span>电气设计工程师</span>
          <input :value="session.user.name" disabled>
        </label>
      </div>
      <label class="form-field">
        <span>修订说明</span>
        <textarea v-model="form.changeNote" rows="3" placeholder="选填，以后写入发放记录"></textarea>
      </label>
      <p v-if="error" class="form-error">{{ error }}</p>
    </div>
    <div class="drawer-foot">
      <span class="export-label">保存后可从方案导出</span>
      <button class="btn-primary" type="button" @click="save">保存项目</button>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, watch } from 'vue'
import { useSessionStore } from '../../stores/session.js'
import { useUiStore } from '../../stores/ui.js'

const session = useSessionStore()
const ui = useUiStore()
const form = reactive({ ...session.project })
const error = ref('')

watch(
  () => ui.projectDrawerOpen,
  (open) => {
    if (!open) return
    Object.assign(form, session.project)
    error.value = ''
  }
)

function save() {
  const result = session.updateProject(form)
  if (!result.ok) {
    error.value = result.error
    return
  }
  ui.closeProjectDrawer()
  ui.showToast('项目信息已保存')
}
</script>
