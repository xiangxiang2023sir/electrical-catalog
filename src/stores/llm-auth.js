import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { verifyLlmConnection } from '../api/ai.js'
import {
  clearLlmCredentials,
  loadLlmCredentials,
  LLM_DEFAULTS,
  maskApiKey,
  saveLlmCredentials,
} from '../persist/llm-credentials.js'

export const useLlmAuthStore = defineStore('llmAuth', () => {
  const cred = ref(loadLlmCredentials())
  const panelOpen = ref(false)
  const status = ref('idle') // idle | checking | ok | fail
  const statusError = ref('')

  const loggedIn = computed(() => Boolean(cred.value?.apiKey))
  const maskedKey = computed(() => (cred.value ? maskApiKey(cred.value.apiKey) : ''))
  const connected = computed(() => status.value === 'ok')
  const buttonLabel = computed(() => {
    if (status.value === 'checking') return '检测连接…'
    if (!loggedIn.value) return '大模型登录'
    if (status.value === 'ok') return `模型 ${maskedKey.value}`
    if (status.value === 'fail') return '模型未接通'
    return `模型 ${maskedKey.value}`
  })
  const buttonState = computed(() => {
    if (status.value === 'checking') return 'checking'
    if (!loggedIn.value) return 'idle'
    if (status.value === 'ok') return 'ok'
    if (status.value === 'fail') return 'fail'
    return 'idle'
  })

  function openPanel() {
    panelOpen.value = true
  }

  function closePanel() {
    panelOpen.value = false
  }

  function markOk() {
    status.value = 'ok'
    statusError.value = ''
  }

  function markFail(message) {
    status.value = 'fail'
    statusError.value = String(message || '模型未接通').trim()
  }

  function resetStatus() {
    status.value = 'idle'
    statusError.value = ''
  }

  function login({ apiKey, baseUrl, model }) {
    const result = saveLlmCredentials({ apiKey, baseUrl, model })
    if (!result.ok) return result
    cred.value = result.cred
    resetStatus()
    return { ok: true }
  }

  function logout() {
    clearLlmCredentials()
    cred.value = null
    resetStatus()
    panelOpen.value = false
  }

  function payload() {
    if (!cred.value?.apiKey) return null
    return {
      apiKey: cred.value.apiKey,
      baseUrl: cred.value.baseUrl,
      model: cred.value.model,
    }
  }

  async function verify(credentials) {
    const llm =
      credentials ||
      payload() ||
      null
    if (!llm?.apiKey) {
      resetStatus()
      return { ok: false, error: '请先填写 API Key' }
    }
    status.value = 'checking'
    statusError.value = ''
    try {
      const result = await verifyLlmConnection(llm)
      if (result.ok) {
        markOk()
        return { ok: true }
      }
      markFail(result.error)
      return result
    } catch (e) {
      markFail(e?.message || '检测失败')
      return { ok: false, error: statusError.value }
    }
  }

  return {
    cred,
    panelOpen,
    status,
    statusError,
    loggedIn,
    connected,
    maskedKey,
    buttonLabel,
    buttonState,
    defaults: LLM_DEFAULTS,
    openPanel,
    closePanel,
    login,
    logout,
    payload,
    verify,
    markOk,
    markFail,
    resetStatus,
  }
})
