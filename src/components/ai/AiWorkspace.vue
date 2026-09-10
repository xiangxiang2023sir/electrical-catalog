<template>
  <section class="ai-page">
    <header class="ai-head">
      <div>
        <div class="ai-kicker">选型助手</div>
        <h2>{{ session.projectReady ? session.project.name : '先填项目，对话会跟项目走' }}</h2>
      </div>
      <button class="btn-ghost" type="button" @click="ai.resetThread()">新对话</button>
    </header>

    <div ref="threadEl" class="ai-thread">
      <div v-if="!ai.messages.length" class="ai-empty">
        先说需求，例如 600kg AGV、24V、西门子、要急停。助手会分析后再用按钮补问，你也可以继续打字对话。
      </div>

      <div
        v-for="msg in ai.messages"
        :key="msg.id"
        class="ai-bubble"
        :class="msg.role"
      >
        <div class="ai-meta">{{ msg.role === 'user' ? '你' : '助手' }}</div>
        <p class="ai-text">{{ msg.text }}</p>
        <div v-if="msg.items?.length" class="ai-rec">
          <label v-for="item in msg.items" :key="item.orderNo" class="ai-item">
            <input
              type="checkbox"
              :checked="ai.selected.includes(item.orderNo)"
              @change="ai.toggleSelected(item.orderNo)"
            >
            <div>
              <div class="pi-title">{{ item.title }}</div>
              <div class="pi-sku">{{ item.orderNo }} · 建议 {{ item.qty }} {{ item.unit || 'EA' }}</div>
              <div class="ai-reason">{{ item.reason }}</div>
            </div>
          </label>
          <button class="btn-primary" type="button" @click="onAdd">加入方案</button>
        </div>
      </div>

      <div v-if="ai.step" class="ai-msg">
        <div class="ai-meta">补问 {{ ai.stepIndex + 1 }} / {{ ai.questions.length }}</div>
        <p class="ai-q">{{ ai.step.title }}</p>
        <div class="ai-opts">
          <button
            v-for="opt in ai.step.options"
            :key="opt.id"
            class="ai-chip"
            :class="{ on: current.optionId === opt.id }"
            type="button"
            @click="pick(opt.id, opt.label)"
          >
            {{ opt.label }}
          </button>
          <button
            class="ai-chip"
            :class="{ on: current.optionId === 'custom' }"
            type="button"
            @click="pick('custom', '')"
          >
            其他
          </button>
        </div>
        <label v-if="current.optionId === 'custom'" class="form-field">
          <span>请写具体内容</span>
          <input :value="current.custom" type="text" maxlength="80" placeholder="自己填" @input="onCustom">
        </label>
        <div class="ai-nav">
          <button class="btn-ghost" type="button" :disabled="ai.stepIndex === 0" @click="ai.prevStep()">上一步</button>
          <button v-if="!ai.lastStep" class="btn-primary" type="button" :disabled="!canNext" @click="ai.nextStep()">下一步</button>
          <button
            v-else
            class="btn-primary"
            type="button"
            :disabled="!ai.isComplete || ai.busy"
            @click="ai.propose()"
          >
            {{ ai.proposing ? '正在选料…' : '根据这些选料' }}
          </button>
        </div>
      </div>
      <p v-if="ai.error" class="form-error">{{ ai.error }}</p>
    </div>

    <form class="ai-composer" @submit.prevent="onSend">
      <textarea
        v-model="draft"
        rows="2"
        maxlength="400"
        :placeholder="ai.messages.length ? '继续说，例如再补 24V 电源' : '输入需求，回车发送'"
        :disabled="ai.busy"
        @keydown="onKey"
      ></textarea>
      <button class="btn-primary" type="submit" :disabled="ai.busy || !draft.trim()">
        {{ sendLabel }}
      </button>
    </form>
  </section>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { CUSTOM_OPTION_ID } from '../../ai/wizard-steps.js'
import { useAiStore } from '../../stores/ai.js'
import { useSessionStore } from '../../stores/session.js'
import { useUiStore } from '../../stores/ui.js'

const ai = useAiStore()
const session = useSessionStore()
const ui = useUiStore()
const draft = ref('')
const threadEl = ref(null)

const current = computed(() => {
  if (!ai.step) return { optionId: '', custom: '' }
  return ai.answers[ai.step.id] || { optionId: '', custom: '' }
})

const canNext = computed(() => {
  const row = current.value
  if (row.optionId === CUSTOM_OPTION_ID) return Boolean(String(row.custom || '').trim())
  return Boolean(row.optionId)
})

const sendLabel = computed(() => {
  if (ai.analyzing) return '分析中…'
  if (ai.chatting) return '回复中…'
  if (ai.proposing) return '选料中…'
  return '发送'
})

watch(
  () => ai.messages.length,
  async () => {
    await nextTick()
    const el = threadEl.value
    if (el) el.scrollTop = el.scrollHeight
  }
)

function pick(optionId) {
  if (!ai.step) return
  ai.setOption(ai.step.id, optionId)
}

function onCustom(e) {
  if (!ai.step) return
  ai.setCustom(ai.step.id, e.target.value)
}

function onKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    onSend()
  }
}

async function onSend() {
  const text = draft.value.trim()
  if (!text || ai.busy) return
  draft.value = ''
  await ai.send(text)
}

function onAdd() {
  ai.addSelectedToPlan()
  ui.openPlanDrawer()
}
</script>

<style scoped>
.ai-page {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: var(--bg);
}
.ai-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 28px 16px;
  border-bottom: 1px solid var(--line);
  background: var(--panel);
}
.ai-kicker { font-size: 12px; color: var(--accent); font-weight: 600; }
.ai-head h2 { font-size: 18px; margin-top: 2px; font-weight: 700; }
.ai-thread {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 20px 28px 12px;
  max-width: 720px;
  width: 100%;
  margin: 0 auto;
}
.ai-empty {
  color: var(--txt3);
  font-size: 13.5px;
  line-height: 1.7;
  padding: 40px 8px;
  text-align: center;
}
.ai-bubble {
  max-width: 92%;
  border-radius: 16px;
  padding: 12px 14px;
  margin-bottom: 12px;
  border: 1px solid var(--line);
}
.ai-bubble.user {
  margin-left: auto;
  background: var(--accent-weak);
  border-color: #f3d0bf;
}
.ai-bubble.assistant {
  background: var(--panel);
}
.ai-meta { font-size: 11px; color: var(--txt3); margin-bottom: 6px; }
.ai-text { font-size: 14px; line-height: 1.55; white-space: pre-wrap; }
.ai-msg {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 16px;
  padding: 18px 20px;
  margin-bottom: 14px;
}
.ai-q { font-size: 16px; font-weight: 700; margin: 0 0 12px; }
.ai-opts { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
.ai-chip {
  border: 1px solid var(--line);
  background: #fff;
  border-radius: 999px;
  padding: 8px 14px;
  font-size: 13px;
  color: var(--txt);
}
.ai-chip.on { border-color: var(--accent); background: var(--accent-weak); color: var(--accent); font-weight: 600; }
.ai-nav { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-top: 8px; }
.ai-item {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 10px 0;
  border-bottom: 1px solid var(--line);
  font-size: 13px;
}
.ai-item input { margin-top: 4px; }
.ai-reason { font-size: 12px; color: var(--txt3); margin-top: 3px; }
.ai-rec { margin-top: 10px; }
.ai-rec .btn-primary { margin-top: 10px; }
.ai-composer {
  display: flex;
  gap: 10px;
  align-items: flex-end;
  max-width: 720px;
  width: 100%;
  margin: 0 auto;
  padding: 12px 28px 20px;
  border-top: 1px solid var(--line);
  background: var(--panel);
}
.ai-composer textarea {
  flex: 1;
  border: 1px solid var(--line);
  background: #fff;
  border-radius: 12px;
  padding: 10px 12px;
  font-size: 14px;
  color: var(--txt);
  font-family: inherit;
  resize: none;
  min-height: 52px;
}
.ai-composer textarea:focus { outline: none; border-color: var(--accent); }
.ai-composer .btn-primary { padding: 10px 18px; flex: none; }
</style>
