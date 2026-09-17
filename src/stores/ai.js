import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { analyzeNeed, chatWithAssistant, proposeMaterials } from '../api/ai.js'
import { fetchMaterialsPage } from '../api/materials.js'
import {
  answersToPromptRows,
  buildFilterQuery,
  CUSTOM_OPTION_ID,
  emptyAnswers,
  getCategoryById,
  isGreeting,
  isSelectionIntent,
  wizardComplete,
} from '../ai/wizard-steps.js'
import { getThread, loadAiStore, projectThreadKey, saveAiStore } from '../persist/ai-storage.js'
import { useLlmAuthStore } from './llm-auth.js'
import { usePlanStore } from './plan.js'
import { useSessionStore } from './session.js'
import { useUiStore } from './ui.js'

function msgId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export const useAiStore = defineStore('ai', () => {
  const threads = ref(loadAiStore().threads)
  const threadKey = ref('__none__')
  const need = ref('')
  const brief = ref('')
  const questions = ref([])
  const answers = ref({})
  const stepIndex = ref(0)
  const summary = ref('')
  const items = ref([])
  const selected = ref([])
  const messages = ref([])
  const analyzing = ref(false)
  const proposing = ref(false)
  const chatting = ref(false)
  const matchCount = ref(null)
  const matchLoading = ref(false)
  const engineMode = ref('idle')
  const error = ref('')
  let hydrated = false
  let matchTimer = null

  const busy = computed(() => analyzing.value || proposing.value || chatting.value)
  const step = computed(() => questions.value[stepIndex.value] || null)
  const isComplete = computed(() => wizardComplete(questions.value, answers.value))
  const lastStep = computed(
    () => questions.value.length > 0 && stepIndex.value >= questions.value.length - 1
  )
  const inWizard = computed(() => questions.value.length > 0 && !items.value.length)

  const engineLabel = computed(() => {
    if (analyzing.value) return '读库补问'
    if (proposing.value) {
      return engineMode.value === 'llm-propose' ? '大模型选料…' : '读库选料…'
    }
    if (chatting.value) return '大模型对话…'
    const labels = {
      'catalog-wizard': '读库补问',
      'catalog-propose': '读库选料',
      'llm-propose': '大模型选料',
      'llm-chat': '大模型对话',
    }
    return labels[engineMode.value] || ''
  })

  function setEngineFromResponse(data, phase) {
    const llmAuth = useLlmAuthStore()
    if (data?.engine === 'llm') {
      engineMode.value = phase === 'chat' ? 'llm-chat' : 'llm-propose'
      llmAuth.markOk()
      return
    }
    if (data?.engine === 'catalog') {
      engineMode.value = phase === 'analyze' ? 'catalog-wizard' : 'catalog-propose'
    }
  }

  function noteLlmFailure(e) {
    const msg = String(e?.message || '')
    if (msg.includes('模型接口失败') || msg.includes('模型未接通') || msg.includes('API Key')) {
      useLlmAuthStore().markFail(msg.replace(/^模型接口失败：?/, '模型接口失败：'))
    }
  }

  function persist() {
    threads.value = {
      ...threads.value,
      [threadKey.value]: {
        need: need.value,
        brief: brief.value,
        questions: questions.value,
        answers: answers.value,
        stepIndex: stepIndex.value,
        summary: summary.value,
        items: items.value,
        selected: selected.value,
        messages: messages.value,
      },
    }
    saveAiStore({ threads: threads.value })
  }

  function applyThread(key) {
    threadKey.value = key
    const row = getThread(threads.value, key)
    need.value = row.need
    brief.value = row.brief
    questions.value = row.questions
    answers.value = row.answers ? { ...emptyAnswers(row.questions), ...row.answers } : emptyAnswers(row.questions)
    const max = Math.max(0, questions.value.length - 1)
    stepIndex.value = Math.min(row.stepIndex, max)
    summary.value = row.summary
    items.value = row.items
    selected.value = row.selected
    messages.value = row.messages
    error.value = ''
    if (questions.value.length && !items.value.length) {
      scheduleMatchCountRefresh()
    } else {
      matchCount.value = null
    }
  }

  function syncProject() {
    const key = projectThreadKey(useSessionStore().project)
    if (key === threadKey.value && hydrated) return
    if (hydrated) persist()
    hydrated = true
    applyThread(key)
  }

  function pushMessage(row) {
    messages.value = [...messages.value, { id: msgId(), ...row }].slice(-40)
  }

  function setNeed(text) {
    need.value = text
    persist()
  }

  async function refreshMatchCount() {
    if (!questions.value.length) {
      matchCount.value = null
      return
    }
    const q = buildFilterQuery(need.value, questions.value, answers.value, {
      upToStepIndex: stepIndex.value,
    })
    if (!q) {
      matchCount.value = null
      return
    }
    matchLoading.value = true
    try {
      const data = await fetchMaterialsPage({ q, page: 1, pageSize: 1 })
      matchCount.value = data.total ?? 0
    } catch {
      matchCount.value = null
    } finally {
      matchLoading.value = false
    }
  }

  function scheduleMatchCountRefresh() {
    if (matchTimer) clearTimeout(matchTimer)
    matchTimer = setTimeout(() => {
      matchTimer = null
      refreshMatchCount()
    }, 300)
  }

  function setOption(stepId, optionId) {
    answers.value = {
      ...answers.value,
      [stepId]: { ...answers.value[stepId], optionId, custom: answers.value[stepId]?.custom || '' },
    }
    persist()
    scheduleMatchCountRefresh()
  }

  function setCustom(stepId, custom) {
    answers.value = {
      ...answers.value,
      [stepId]: { optionId: CUSTOM_OPTION_ID, custom },
    }
    persist()
    scheduleMatchCountRefresh()
  }

  function nextStep() {
    if (stepIndex.value < questions.value.length - 1) {
      stepIndex.value += 1
      persist()
      scheduleMatchCountRefresh()
    }
  }

  function prevStep() {
    if (stepIndex.value > 0) {
      stepIndex.value -= 1
      persist()
      scheduleMatchCountRefresh()
    }
  }

  function resetThread() {
    need.value = ''
    brief.value = ''
    questions.value = []
    answers.value = {}
    stepIndex.value = 0
    summary.value = ''
    items.value = []
    selected.value = []
    messages.value = []
    matchCount.value = null
    matchLoading.value = false
    engineMode.value = 'idle'
    error.value = ''
    if (matchTimer) {
      clearTimeout(matchTimer)
      matchTimer = null
    }
    persist()
  }

  function toggleSelected(orderNo) {
    const key = String(orderNo)
    if (selected.value.includes(key)) {
      selected.value = selected.value.filter((n) => n !== key)
    } else {
      selected.value = [...selected.value, key]
    }
    persist()
  }

  function planNos() {
    return usePlanStore()
      .planItems.map((i) => i.orderNo)
      .filter(Boolean)
  }

  function applyItems(data, replyText) {
    const nextItems = data.items || []
    summary.value = data.summary || data.reply || replyText || ''
    if (nextItems.length) {
      items.value = nextItems
      selected.value = nextItems.length === 1 ? nextItems.map((i) => i.orderNo) : []
      questions.value = []
      answers.value = {}
      stepIndex.value = 0
      matchCount.value = null
    }
    pushMessage({
      role: 'assistant',
      text: summary.value,
      items: nextItems,
    })
    persist()
  }

  async function analyzeFromNeed(text) {
    engineMode.value = 'catalog-wizard'
    const data = await analyzeNeed({ need: text, planOrderNos: planNos() })
    setEngineFromResponse(data, 'analyze')
    brief.value = data.brief || ''
    questions.value = data.questions || []
    if (data.resolvedKeyword) {
      need.value = data.resolvedKeyword.startsWith('选型：')
        ? data.resolvedKeyword
        : `选型：${data.resolvedKeyword}`
    }
    answers.value = emptyAnswers(questions.value)
    stepIndex.value = 0
    summary.value = ''
    items.value = []
    selected.value = []
    if (!questions.value.length) {
      need.value = ''
      pushMessage({
        role: 'assistant',
        text: brief.value || '库中没有相关物料，请换个品类或关键词',
      })
      persist()
      matchCount.value = data.matchTotal ?? 0
      return
    }
    pushMessage({ role: 'assistant', text: brief.value || '根据需求再确认几项' })
    persist()
    await refreshMatchCount()
  }

  async function analyze() {
    const text = String(need.value || '').trim()
    if (text.length < 4) {
      error.value = '请先写需求，例如做什么设备、电压、有没有现成 BOM'
      return
    }
    if (busy.value) return
    analyzing.value = true
    error.value = ''
    try {
      if (!messages.value.length) pushMessage({ role: 'user', text })
      await analyzeFromNeed(text)
    } catch (e) {
      noteLlmFailure(e)
      error.value = e?.message || '分析失败'
    } finally {
      analyzing.value = false
    }
  }

  async function proposeFromNeed(text) {
    const content = String(text || '').trim()
    if (!content) return
    need.value = content
    engineMode.value = 'llm-propose'
    const data = await proposeMaterials({
      need: need.value,
      answers: [],
      planOrderNos: planNos(),
      questions: [],
      answersMap: {},
    })
    setEngineFromResponse(data, 'propose')
    applyItems(data, data.summary)
    if (!items.value.length) useUiStore().showToast(summary.value || '库中未找到合适物料')
  }

  async function startCategory(categoryId) {
    const cat = getCategoryById(categoryId)
    if (!cat || busy.value) return
    const text = cat.need
    error.value = ''
    pushMessage({ role: 'user', text: cat.label })
    proposing.value = true
    try {
      await proposeFromNeed(text)
    } catch (e) {
      noteLlmFailure(e)
      error.value = e?.message || '选料失败'
    } finally {
      proposing.value = false
    }
  }

  function replyAssistant(text) {
    pushMessage({ role: 'assistant', text })
    persist()
  }

  async function send(text) {
    const content = String(text || '').trim()
    if (content.length < 1) return
    if (busy.value) return
    const isFirst =
      !questions.value.length && !items.value.length && (!need.value.trim() || isSelectionIntent(content))
    error.value = ''
    pushMessage({ role: 'user', text: content })
    persist()

    if (isFirst) {
      if (isGreeting(content)) {
        replyAssistant(
          '你好！我是选型助手。你可以点上方品类（如继电器），或直接说需求，我会从库里搜出可选物料。'
        )
        return
      }
      if (!isSelectionIntent(content)) {
        replyAssistant('可以说具体一点，例如「选继电器 24V」，或点上方品类按钮开始。')
        return
      }
      need.value = content
      proposing.value = true
      try {
        await proposeFromNeed(content)
      } catch (e) {
        noteLlmFailure(e)
        error.value = e?.message || '选料失败'
      } finally {
        proposing.value = false
      }
      return
    }

    if (!useLlmAuthStore().loggedIn) {
      error.value = '多轮对话需要大模型。请点右上角「大模型登录」填入 API Key。'
      useLlmAuthStore().openPanel()
      return
    }

    chatting.value = true
    engineMode.value = 'llm-chat'
    try {
      const history = messages.value.map((m) => ({ role: m.role, content: m.text }))
      const data = await chatWithAssistant({
        history,
        need: need.value,
        answers: answersToPromptRows(questions.value, answers.value),
        planOrderNos: planNos(),
      })
      setEngineFromResponse(data, 'chat')
      applyItems(data, data.reply)
      if (!items.value.length && !data.reply) useUiStore().showToast('没有新的建议')
    } catch (e) {
      noteLlmFailure(e)
      error.value = e?.message || '对话失败'
    } finally {
      chatting.value = false
    }
  }

  async function propose() {
    if (!isComplete.value) {
      error.value = '请先答完补问'
      return
    }
    if (busy.value) return
    proposing.value = true
    error.value = ''
    try {
      engineMode.value = 'llm-propose'
      const data = await proposeMaterials({
        need: need.value,
        answers: answersToPromptRows(questions.value, answers.value),
        planOrderNos: planNos(),
        questions: questions.value,
        answersMap: answers.value,
      })
      setEngineFromResponse(data, 'propose')
      applyItems(data, data.summary)
      if (!items.value.length) useUiStore().showToast(summary.value || '库中未找到合适物料')
    } catch (e) {
      noteLlmFailure(e)
      error.value = e?.message || '选料失败'
    } finally {
      proposing.value = false
    }
  }

  function addSelectedToPlan() {
    const plan = usePlanStore()
    const ui = useUiStore()
    const picked = items.value.filter((i) => selected.value.includes(i.orderNo))
    if (!picked.length) {
      ui.showToast('请先勾选要加入的料')
      return
    }
    plan.addItemsToPlan(picked)
  }

  watch(
    () => {
      const p = useSessionStore().project
      return `${p.number}::${p.workOrder}`
    },
    () => syncProject(),
    { immediate: true }
  )

  return {
    need,
    brief,
    questions,
    answers,
    stepIndex,
    step,
    lastStep,
    isComplete,
    inWizard,
    summary,
    items,
    selected,
    messages,
    analyzing,
    proposing,
    chatting,
    matchCount,
    matchLoading,
    engineMode,
    engineLabel,
    busy,
    error,
    setNeed,
    setOption,
    setCustom,
    nextStep,
    prevStep,
    resetThread,
    toggleSelected,
    startCategory,
    analyze,
    send,
    propose,
    addSelectedToPlan,
    syncProject,
  }
})
