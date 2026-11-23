<template>
  <header class="portal-header">
    <div class="header-inner">
      <div class="account-line"><slot /></div>
      <nav class="navbar" aria-label="工作台导航">
        <div class="navbar-scroll">
          <el-menu :default-active="activeMenuPath" router mode="horizontal" menu-trigger="click"
            :ellipsis="false" class="nav-menu">
            <template v-for="item in currentMenus" :key="item.path || item.title">
              <el-sub-menu v-if="item.children && item.children.length" :index="item.title" popper-class="workspace-popover">
                <template #title>
                  <el-icon><component :is="item.icon" /></el-icon>
                  <span>{{ item.title }}</span>
                </template>
                <el-menu-item v-for="child in item.children" :key="child.path" :index="child.path">
                  <el-icon><component :is="child.icon" /></el-icon>
                  <span>{{ child.title }}</span>
                </el-menu-item>
              </el-sub-menu>
              <el-menu-item v-else :index="item.path">
                <el-icon><component :is="item.icon" /></el-icon>
                <span>{{ item.title }}</span>
              </el-menu-item>
            </template>
          </el-menu>
        </div>
      </nav>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { collegeModuleFor } from '@/router/collegeModules'
import { menus } from '@/router/menus'

const props = defineProps<{ role: string }>()
const route = useRoute()
const currentMenus = computed(() => menus[props.role] ?? [])
const activeMenuPath = computed(() => {
  if (props.role === 'COLLEGE_ADMIN') {
    const module = collegeModuleFor(route.path)
    if (module) return module.links[0].path
  }
  const items = currentMenus.value.flatMap(item => item.children || [item])
  const exact = items.find(item => item.path === route.fullPath)
  if (exact) return exact.path
  return items.sort((a, b) => b.path.length - a.path.length).find(item => route.path === item.path || route.path.startsWith(item.path + '/'))?.path ?? ''
})
</script>

<style scoped>
/* 顶栏：贴顶的暖白玻璃。原来是一条纯白横条 + 3px 橙边，视觉上像后台模板；
   改成带环境模糊的纸面，并用一道渐变细线收住顶部品牌色。 */
.portal-header {
  position: sticky;
  top: 0;
  z-index: 20;
  flex: none;
  background-color: rgba(255, 253, 249, .9);
  background-image: linear-gradient(180deg, rgba(255, 255, 255, .95), rgba(255, 251, 245, .82));
  -webkit-backdrop-filter: blur(20px) saturate(170%);
  backdrop-filter: blur(20px) saturate(170%);
  border-bottom: 1px solid #e9e1d6;
  box-shadow: 0 1px 0 rgba(255, 255, 255, .9), 0 10px 28px -26px rgba(66, 45, 28, .55);
}
.portal-header::before {
  content: '';
  position: absolute;
  inset: 0 0 auto;
  height: 2px;
  background: linear-gradient(90deg, #c9450b 0%, #ef7a2c 38%, #f8b678 66%, rgba(248, 182, 120, 0) 96%);
}
.header-inner { width: min(var(--portal-width), calc(100% - 2 * var(--workspace-gutter))); margin-inline: auto; }
.account-line { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px 20px; min-height: 76px; padding-block: 12px 10px; }

.navbar { position: relative; }
.nav-menu {
  --el-menu-bg-color: transparent;
  --el-menu-hover-bg-color: #fff6ec;
  --el-menu-horizontal-height: 46px;
  gap: 2px;
}
.navbar .nav-menu { border: 0; }
.nav-menu > :deep(.el-menu-item),
.nav-menu > :deep(.el-sub-menu > .el-sub-menu__title) {
  height: 38px;
  margin-block: 4px;
  padding-inline: 14px;
  border: 0;
  border-radius: 999px;
  color: #5f6167;
  font-weight: 560;
  font-size: 14px;
}
.nav-menu > :deep(.el-menu-item:hover),
.nav-menu > :deep(.el-sub-menu > .el-sub-menu__title:hover) { background: #fff6ec; color: #a8440d; }
.nav-menu > :deep(.el-menu-item.is-active),
.nav-menu > :deep(.el-sub-menu.is-active > .el-sub-menu__title) {
  border-color: transparent;
  background: linear-gradient(180deg, #fff8f0, #fdeedd);
  color: #b83f08;
  font-weight: 700;
  box-shadow: inset 0 0 0 1px #f3d8bf, 0 1px 2px rgba(66, 45, 28, .05);
}
.nav-menu :deep(.el-icon) { width: 1em; margin-right: 7px; font-size: 15px; }
.nav-menu :deep(.el-sub-menu__icon-arrow) { position: static; width: 1em; flex: none; margin: 0 0 0 5px; }
@media (max-width: 640px) {
  .account-line { gap: 4px 8px; min-height: 0; padding-block: 10px 6px; }
  .nav-menu { height: auto; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 2px 4px; }
  .nav-menu > :deep(.el-menu-item),
  .nav-menu > :deep(.el-sub-menu > .el-sub-menu__title) {
    justify-content: flex-start;
    padding-inline: 10px;
    height: 36px;
    margin-block: 2px;
  }
}
</style>
