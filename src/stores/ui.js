import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUiStore = defineStore('ui', () => {
  const viewMode = ref('grid')
  const mainView = ref('catalog')
  const selectedId = ref(null)
  const toast = ref(null)
  const planDrawerOpen = ref(false)
  const formOpen = ref(false)
  const formMode = ref('add')
  const formId = ref(null)
  const projectDrawerOpen = ref(false)
  const profileDrawerOpen = ref(false)

  function showToast(msg, ms = 2500) {
    toast.value = msg
    setTimeout(() => {
      if (toast.value === msg) toast.value = null
    }, ms)
  }

  function showCatalog() {
    mainView.value = 'catalog'
  }

  function showAssistant() {
    selectedId.value = null
    formOpen.value = false
    planDrawerOpen.value = false
    projectDrawerOpen.value = false
    profileDrawerOpen.value = false
    mainView.value = 'assistant'
  }

  function selectItem(id) {
    selectedId.value = id
    if (id != null) {
      mainView.value = 'catalog'
      planDrawerOpen.value = false
      formOpen.value = false
      projectDrawerOpen.value = false
      profileDrawerOpen.value = false
    }
  }

  function openPlanDrawer() {
    selectedId.value = null
    formOpen.value = false
    projectDrawerOpen.value = false
    profileDrawerOpen.value = false
    planDrawerOpen.value = true
  }

  function closePlanDrawer() {
    planDrawerOpen.value = false
  }

  function openAddForm() {
    mainView.value = 'catalog'
    planDrawerOpen.value = false
    projectDrawerOpen.value = false
    profileDrawerOpen.value = false
    selectedId.value = null
    formMode.value = 'add'
    formId.value = null
    formOpen.value = true
  }

  function openEditForm(id) {
    mainView.value = 'catalog'
    planDrawerOpen.value = false
    projectDrawerOpen.value = false
    profileDrawerOpen.value = false
    selectedId.value = null
    formMode.value = 'edit'
    formId.value = id
    formOpen.value = true
  }

  function openProjectDrawer() {
    selectedId.value = null
    formOpen.value = false
    planDrawerOpen.value = false
    profileDrawerOpen.value = false
    projectDrawerOpen.value = true
  }

  function closeProjectDrawer() {
    projectDrawerOpen.value = false
  }

  function openProfileDrawer() {
    selectedId.value = null
    formOpen.value = false
    planDrawerOpen.value = false
    projectDrawerOpen.value = false
    profileDrawerOpen.value = true
  }

  function closeProfileDrawer() {
    profileDrawerOpen.value = false
  }

  function closeForm() {
    formOpen.value = false
    formId.value = null
  }

  return {
    viewMode,
    mainView,
    selectedId,
    toast,
    planDrawerOpen,
    formOpen,
    formMode,
    formId,
    projectDrawerOpen,
    profileDrawerOpen,
    showToast,
    showCatalog,
    showAssistant,
    selectItem,
    openPlanDrawer,
    closePlanDrawer,
    openAddForm,
    openEditForm,
    closeForm,
    openProjectDrawer,
    closeProjectDrawer,
    openProfileDrawer,
    closeProfileDrawer,
  }
})
