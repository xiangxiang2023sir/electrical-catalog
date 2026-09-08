import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUiStore = defineStore('ui', () => {
  const viewMode = ref('grid')
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

  function selectItem(id) {
    selectedId.value = id
    if (id != null) {
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
    planDrawerOpen.value = false
    projectDrawerOpen.value = false
    profileDrawerOpen.value = false
    selectedId.value = null
    formMode.value = 'add'
    formId.value = null
    formOpen.value = true
  }

  function openEditForm(id) {
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
    selectedId,
    toast,
    planDrawerOpen,
    formOpen,
    formMode,
    formId,
    projectDrawerOpen,
    profileDrawerOpen,
    showToast,
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
