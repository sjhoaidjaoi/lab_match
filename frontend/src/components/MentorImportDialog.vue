<template>
  <el-dialog v-model="visible" title="批量导入教师" width="540px" destroy-on-close>
    <el-upload
      :auto-upload="false"
      :limit="1"
      accept=".xlsx"
      :on-change="handleFileChange"
      :on-remove="handleFileRemove"
    >
      <el-button plain>选择 Excel 文件</el-button>
      <template #tip>
        <div class="upload-tip">
          列顺序：工号、姓名、实训室编码、职称、研究方向、手机号、邮箱
        </div>
      </template>
    </el-upload>
    <el-alert
      v-if="result"
      class="import-result"
      :type="result.failCount > 0 ? 'warning' : 'success'"
      :closable="false"
      show-icon
      :title="`导入完成：成功 ${result.successCount} 条，失败 ${result.failCount} 条`"
    />
    <el-table
      v-if="result && result.failList.length > 0"
      class="fail-table"
      :data="result.failList"
      size="small"
      max-height="220"
    >
      <el-table-column prop="row" label="行号" width="70" />
      <el-table-column prop="userNo" label="工号" width="130" />
      <el-table-column prop="reason" label="失败原因" min-width="200" />
    </el-table>
    <template #footer>
      <el-button @click="visible = false">关闭</el-button>
      <el-button type="primary" :loading="importing" :disabled="!fileName" @click="handleImport">
        开始导入
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElMessage, type UploadFile } from 'element-plus'
import { importMentors } from '@/api/adminMentor'
import type { StudentImportResult } from '@/types/basic'

const props = defineProps<{ modelValue: boolean }>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  imported: []
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value)
})

const importing = ref(false)
const result = ref<StudentImportResult | null>(null)
const file = ref<File | null>(null)
const fileName = ref('')

function handleFileChange(uploadFile: UploadFile) {
  file.value = uploadFile.raw ?? null
  fileName.value = uploadFile.name
  result.value = null
}

function handleFileRemove() {
  file.value = null
  fileName.value = ''
  result.value = null
}

async function handleImport() {
  if (!file.value) {
    ElMessage.warning('请选择要导入的 Excel 文件')
    return
  }
  importing.value = true
  try {
    result.value = await importMentors(file.value)
    ElMessage.success(`导入完成，成功 ${result.value.successCount} 条`)
    emit('imported')
  } catch {
    // 错误提示已由请求层统一处理
  } finally {
    importing.value = false
  }
}
</script>

<style scoped>
.upload-tip {
  margin-top: 8px;
  font-size: 12px;
  color: #909399;
}

.import-result {
  margin-top: 16px;
}

.fail-table {
  margin-top: 12px;
}
</style>
