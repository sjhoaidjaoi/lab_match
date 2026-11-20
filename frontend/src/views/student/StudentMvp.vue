<template>
  <section v-loading="loading" class="student-page" aria-live="polite">
    <h1>{{ title }}</h1>
    <el-alert v-if="failed" type="error" show-icon :closable="false" title="暂时无法读取选拔数据" />
    <el-button v-if="failed" @click="load">重试</el-button>
    <template v-if="workspace && !failed">
      <el-card v-if="page === 'dashboard'" shadow="never">
        <h2>我的选拔进度</h2>
        <p><RouterLink to="/student/application">意向填报</RouterLink> · {{ receipt.length ? '已提交' : '未提交' }}</p>
        <p><RouterLink to="/student/interview">面试安排</RouterLink> · {{ workspace.interviews.length }} 条</p>
        <p><RouterLink to="/student/admission-confirmation">拟录取</RouterLink> · {{ workspace.offers.length }} 条</p>
        <p><RouterLink to="/student/result">最终结果</RouterLink> · {{ workspace.published ? '已公示' : '尚未公示' }}</p>
      </el-card>

      <template v-if="page === 'labs' || page === 'lab-detail'">
        <RouterLink v-if="page === 'lab-detail'" to="/student/labs">返回实训室列表</RouterLink>
        <el-empty v-if="!displayLabs.length" description="暂无实训室信息" />
        <div v-else class="student-grid">
          <el-card v-for="lab in displayLabs" :key="lab.id" shadow="never">
            <h2>{{ lab.name }}</h2>
            <p>{{ lab.description }}</p>
            <p>{{ lab.projectDirection }}</p>
            <p>技术栈 · {{ lab.technologyStack || '待公布' }}</p>
            <p>招生 {{ lab.recruitmentQuota }} 人 · {{ lab.leaderName || '负责人待公布' }}</p>
            <RouterLink v-if="page === 'labs'" :to="'/student/labs/' + lab.id">实训室详情</RouterLink>
          </el-card>
        </div>
      </template>

      <template v-if="page === 'application' || page === 'record'">
        <el-card v-if="page === 'application'" shadow="never">
          <h2>平行志愿</h2>
          <p>请选择一至三个不同实训室，志愿没有优先级。</p>
          <p>提交后，所选实训室有权限的导师可查看你保存的简历。<RouterLink to="/student/profile">编辑简历</RouterLink></p>
          <p v-if="workspace.preferenceWindow.end">截止时间 · {{ formatTime(workspace.preferenceWindow.end) }}</p>
          <el-alert v-if="!open" type="info" :closable="false" title="当前不在志愿填报窗口" />
          <el-checkbox-group v-model="draft.laboratories" :max="3" :disabled="!open || saving"
            class="student-choice" aria-label="选择实训室">
            <el-checkbox v-for="lab in labs" :key="lab.id" :value="lab.id">
              {{ lab.name }} · 招生 {{ lab.recruitmentQuota }} 人
            </el-checkbox>
          </el-checkbox-group>
          <el-form label-position="top" class="student-actions">
            <el-form-item label="是否服从实训室内部调剂">
              <el-radio-group v-model="draft.internal" :disabled="!open || saving">
                <el-radio :value="true">服从</el-radio><el-radio :value="false">不服从</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="是否服从学院跨实训室调剂">
              <el-radio-group v-model="draft.college" :disabled="!open || saving">
                <el-radio :value="true">服从</el-radio><el-radio :value="false">不服从</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-form>
          <el-button type="primary" :disabled="!open" :loading="saving" @click="submit">
            {{ receipt.length ? '更新已提交志愿' : '提交志愿' }}
          </el-button>
        </el-card>
        <el-card shadow="never">
          <h2>提交回执</h2>
          <template v-if="receipt[0]">
            <ul class="student-list"><li v-for="item in receipt" :key="item.id">{{ item.laboratoryName }}</li></ul>
            <p>内部调剂 · {{ receipt[0].obeyInternalAdjustment ? '服从' : '不服从' }}</p>
            <p>跨实训室调剂 · {{ receipt[0].obeyCollegeAdjustment ? '服从' : '不服从' }}</p>
            <p>提交时间 · {{ formatTime(receipt[0].submittedAt) }}</p>
          </template>
          <el-empty v-else description="暂无提交记录" />
          <RouterLink v-if="page === 'record'" to="/student/application">前往意向填报</RouterLink>
        </el-card>
      </template>

      <template v-if="page === 'interview'">
        <el-empty v-if="!workspace.interviews.length" description="暂无面试安排" />
        <el-card v-for="item in workspace.interviews" :key="item.id" shadow="never">
          <h2>{{ item.labName }}</h2>
          <p>{{ formatTime(item.time) }} · {{ item.interviewer }}</p>
          <el-tag>{{ labels[item.status] ?? item.status }}</el-tag>
        </el-card>
      </template>

      <template v-if="page === 'admission-confirmation'">
        <el-empty v-if="!workspace.offers.length" description="暂无拟录取通知" />
        <el-card v-for="item in workspace.offers" :key="item.id" shadow="never">
          <h2>{{ item.labName }}</h2>
          <p>确认截止 · {{ formatTime(item.deadline) }}</p>
          <el-tag>{{ labels[item.status] ?? item.status }}</el-tag>
          <div v-if="item.actionable" class="student-actions">
            <el-button type="primary" :loading="saving" @click="confirm(item)">确认录取</el-button>
          </div>
        </el-card>
      </template>

      <template v-if="page === 'result'">
        <el-empty v-if="!workspace.published" description="最终录取结果尚未公示" />
        <el-empty v-else-if="!workspace.outcome" description="本批次暂无个人录取结果" />
        <el-card v-else shadow="never">
          <h2>{{ workspace.outcome.labName }}</h2>
          <p>负责人 · {{ workspace.outcome.leader || '待公布' }}</p>
          <el-tag>{{ labels[workspace.outcome.status] ?? workspace.outcome.status }}</el-tag>
        </el-card>
      </template>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { studentMvpApi, type MvpOffer, type MvpPreference, type MvpWorkspace } from '@/api/studentMvp'
import type { LabView } from '@/types'
import { formatTime } from './studentDemo'

const route = useRoute()
const props = defineProps<{ page: string }>()
const titles: Record<string, string> = {
  dashboard: '学生工作台', labs: '实训室列表', 'lab-detail': '实训室详情', application: '意向填报',
  record: '我的填报记录', interview: '面试安排', 'admission-confirmation': '拟录取确认', result: '最终结果'
}
const labels: Record<string, string> = {
  SCHEDULED: '已安排', IN_PROGRESS: '进行中', COMPLETED: '已完成', CANCELLED: '已取消',
  PENDING: '待确认', CONFIRMED: '已确认', REJECTED: '已释放名额', EXPIRED: '逾期未确认',
  ADMITTED: '已录取', ENROLLED: '已正式入组', WITHDRAWN: '已撤销'
}
const title = computed(() => titles[props.page] ?? '学生选拔')
const labs = ref<LabView[]>([])
const receipt = ref<MvpPreference[]>([])
const workspace = ref<MvpWorkspace>()
const loading = ref(false)
const saving = ref(false)
const failed = ref(false)
const draft = reactive({ laboratories: [] as number[], internal: null as boolean | null, college: null as boolean | null })
const open = computed(() => workspace.value?.preferenceWindow.open ?? false)
const displayLabs = computed(() => route.params.labId
  ? labs.value.filter(lab => String(lab.id) === route.params.labId) : labs.value)

let loadVersion = 0

async function load() {
  const version = ++loadVersion
  loading.value = true
  failed.value = false
  try {
    const [state, availableLabs, preferences] = await Promise.all([
      studentMvpApi.workspace(), studentMvpApi.labs(), studentMvpApi.preferences()
    ])
    if (version !== loadVersion) return
    workspace.value = state
    labs.value = availableLabs
    receipt.value = preferences
    draft.laboratories = preferences.map(item => item.laboratoryId)
      .filter(id => availableLabs.some(lab => lab.id === id))
    draft.internal = preferences[0]?.obeyInternalAdjustment ?? null
    draft.college = preferences[0]?.obeyCollegeAdjustment ?? null
  } catch {
    if (version === loadVersion) failed.value = true
  } finally {
    if (version === loadVersion) loading.value = false
  }
}

watch(() => route.path, load, { immediate: true })

async function submit() {
  if (!open.value || saving.value) return
  const { laboratories, internal, college } = draft
  if (!laboratories.length || internal === null || college === null) {
    ElMessage.warning('请选择实训室，并填写两项调剂意愿')
    return
  }
  saving.value = true
  try {
    receipt.value = await studentMvpApi.submit({
      laboratories, obeyInternalAdjustment: internal, obeyCollegeAdjustment: college
    })
    ElMessage.success('志愿已提交')
  } catch {
    // The HTTP interceptor displays the server's validation message.
  } finally {
    saving.value = false
  }
}

async function confirm(item: MvpOffer) {
  if (saving.value) return
  const agreed = await ElMessageBox.confirm('确认加入' + item.labName + '？其余拟录取名额将释放。', '确认录取')
    .then(() => true, () => false)
  if (!agreed || saving.value || !workspace.value) return
  saving.value = true
  try {
    workspace.value.offers = await studentMvpApi.confirm(item.id)
    ElMessage.success('录取已确认')
  } catch {
    // The HTTP interceptor displays the server's validation message.
  } finally {
    saving.value = false
  }
}
</script>
