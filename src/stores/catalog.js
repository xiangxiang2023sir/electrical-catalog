import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { parseTags } from '../domain/material.js'
import {
  createMaterial,
  deleteMaterial,
  fetchCategories,
  fetchMaterial,
  fetchMaterialsPage,
  updateMaterial,
} from '../api/materials.js'
import { useUiStore } from './ui.js'

export const useCatalogStore = defineStore('catalog', () => {
  const items = ref([])
  const categories = ref(['全部'])
  const categoryCounts = ref({})
  const q = ref('')
  const cat = ref('全部')
  const currentPage = ref(1)
  const pageSize = ref(48)
  const totalCount = ref(0)
  const hasMore = ref(false)
  const loading = ref(false)
  const selectedCache = ref(null)

  const filteredItems = computed(() => items.value)

  const categoryOptions = computed(() =>
    categories.value.filter((c) => c && c !== '全部' && c.includes(' / '))
  )

  const selectedItem = computed(() => {
    const id = useUiStore().selectedId
    if (id == null) return null
    return (
      items.value.find((i) => String(i.id) === String(id)) ||
      (selectedCache.value && String(selectedCache.value.id) === String(id)
        ? selectedCache.value
        : null)
    )
  })

  const editingItem = computed(() => {
    const ui = useUiStore()
    if (ui.formMode !== 'edit' || ui.formId == null) return null
    return (
      items.value.find((i) => String(i.id) === String(ui.formId)) ||
      (selectedCache.value && String(selectedCache.value.id) === String(ui.formId)
        ? selectedCache.value
        : null)
    )
  })

  const resultCountText = computed(() => {
    const shown = items.value.length
    const extra = hasMore.value ? '（滚动加载更多）' : ''
    return `当前 ${shown} 项 / 库内 ${totalCount.value} 条${extra}`
  })

  function findItem(id) {
    return (
      items.value.find((i) => String(i.id) === String(id)) ||
      (selectedCache.value && String(selectedCache.value.id) === String(id)
        ? selectedCache.value
        : null)
    )
  }

  async function loadCategories() {
    try {
      const data = await fetchCategories()
      categories.value = data.names
      categoryCounts.value = { 全部: data.total, ...data.counts }
      if (!q.value.trim() && (cat.value === '全部' || !cat.value)) {
        totalCount.value = data.total
      }
    } catch (e) {
      console.error('加载分类失败', e)
    }
  }

  async function loadMaterials(reset = true) {
    if (loading.value) return
    if (reset) {
      currentPage.value = 1
      items.value = []
      hasMore.value = true
    }
    if (!hasMore.value) return

    loading.value = true
    try {
      const { items: newItems, total } = await fetchMaterialsPage({
        page: currentPage.value,
        pageSize: pageSize.value,
        q: q.value,
        cat: cat.value,
      })
      totalCount.value = total
      if (reset) items.value = newItems
      else items.value.push(...newItems)
      hasMore.value = items.value.length < total
      if (hasMore.value) currentPage.value += 1
    } catch (e) {
      console.error('加载物料失败', e)
      useUiStore().showToast('物料库打不开，请确认已运行 npm run dev')
    } finally {
      loading.value = false
    }
  }

  async function loadMore() {
    await loadMaterials(false)
  }

  async function loadFromApi() {
    await loadCategories()
    await loadMaterials(true)
  }

  async function filterByCategory(categoryName) {
    cat.value = categoryName
    await loadMaterials(true)
  }

  async function search(keyword) {
    q.value = keyword
    await loadMaterials(true)
  }

  async function ensureItem(id) {
    const found = findItem(id)
    if (found) {
      selectedCache.value = found
      return found
    }
    try {
      const item = await fetchMaterial(id)
      selectedCache.value = item
      return item
    } catch {
      return null
    }
  }

  async function saveMaterial(payload) {
    const ui = useUiStore()
    const orderNo = String(payload.orderNo || '').trim()
    const title = String(payload.title || '').trim()
    if (!orderNo) return { ok: false, error: '请填写内部订货号（与公司表一致）' }
    if (!title) return { ok: false, error: '请填写名称' }

    const body = {
      orderNo,
      title,
      cat: String(payload.cat || '').trim() || '未分类',
      desc: String(payload.desc || '').trim(),
      brand: String(payload.brand || '').trim(),
      model: String(payload.model || '').trim(),
      unit: String(payload.unit || '').trim() || 'EA',
      price: payload.price,
      tags: parseTags(payload.tags),
      img: String(payload.img || '').trim(),
    }

    const result =
      ui.formMode === 'edit'
        ? await updateMaterial(ui.formId, body)
        : await createMaterial(body)

    if (!result.ok) return result

    selectedCache.value = result.item
    const idx = items.value.findIndex((i) => String(i.id) === String(result.item.id))
    if (idx >= 0) items.value[idx] = result.item
    else items.value.unshift(result.item)

    ui.showToast(ui.formMode === 'edit' ? '物料已更新' : '已写入外挂物料库')
    await loadCategories()
    ui.closeForm()
    ui.selectItem(result.item.id)
    return { ok: true, item: result.item }
  }

  async function removeMaterial(id) {
    const ui = useUiStore()
    const result = await deleteMaterial(id)
    if (!result.ok) {
      ui.showToast(result.error || '删除失败')
      return
    }
    items.value = items.value.filter((i) => String(i.id) !== String(id))
    if (String(ui.selectedId) === String(id)) ui.selectedId = null
    if (selectedCache.value && String(selectedCache.value.id) === String(id)) {
      selectedCache.value = null
    }
    await loadCategories()
    ui.closeForm()
    ui.showToast('已从物料库删除')
  }

  return {
    items,
    categories,
    categoryCounts,
    q,
    cat,
    totalCount,
    hasMore,
    loading,
    filteredItems,
    categoryOptions,
    selectedItem,
    editingItem,
    resultCountText,
    findItem,
    ensureItem,
    filterByCategory,
    search,
    loadFromApi,
    loadMore,
    saveMaterial,
    removeMaterial,
  }
})
