export const CUSTOM_OPTION_ID = 'custom'

export const FALLBACK_STEPS = [
  {
    id: 'device',
    title: '做什么设备？',
    options: [
      { id: 'agv', label: 'AGV / 移动小车' },
      { id: 'line', label: '输送线 / 产线' },
      { id: 'fixture', label: '工装 / 台架' },
      { id: 'cabinet', label: '电柜 / 控制柜' },
    ],
  },
  {
    id: 'voltage',
    title: '主供电电压？',
    options: [
      { id: 'dc24', label: '24V DC' },
      { id: 'ac220', label: '220V AC' },
      { id: 'ac380', label: '380V AC' },
    ],
  },
  {
    id: 'brand',
    title: '控制件品牌偏好？',
    options: [
      { id: 'siemens', label: '西门子' },
      { id: 'weidmuller', label: '魏德米勒' },
      { id: 'any', label: '不限' },
    ],
  },
  {
    id: 'safety',
    title: '急停 / 安全？',
    options: [
      { id: 'estop_relay', label: '急停 + 安全继电器' },
      { id: 'estop', label: '只要急停' },
      { id: 'none', label: '这次先不要' },
    ],
  },
]

export function emptyAnswers(steps) {
  return Object.fromEntries((steps || []).map((s) => [s.id, { optionId: '', custom: '' }]))
}

export function answersToPromptRows(steps, answers) {
  return (steps || []).map((step) => {
    const row = answers?.[step.id] || { optionId: '', custom: '' }
    const picked = step.options.find((o) => o.id === row.optionId)
    let value = ''
    if (row.optionId === CUSTOM_OPTION_ID) value = String(row.custom || '').trim()
    else if (picked) value = picked.label
    return { id: step.id, title: step.title, value: value || '未填' }
  })
}

export function wizardComplete(steps, answers) {
  if (!steps?.length) return false
  return steps.every((step) => {
    const row = answers?.[step.id]
    if (!row) return false
    if (row.optionId === CUSTOM_OPTION_ID) return Boolean(String(row.custom || '').trim())
    return Boolean(row.optionId)
  })
}
