import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { analyzeNeed, chatWithAssistant, proposeMaterials } from '../api/ai.js'
import {
  answersToPromptRows,
  CUSTOM_OPTION_ID,
  emptyAnswers,
  wizardComplete,
} from '../ai/wizard-steps.js'
import { getThread, loadAiStore, projectThreadKey, saveAiStore } from '../persist/ai-storage.js'
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
  const error = ref('')
  let hydrated = false

  const busy = computed(() => analyzing.value || proposing.value || chatting.value)
  const step = computed(() => questions.value[stepIndex.value] || null)
  const isComplete = computed(() => wizardComplete(questions.value, answers.value))
  const lastStep = computed(
    () => questions.value.length > 0 && stepIndex.value >= questions.value.length - 1
  )

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

  function setOption(stepId, optionId) {
    answers.value = {
      ...answers.value,
      [stepId]: { ...answers.value[stepId], optionId, custom: answers.value[stepId]?.custom || '' },
    }
    persist()
  }

  function setCustom(stepId, custom) {
    answers.value = {
      ...answers.value,
      [stepId]: { optionId: CUSTOM_OPTION_ID, custom },
    }
    persist()
  }

  function nextStep() {
    if (stepIndex.value < questions.value.length - 1) {
      stepIndex.value += 1
      persist()
    }
  }

  function prevStep() {
    if (stepIndex.value > 0) {
      stepIndex.value -= 1
      persist()
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
    error.value = ''
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
      selected.value = nextItems.map((i) => i.orderNo)
    }
    pushMessage({
      role: 'assistant',
      text: summary.value,
      items: nextItems,
    })
    persist()
  }

  async function analyzeFromNeed(text) {
    const data = await analyzeNeed({ need: text, planOrderNos: planNos() })
    brief.value = data.brief || ''
    questions.value = data.questions || []
    answers.value = emptyAnswers(questions.value)
    stepIndex.value = 0
    summary.value = ''
    items.value = []
    selected.value = []
    pushMessage({ role: 'assistant', text: brief.value || '根据需求再确认几项' })
    persist()
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
      error.value = e?.message || '分析失败'
    } finally {
      analyzing.value = false
    }
  }

  async function send(text) {
    const content = String(text || '').trim()
    if (content.length < 1) return
    if (busy.value) return
    const isFirst = !questions.value.length && !need.value.trim()
    if (isFirst && content.length < 4) {
      error.value = '请先写需求，例如做什么设备、电压、有没有现成 BOM'
      return
    }
    error.value = ''
    pushMessage({ role: 'user', text: content })
    persist()

    if (isFirst) {
      need.value = content
      analyzing.value = true
      try {
        await analyzeFromNeed(content)
      } catch (e) {
        error.value = e?.message || '分析失败'
      } finally {
        analyzing.value = false
      }
      return
    }

    chatting.value = true
    try {
      const history = messages.value.map((m) => ({ role: m.role, content: m.text }))
      const data = await chatWithAssistant({
        history,
        need: need.value,
        answers: answersToPromptRows(questions.value, answers.value),
        planOrderNos: planNos(),
      })
      applyItems(data, data.reply)
      if (!items.value.length && !data.reply) useUiStore().showToast('没有新的建议')
    } catch (e) {
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
      const data = await proposeMaterials({
        need: need.value,
        answers: answersToPromptRows(questions.value, answers.value),
        planOrderNos: planNos(),
      })
      applyItems(data, data.summary)
      if (!items.value.length) useUiStore().showToast(summary.value || '库中未找到合适物料')
    } catch (e) {
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
    summary,
    items,
    selected,
    messages,
    analyzing,
    proposing,
    chatting,
    busy,
    error,
    setNeed,
    setOption,
    setCustom,
    nextStep,
    prevStep,
    resetThread,
    toggleSelected,
    analyze,
    send,
    propose,
    addSelectedToPlan,
    syncProject,
  }
})
