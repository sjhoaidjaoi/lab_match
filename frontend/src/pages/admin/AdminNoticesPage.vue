<template>
  <div class="admin-notices-page">
    <div class="page-header">
      <div>
        <h2>公告管理</h2>
        <p class="subtitle">维护宣讲、开放日、公示与通知类公告；草稿仅管理员可见，已发布公告展示在公共端</p>
      </div>
      <el-button type="primary" @click="openCreate">新建公告</el-button>
    </div>

    <el-card shadow="never">
      <div class="filter-bar">
        <el-input
          v-model="filters.keyword"
          placeholder="按标题搜索"
          clearable
          class="filter-keyword"
          @keyup.enter="loadNotices"
          @clear="loadNotices"
        />
        <el-select v-model="filters.noticeType" placeholder="全部类型" clearable class="filter-select">
          <el-option v-for="item in typeOptions" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
        <el-select v-model="filters.status" placeholder="全部状态" clearable class="filter-select">
          <el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
        <el-button type="primary" plain @click="loadNotices">查询</el-button>
        <el-button @click="resetFilters">重置</el-button>
      </div>

      <el-table v-loading="loading" :data="notices" row-key="id" stripe>
        <el-table-column prop="title" label="标题" min-width="260" show-overflow-tooltip />
        <el-table-column label="类型" width="100">
          <template #default="{ row }">
            <el-tag :type="typeTag(row.noticeType)" size="small" effect="plain">{{ row.noticeTypeText }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusTag(row.status)" size="small">{{ row.statusText }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="发布时间" width="180">
          <template #default="{ row }">{{ row.publishTime ?? '—' }}</template>
        </el-table-column>
        <el-table-column prop="publisherName" label="发布人" width="120" />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
            <el-button v-if="row.status !== 2" link type="success" @click="handleStatus(row, 2)">发布</el-button>
            <el-button v-if="row.status === 2" link type="warning" @click="handleStatus(row, 3)">下线</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="editing ? '编辑公告' : '新建公告'" width="640px">
      <el-form label-width="90px">
        <el-form-item label="标题" required>
          <el-input v-model="form.title" maxlength="200" show-word-limit placeholder="请输入公告标题" />
        </el-form-item>
        <el-form-item label="类型" required>
          <el-select v-model="form.noticeType" class="full-width">
            <el-option v-for="item in typeOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="正文" required>
          <el-input v-model="form.content" type="textarea" :rows="8" maxlength="5000" show-word-limit />
        </el-form-item>
        <el-form-item label="附件地址">
          <el-input v-model="form.attachmentUrl" maxlength="500" placeholder="选填，填写附件下载地址" />
        </el-form-item>
        <el-form-item v-if="editing" label="当前状态">
          <el-tag :type="statusTag(form.status)" size="small">{{ ANNOUNCEMENT_STATUS_TEXT[form.status] }}</el-tag>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button :disabled="submitting" @click="dialogVisible = false">取消</el-button>
        <template v-if="editing">
          <el-button type="primary" :loading="submitting" @click="handleSubmit()">保存</el-button>
        </template>
        <template v-else>
          <el-button :disabled="submitting" @click="handleSubmit(1)">存为草稿</el-button>
          <el-button type="primary" :loading="submitting" @click="handleSubmit(2)">发布</el-button>
        </template>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { MockError } from '@/mock/auth'
import {
  ANNOUNCEMENT_STATUS_TEXT,
  ANNOUNCEMENT_TYPE_TEXT,
  mockAdminNoticeList,
  mockCreateNotice,
  mockUpdateNotice,
  mockUpdateNoticeStatus
} from '@/mock/notice'
import type { AdminNotice } from '@/types/notice'

const loading = ref(false)
const submitting = ref(false)
const dialogVisible = ref(false)
const notices = ref<AdminNotice[]>([])
const filters = reactive<{ keyword: string; noticeType?: number; status?: number }>({ keyword: '' })
const form = reactive({ id: 0, title: '', noticeType: 1, content: '', attachmentUrl: '', status: 1 })

const editing = computed(() => form.id > 0)
const typeOptions = Object.entries(ANNOUNCEMENT_TYPE_TEXT).map(([value, label]) => ({
  value: Number(value),
  label
}))
const statusOptions = Object.entries(ANNOUNCEMENT_STATUS_TEXT).map(([value, label]) => ({
  value: Number(value),
  label
}))

function typeTag(type: number): 'primary' | 'success' | 'warning' | 'info' {
  if (type === 1 || type === 2) {
    return 'primary'
  }
  return type === 3 ? 'warning' : 'info'
}

function statusTag(status: number): 'success' | 'info' | 'danger' {
  if (status === 2) {
    return 'success'
  }
  return status === 3 ? 'danger' : 'info'
}

async function loadNotices() {
  loading.value = true
  try {
    notices.value = await mockAdminNoticeList({
      keyword: filters.keyword || undefined,
      noticeType: filters.noticeType,
      status: filters.status
    })
  } catch (error) {
    ElMessage.error(error instanceof MockError ? error.message : '加载公告失败')
  } finally {
    loading.value = false
  }
}

function resetFilters() {
  filters.keyword = ''
  filters.noticeType = undefined
  filters.status = undefined
  loadNotices()
}

function openCreate() {
  form.id = 0
  form.title = ''
  form.noticeType = 1
  form.content = ''
  form.attachmentUrl = ''
  form.status = 1
  dialogVisible.value = true
}

function openEdit(row: AdminNotice) {
  form.id = row.id
  form.title = row.title
  form.noticeType = row.noticeType
  form.content = row.content
  form.attachmentUrl = row.attachmentUrl
  form.status = row.status
  dialogVisible.value = true
}

async function handleSubmit(status?: number) {
  submitting.value = true
  try {
    if (editing.value) {
      await mockUpdateNotice(form.id, {
        title: form.title,
        noticeType: form.noticeType,
        content: form.content,
        attachmentUrl: form.attachmentUrl
      })
      ElMessage.success('公告已保存')
    } else {
      await mockCreateNotice({
        title: form.title,
        noticeType: form.noticeType,
        content: form.content,
        attachmentUrl: form.attachmentUrl,
        status
      })
      ElMessage.success(status === 2 ? '公告已发布' : '草稿已保存')
    }
    dialogVisible.value = false
    await loadNotices()
  } catch (error) {
    ElMessage.error(error instanceof MockError ? error.message : '保存公告失败')
  } finally {
    submitting.value = false
  }
}

async function handleStatus(row: AdminNotice, status: number) {
  const action = status === 2 ? '发布' : '下线'
  try {
    await ElMessageBox.confirm(
      status === 2 ? '发布后公告即刻在公共端可见，确认发布？' : '下线后公共端将不可见，确认下线？',
      `${action}公告`,
      { type: 'warning' }
    )
  } catch {
    return
  }
  try {
    await mockUpdateNoticeStatus(row.id, status)
    ElMessage.success(`公告已${action === '发布' ? '发布' : '下线'}`)
    await loadNotices()
  } catch (error) {
    ElMessage.error(error instanceof MockError ? error.message : `${action}失败`)
  }
}

onMounted(loadNotices)
</script>

<style scoped>
.admin-notices-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.page-header h2 {
  margin: 0 0 6px;
  font-size: 20px;
}

.subtitle {
  margin: 0;
  font-size: 13px;
  color: #909399;
}

.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 14px;
}

.filter-keyword {
  width: 240px;
}

.filter-select {
  width: 140px;
}

.full-width {
  width: 100%;
}
</style>
