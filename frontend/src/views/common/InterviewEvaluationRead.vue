<template>
  <el-button link type="primary" @click="open">正式评价</el-button>
  <el-dialog v-model="visible" append-to-body title="正式面试评价" width="min(640px, 94vw)">
    <section v-loading="loading" class="evaluations">
      <el-alert v-if="failed" type="error" title="读取失败" :closable="false">
        <el-button text @click="open">重试</el-button>
      </el-alert>
      <template v-else-if="result">
        <p>汇总分 {{ result.summary.total ?? '—' }} · {{ result.summary.count }} 位面试官已提交</p>
        <el-alert v-if="result.summary.review" type="warning" title="评分差异超过复核阈值" :closable="false" />
        <el-empty v-if="!result.rows.length" description="暂无正式评价" />
        <el-card v-for="row in result.rows" :key="row.reviewerId" shadow="never">
          <template #header>{{ row.reviewerName || '面试官' }} · 第 {{ row.version }} 版 · {{ row.total ?? '未计分' }}</template>
          <div class="dimensions">
            <span v-for="item in scoreDimensions" :key="item.key">{{ item.label }} {{ row.scores[item.key] ?? '—' }}</span>
          </div>
          <p v-if="row.evaluation" class="review-text">{{ row.evaluation }}</p>
          <p v-if="row.recommendation !== 'PENDING'">建议 · {{ labels[row.recommendation] }}</p>
        </el-card>
      </template>
    </section>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { interviewSelection, scoreDimensions } from '@/api/interviewSelection'

const props = defineProps<{ interviewId: number }>()
const labels = { INTENDED: '拟录取', ALTERNATE: '候补', REJECTED: '不通过' }
const visible = ref(false)
const failed = ref(false)
const loading = ref(false)
const result = ref<Awaited<ReturnType<typeof interviewSelection.read>>>()

async function open() {
  visible.value = true
  if (loading.value) return
  loading.value = true
  failed.value = false
  result.value = undefined
  try { result.value = await interviewSelection.read(props.interviewId) }
  catch { failed.value = true }
  finally { loading.value = false }
}
</script>

<style scoped>
.evaluations { display: grid; gap: 12px; min-height: 72px; }
.dimensions { display: flex; flex-wrap: wrap; gap: 8px 16px; }
.review-text { white-space: pre-wrap; overflow-wrap: anywhere; }
</style>
