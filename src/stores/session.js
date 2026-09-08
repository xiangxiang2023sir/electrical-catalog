import { defineStore } from 'pinia'
import { computed, reactive } from 'vue'
import {
  clearUser,
  emptyProject,
  loadProject,
  loadUser,
  nextRevision,
  normalizeVersion,
  saveProject,
  saveUser,
} from '../persist/session-storage.js'

export const useSessionStore = defineStore('session', () => {
  const user = reactive({
    name: '',
    staffId: '',
    role: '电气设计工程师',
  })
  const project = reactive(emptyProject())

  const loggedIn = computed(() => Boolean(user.name))
  const projectReady = computed(() =>
    Boolean(project.name && project.number && project.workOrder)
  )
  const projectLabel = computed(() => {
    if (!project.name) return '填写项目'
    return project.version ? `${project.name} · ${project.version}` : project.name
  })

  function hydrate() {
    const savedUser = loadUser()
    if (savedUser) Object.assign(user, savedUser)
    Object.assign(project, loadProject())
    if (project.name) saveProject({ ...project })
  }

  function login({ name, staffId = '', role = '电气设计工程师' }) {
    const next = {
      name: String(name || '').trim(),
      staffId: String(staffId || '').trim(),
      role: String(role || '电气设计工程师').trim() || '电气设计工程师',
    }
    if (!next.name) return { ok: false, error: '请填写姓名' }
    Object.assign(user, next)
    saveUser({ ...user })
    return { ok: true }
  }

  function logout() {
    user.name = ''
    user.staffId = ''
    user.role = '电气设计工程师'
    clearUser()
  }

  function updateProject(payload) {
    const next = {
      name: String(payload.name || '').trim(),
      number: String(payload.number || '').trim(),
      workOrder: String(payload.workOrder || '').trim(),
      mechEngineer: String(payload.mechEngineer || '').trim(),
      version: normalizeVersion(payload.version),
      changeNote: String(payload.changeNote || '').trim(),
    }
    if (!next.name) return { ok: false, error: '请填写项目名称' }
    if (!next.number) return { ok: false, error: '请填写项目编号' }
    if (!next.workOrder) return { ok: false, error: '请填写工作令' }
    Object.assign(project, next)
    saveProject({ ...project })
    return { ok: true }
  }

  function applyImportedProject(partial) {
    const next = {
      name: String(partial.name || project.name || '').trim(),
      number: String(partial.number || project.number || '').trim(),
      workOrder: String(partial.workOrder || project.workOrder || '').trim(),
      mechEngineer: String(partial.mechEngineer || project.mechEngineer || '').trim(),
      version: normalizeVersion(partial.version || project.version),
      changeNote: project.changeNote,
    }
    Object.assign(project, next)
    if (next.name && next.number && next.workOrder) saveProject({ ...project })
  }

  function advanceVersion() {
    project.version = nextRevision(project.version)
    saveProject({ ...project })
  }

  hydrate()

  return {
    user,
    project,
    loggedIn,
    projectReady,
    projectLabel,
    login,
    logout,
    updateProject,
    applyImportedProject,
    advanceVersion,
  }
})
