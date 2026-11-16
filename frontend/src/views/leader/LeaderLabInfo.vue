<template>
  <section v-loading="loading" class="page">
    <header class="page-header lab-header">
      <div>
        <h1 class="page-title">实训室相关信息</h1>
        <p class="page-desc">基础资料、教师团队与招生名额由学院统一维护；本页可查看，并维护本室宣传资料。</p>
      </div>
    </header>

    <el-empty v-if="!labId" description="当前账号未绑定实训室，请联系学院管理员" />
    <el-alert v-else-if="failed" title="实训室信息加载失败" type="error" :closable="false">
      <el-button text @click="load">重试</el-button>
    </el-alert>

    <template v-else-if="lab">
      <el-alert
        type="info"
        :closable="false"
        show-icon
        title="资料维护权限说明"
        description="实训室编号、名称、位置、介绍、教师名单与招生名额由学院统一维护，组长端为只读；如需修改请联系学院管理员。宣传资料（PPT / 视频 / 图片 / 文档）由本室自行上传管理。"
      />

      <div class="overview-grid">
        <el-card shadow="never" class="overview-card">
          <template #header>基本信息</template>
          <dl class="lab-summary">
            <div><dt>实训室编号</dt><dd>{{ lab.labCode || '待完善' }}</dd></div>
            <div><dt>实训室名称</dt><dd>{{ lab.name || '待完善' }}</dd></div>
            <div><dt>所属学院</dt><dd>{{ lab.college || '待完善' }}</dd></div>
            <div><dt>实训室位置</dt><dd>{{ lab.location || '待完善' }}</dd></div>
            <div><dt>实训室组长</dt><dd>{{ lab.leaderName || '待学院指定' }}</dd></div>
            <div><dt>联系方式</dt><dd>{{ lab.contact || '待完善' }}</dd></div>
            <div class="wide"><dt>主要研究方向</dt><dd>{{ lab.researchDirection || '待完善' }}</dd></div>
            <div class="wide"><dt>实训室简介</dt><dd class="multiline">{{ lab.description || '待完善' }}</dd></div>
            <div v-if="lab.detail" class="wide"><dt>详细介绍</dt><dd class="multiline">{{ lab.detail }}</dd></div>
            <div v-if="lab.features" class="wide"><dt>实训室特色</dt><dd class="multiline">{{ lab.features }}</dd></div>
          </dl>
        </el-card>

        <el-card shadow="never" class="overview-card quota-card">
          <template #header>本学年名额（{{ lab.academicYear }}）</template>
          <div class="quota-grid">
            <div><span>招生总名额</span><b>{{ lab.quota.totalQuota }}</b></div>
            <div><span>已分配教师</span><b>{{ lab.quota.allocatedQuota }}</b></div>
            <div><span>未分配</span><b>{{ lab.quota.unallocatedQuota }}</b></div>
            <div><span>已录取</span><b>{{ lab.quota.enrolled }}</b></div>
          </div>
          <p class="quota-hint">名额由学院统一设置，组长端仅可查看。</p>
        </el-card>
      </div>

      <el-tabs v-model="tab" class="info-tabs" @tab-change="onTabChange">
        <el-tab-pane label="教师信息" name="teachers">
          <el-card shadow="never">
            <el-table :data="lab.teachers" stripe empty-text="学院尚未录入本室教师">
              <el-table-column label="姓名" min-width="120">
                <template #default="{ row }">
                  <div class="teacher-name">
                    <el-avatar :size="26" :src="row.photoUrl || undefined">{{ row.name.slice(0, 1) }}</el-avatar>
                    <span>{{ row.name }}</span>
                  </div>
                </template>
              </el-table-column>
              <el-table-column label="身份" width="104">
                <template #default="{ row }">
                  <el-tag :type="row.identity === 'LEADER' ? 'success' : 'info'" effect="plain" size="small">
                    {{ row.identity === 'LEADER' ? '实训室组长' : '普通教师' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="职称 / 学位" min-width="130">
                <template #default="{ row }">{{ [row.title, row.degree].filter(Boolean).join(' / ') || '—' }}</template>
              </el-table-column>
              <el-table-column prop="direction" label="研究方向" min-width="150" show-overflow-tooltip>
                <template #default="{ row }">{{ row.direction || '—' }}</template>
              </el-table-column>
              <el-table-column prop="email" label="联系邮箱" min-width="170">
                <template #default="{ row }">{{ row.email || '—' }}</template>
              </el-table-column>
              <el-table-column label="本学年名额" width="110" align="center">
                <template #default="{ row }">{{ row.quota }}</template>
              </el-table-column>
              <el-table-column label="简介" min-width="200" show-overflow-tooltip>
                <template #default="{ row }">{{ row.intro || '—' }}</template>
              </el-table-column>
            </el-table>
          </el-card>
        </el-tab-pane>

        <el-tab-pane label="宣传资料" name="files" lazy>
          <el-card shadow="never">
            <LabPromotionFiles :lab-id="lab.id" editable @changed="load" />
          </el-card>
        </el-tab-pane>

        <el-tab-pane label="宣讲与开放日" name="media" lazy>
          <LeaderLabContent :lab="mediaLab" @updated="load" />
        </el-tab-pane>
      </el-tabs>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { labProfileApi, type LabProfileDetail } from '@/api/labProfiles'
import { useAuthStore } from '@/stores/auth'
import type { LabDetail } from '@/api/student'
import LabPromotionFiles from '@/components/lab/LabPromotionFiles.vue'
import LeaderLabContent from './LeaderLabContent.vue'

const auth = useAuthStore()
const route = useRoute()
const labId = computed(() => auth.user?.laboratoryId ?? null)

const lab = ref<LabProfileDetail>()
const loading = ref(false)
const failed = ref(false)
const tab = ref('teachers')

/** 宣讲与开放日仍由组长维护媒体地址，这里只暴露该模块需要的字段 */
const mediaLab = computed<LabDetail>(() => ({
  ...(lab.value as unknown as LabDetail),
  id: lab.value?.id ?? 0,
  briefingText: (lab.value as unknown as { briefingText?: string })?.briefingText || ''
}))

async function load() {
  const id = labId.value
  lab.value = undefined
  failed.value = false
  if (!id) { loading.value = false; return }
  loading.value = true
  try {
    const detail = await labProfileApi.detail(id)
    if (id !== labId.value) return
    lab.value = detail
  } catch {
    if (id === labId.value) failed.value = true
  } finally {
    if (id === labId.value) loading.value = false
  }
}

function onTabChange(name: string | number) {
  if (name === 'files' || name === 'media') void load()
}

watch(labId, load, { immediate: true })
watch(() => route.query.tab, (value) => {
  if (value === 'media' || value === 'files' || value === 'teachers') tab.value = value
}, { immediate: true })
</script>

<style scoped>
.lab-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; flex-wrap: wrap; }
.el-alert + .overview-grid { margin-top: 14px; }
.overview-grid { display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 1fr); gap: 16px; }
.lab-summary { margin: 0; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px 20px; }
.lab-summary dt { color: var(--lm-text-secondary); font-size: 13px; }
.lab-summary dd { margin: 4px 0 0; overflow-wrap: anywhere; }
.lab-summary .wide { grid-column: 1 / -1; }
.lab-summary .multiline { white-space: pre-wrap; line-height: 1.7; }
.quota-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.quota-grid div { display: grid; gap: 4px; padding: 12px 14px; border-radius: 12px; background: var(--lm-bg); }
.quota-grid span { font-size: 12px; color: var(--lm-text-secondary); }
.quota-grid b { font-size: 22px; color: var(--lm-text); font-variant-numeric: tabular-nums; }
.quota-hint { margin: 12px 0 0; font-size: 12px; color: var(--lm-text-secondary); }
.info-tabs { margin-top: 16px; }
.teacher-name { display: flex; align-items: center; gap: 8px; }
@media (max-width: 960px) {
  .overview-grid { grid-template-columns: minmax(0, 1fr); }
  .lab-summary { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
</style>
