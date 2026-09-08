<template>
  <LoginScreen v-if="!session.loggedIn" />
  <div v-else class="app-wrapper">
    <RailNav />
    <Sidebar />
    <main class="main">
      <TopBar />
      <div class="main-body">
        <MaterialGrid />
      </div>
      <div class="statusbar">外挂物料库 library/catalog.db · 可导入已有 BOM 到方案，再加料导出</div>
    </main>
    <DetailPanel />
    <ToastMessage />
    <PlanDrawer />
    <MaterialForm />
    <ProjectDrawer />
    <ProfileDrawer />
  </div>
</template>

<script setup>
import { onMounted, watch } from 'vue'
import { useCatalogStore } from './stores/catalog.js'
import { useSessionStore } from './stores/session.js'
import { useUiStore } from './stores/ui.js'
import RailNav from './components/layout/RailNav.vue'
import Sidebar from './components/layout/Sidebar.vue'
import TopBar from './components/layout/TopBar.vue'
import LoginScreen from './components/layout/LoginScreen.vue'
import ProjectDrawer from './components/layout/ProjectDrawer.vue'
import ProfileDrawer from './components/layout/ProfileDrawer.vue'
import MaterialGrid from './components/catalog/MaterialGrid.vue'
import DetailPanel from './components/catalog/DetailPanel.vue'
import MaterialForm from './components/catalog/MaterialForm.vue'
import PlanDrawer from './components/plan/PlanDrawer.vue'
import ToastMessage from './components/common/ToastMessage.vue'

const catalog = useCatalogStore()
const session = useSessionStore()
const ui = useUiStore()

watch(
  () => ui.selectedId,
  (id) => {
    if (id != null) catalog.ensureItem(id)
  }
)

onMounted(async () => {
  await catalog.loadFromApi()
})
</script>

<style>
.app-wrapper { display: flex; width: 100%; height: 100vh; overflow: hidden; }
html, body, #app { height: 100%; width: 100%; margin: 0; padding: 0; }
.main-body {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
</style>
