<template>
  <div v-if="ui.profileDrawerOpen" class="overlay show" @click.self="ui.closeProfileDrawer()"></div>
  <div v-if="ui.profileDrawerOpen" class="drawer show">
    <div class="drawer-head">
      <h3>我的信息</h3>
      <button class="drawer-close" type="button" @click="ui.closeProfileDrawer()">×</button>
    </div>
    <div class="drawer-body">
      <p class="form-hint">导出 BOM 时，「电气设计工程师」用这里的姓名。</p>
      <label class="form-field">
        <span>姓名 <i>*</i></span>
        <input v-model="name" type="text">
      </label>
      <label class="form-field">
        <span>工号</span>
        <input v-model="staffId" type="text">
      </label>
      <label class="form-field">
        <span>角色</span>
        <input :value="session.user.role" disabled>
      </label>
      <p v-if="error" class="form-error">{{ error }}</p>
    </div>
    <div class="drawer-foot">
      <button class="btn-ghost danger" type="button" @click="logout">退出</button>
      <button class="btn-primary" type="button" @click="save">保存</button>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useSessionStore } from '../../stores/session.js'
import { useUiStore } from '../../stores/ui.js'

const session = useSessionStore()
const ui = useUiStore()
const name = ref(session.user.name)
const staffId = ref(session.user.staffId)
const error = ref('')

watch(
  () => ui.profileDrawerOpen,
  (open) => {
    if (!open) return
    name.value = session.user.name
    staffId.value = session.user.staffId
    error.value = ''
  }
)

function save() {
  const result = session.login({ name: name.value, staffId: staffId.value, role: session.user.role })
  if (!result.ok) {
    error.value = result.error
    return
  }
  ui.closeProfileDrawer()
  ui.showToast('已保存我的信息')
}

function logout() {
  session.logout()
  ui.closeProfileDrawer()
}
</script>
