import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { exportCompanyBomXlsx } from '../export/company-bom.js'
import { exportPlanCsv, exportPlanJson } from '../export/plan-file.js'
import { parseBomFile } from '../import/parse-bom.js'
import { lookupMaterialsByOrderNos } from '../api/materials.js'
import { parsePrice } from '../domain/material.js'
import { clearSavedPlan, loadPlan, savePlan } from '../persist/plan-storage.js'
import { useCatalogStore } from './catalog.js'
import { useSessionStore } from './session.js'
import { useUiStore } from './ui.js'

const IMPORT_CAP = 800

function ghostItem(line) {
  const priceNum = parsePrice(line.price)
  return {
    id: `bom:${line.orderNo}`,
    title: line.title || line.orderNo,
    cat: 'BOM导入 / 库外',
    desc: '',
    brand: line.brand || '',
    model: line.model || '',
    orderNo: line.orderNo,
    unit: line.unit || 'EA',
    priceNum,
    priceLabel: priceNum > 0 ? `¥${priceNum.toLocaleString()}` : '',
    tags: ['BOM导入'],
    img: '',
    fromBom: true,
  }
}

function compact(raw) {
  return String(raw || '')
    .toUpperCase()
    .replace(/[\s.\-]/g, '')
}

export const usePlanStore = defineStore('plan', () => {
  const entries = ref(loadPlan())
  const lastImport = ref(null)
  const importing = ref(false)

  function persist() {
    savePlan(entries.value)
  }

  const planSize = computed(() => entries.value.length)
  const planTotalQty = computed(() => entries.value.reduce((s, e) => s + Number(e.qty || 0), 0))
  const planItems = computed(() =>
    entries.value.map((e) => ({
      ...e.item,
      id: e.item.id,
      qty: Number(e.qty || 0),
    }))
  )

  const planHintHtml = computed(() => {
    const n = planSize.value
    if (n === 0) return '已选 0 项'
    const t = planItems.value.reduce((s, i) => s + (i.priceNum || 0) * i.qty, 0)
    const money = t > 0 ? ` · 预估 <b>¥${t.toLocaleString()}</b>` : ''
    return `已选 <b>${n}</b> 种 · <b>${planTotalQty.value}</b> 件${money}`
  })

  function inPlan(id) {
    const key = String(id)
    return entries.value.some((e) => e.id === key)
  }

  function remember(item) {
    if (!item) return
    const key = String(item.id)
    const idx = entries.value.findIndex((e) => e.id === key)
    if (idx >= 0) {
      entries.value[idx] = { ...entries.value[idx], item: { ...item } }
    }
  }

  function syncItem(item) {
    if (!item) return
    const key = String(item.id)
    const idx = entries.value.findIndex((e) => e.id === key)
    if (idx >= 0) {
      entries.value[idx] = { ...entries.value[idx], item: { ...item } }
      persist()
    }
  }

  function upsertPlanItem(item, qty) {
    if (item?.id == null) return
    const key = String(item.id)
    const n = Math.max(1, Math.floor(Number(qty) || 1))
    const row = { id: key, qty: n, item: { ...item } }
    const idx = entries.value.findIndex((e) => e.id === key)
    if (idx >= 0) {
      const next = entries.value.slice()
      next[idx] = row
      entries.value = next
    } else {
      entries.value = [...entries.value, row]
    }
  }

  function addToPlan(id) {
    const item = useCatalogStore().findItem(id)
    if (!item) {
      useUiStore().showToast('当前页没有这条物料')
      return
    }
    const key = String(item.id)
    const found = entries.value.find((e) => e.id === key)
    if (found) upsertPlanItem(item, found.qty + 1)
    else upsertPlanItem(item, 1)
    persist()
    useUiStore().showToast('已加入方案')
  }

  function togglePlan(id) {
    if (inPlan(id)) {
      removeFromPlan(id)
      useUiStore().showToast('已从方案移除')
      return
    }
    addToPlan(id)
  }

  function setPlanQty(id, qty) {
    const key = String(id)
    const n = Math.max(0, Math.floor(Number(qty) || 0))
    if (n <= 0) {
      removeFromPlan(id)
      return
    }
    const idx = entries.value.findIndex((e) => e.id === key)
    if (idx < 0) return
    const next = entries.value.slice()
    next[idx] = { ...next[idx], qty: n }
    entries.value = next
    persist()
  }

  function removeFromPlan(id) {
    const key = String(id)
    entries.value = entries.value.filter((e) => e.id !== key)
    persist()
  }

  function clearPlan() {
    entries.value = []
    lastImport.value = null
    clearSavedPlan()
  }

  function matchLine(line, byOrder, byModel) {
    const hit =
      byOrder.get(String(line.orderNo).toLowerCase()) ||
      (line.model ? byModel.get(compact(line.model)) : null)
    return hit || null
  }

  async function importBom(file) {
    const ui = useUiStore()
    if (!file) return
    if (importing.value) return
    importing.value = true
    try {
      const parsed = await parseBomFile(file)
      let lines = parsed.lines
      if (!lines.length) {
        lastImport.value = { fileName: file.name, matched: 0, missing: [], total: 0 }
        ui.showToast('这个文件里没有读到物料行。请确认是公司 BOM 的 xlsx，第 6 行起有订货号。', 4500)
        ui.openPlanDrawer()
        return
      }
      let capped = false
      if (lines.length > IMPORT_CAP) {
        lines = lines.slice(0, IMPORT_CAP)
        capped = true
      }
      const found = await lookupMaterialsByOrderNos(
        lines.map((l) => l.orderNo),
        lines.map((l) => l.model).filter(Boolean)
      )
      const byOrder = new Map(found.map((item) => [String(item.orderNo).toLowerCase(), item]))
      const byModel = new Map()
      for (const item of found) {
        const key = compact(item.model)
        if (key.length >= 5 && !byModel.has(key)) byModel.set(key, item)
      }
      const missing = []
      let matched = 0
      for (const line of lines) {
        const hit = matchLine(line, byOrder, byModel)
        if (hit) {
          upsertPlanItem(hit, line.qty)
          matched += 1
        } else {
          upsertPlanItem(ghostItem(line), line.qty)
          missing.push(line)
        }
      }
      persist()
      if (parsed.project && (parsed.project.name || parsed.project.number || parsed.project.workOrder)) {
        useSessionStore().applyImportedProject(parsed.project)
      }
      lastImport.value = {
        fileName: file.name,
        matched,
        missing,
        total: lines.length,
        capped,
      }
      const missText = missing.length ? `，库外 ${missing.length} 条也已放入方案` : ''
      const capText = capped ? `（表太大，先导入前 ${IMPORT_CAP} 种）` : ''
      ui.showToast(`已导入 ${lines.length} 种：库内 ${matched}${missText}${capText}`, 4500)
      ui.openPlanDrawer()
    } catch (e) {
      console.error(e)
      ui.showToast(e?.message || '导入 BOM 失败', 4500)
    } finally {
      importing.value = false
    }
  }

  function ensureExportReady() {
    const ui = useUiStore()
    const session = useSessionStore()
    const list = planItems.value
    if (!list.length) {
      ui.showToast('方案是空的')
      return null
    }
    if (!session.projectReady) {
      ui.showToast('请先填写项目名称、编号和工作令')
      ui.openProjectDrawer()
      return null
    }
    return { ui, session, list }
  }

  async function exportCompanyBom() {
    const ready = ensureExportReady()
    if (!ready) return
    const { ui, session, list } = ready
    const usedVersion = session.project.version
    try {
      await exportCompanyBomXlsx({
        project: { ...session.project },
        user: { ...session.user },
        items: list,
      })
      session.advanceVersion()
      ui.showToast(`已导出公司 BOM（版本 ${usedVersion}），下次为 ${session.project.version}`)
    } catch (e) {
      console.error(e)
      ui.showToast(e?.message || '导出公司 BOM 失败')
    }
  }

  function exportPlan(format) {
    const ready = ensureExportReady()
    if (!ready) return
    const { ui, list } = ready
    if (format === 'json') exportPlanJson(list)
    else exportPlanCsv(list)
    ui.showToast('已导出临时清单（非正式 BOM）')
  }

  return {
    entries,
    planSize,
    planTotalQty,
    planItems,
    planHintHtml,
    lastImport,
    importing,
    inPlan,
    remember,
    syncItem,
    addToPlan,
    togglePlan,
    setPlanQty,
    removeFromPlan,
    clearPlan,
    importBom,
    exportCompanyBom,
    exportPlan,
  }
})
