<template>
  <div class="login-page">
    <div class="login-card">
      <p class="login-kicker">电气选型资源库</p>
      <h1>本机登录</h1>
      <p class="login-lead">
        姓名会写入公司 BOM 表头的「电气设计工程师」。先存在这台电脑上，以后再接账号系统。
      </p>
      <form class="login-form" @submit.prevent="submit">
        <label class="form-field">
          <span>姓名 <i>*</i></span>
          <input v-model="name" type="text" placeholder="例如 纪祥祥" autocomplete="name">
        </label>
        <label class="form-field">
          <span>工号（选填）</span>
          <input v-model="staffId" type="text" placeholder="便于以后对账号">
        </label>
        <p v-if="error" class="form-error">{{ error }}</p>
        <button class="btn-primary login-submit" type="submit">进入物料库</button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useSessionStore } from '../../stores/session.js'

const session = useSessionStore()
const name = ref(session.user.name || '')
const staffId = ref(session.user.staffId || '')
const error = ref('')

function submit() {
  const result = session.login({ name: name.value, staffId: staffId.value })
  error.value = result.ok ? '' : result.error
}
</script>
